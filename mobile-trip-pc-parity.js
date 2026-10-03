import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://yyuqodhrterfrhoyhfut.supabase.co';
const SUPABASE_KEY='sb_publishable_jSWXE3-Ckzf8UNCWgbcM7w_rsgnXXdK';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
let rows=[];
let filter='active';

function tm(v){if(!v)return '--:--';const d=new Date(Number(v)||v);return Number.isNaN(d.getTime())?'--:--':d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
function dur(ms){ms=Math.max(0,num(ms));const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h?`${h}h ${String(m).padStart(2,'0')}min`:`${m} min`}
function current(j){return j?.payload?.current||null}
function lastStep(j){const a=j?.payload?.steps;return Array.isArray(a)&&a.length?a[a.length-1]:null}
function fleet(j){return j?.frota||j?.payload?.truck||'-'}
function model(j){return j?.payload?.model||j?.payload?.truckModel||j?.tipo_caminhao||''}
function user(j){return j?.payload?.user||j?.payload?.operator||'Não informado'}
function front(j){return j?.frente||j?.payload?.front||'-'}
function lastLocation(j){return String(j?.payload?.last||lastStep(j)?.destination||j?.destino||front(j)||'-')}
function progress(c){if(!c)return 0;const st=num(c.start),en=num(c.end);if(!st||!en||en<=st)return 0;return Math.max(0,Math.min(100,((Date.now()-st)/(en-st))*100))}
function remaining(c){if(!c?.end)return 0;return Math.max(0,num(c.end)-Date.now())}

function desktopStatusActive(j){
  const c=current(j)||{};
  if(c.awaitingArrival)return '⚠ Confirmar chegada';
  if(c.breakdownActive)return '🚨 Quebrado';
  if(c.paused)return '⏸ Pausado';
  return '▶ Em viagem';
}
function desktopStatusTransfer(j){
  const c=current(j)||{};
  if(c.awaitingArrival)return '⚠ Confirmar chegada';
  if(c.breakdownActive)return '🚨 Quebrado';
  return 'Em deslocamento';
}
function completedStatus(j){
  const loc=lastLocation(j).toLowerCase();
  const fuel=Array.isArray(j?.payload?.fuelingEvents)&&j.payload.fuelingEvents.some(x=>!x?.end);
  if(fuel)return '⛽ Abastecendo';
  if(/usina|vicentina|central|gadotti|adecoagro/.test(loc))return '🏭 No destino';
  return '⏱ Carregando';
}

function cardActive(j){
  const c=current(j)||{};
  const p=progress(c);
  const rem=c.awaitingArrival?'Previsão encerrada':c.paused?'Viagem pausada':c.breakdownActive?'Processo interrompido':`${dur(remaining(c))} restantes`;
  return `<div class="card trip active" data-trip-id="${esc(j.monitor_id||'')}">
    <div class="tripHead"><div class="tripId"><div class="tripIcon">🚛</div><div><strong>${esc(fleet(j))}</strong><small>${esc(model(j)||front(j))}</small></div></div><span class="status">${desktopStatusActive(j)}</span></div>
    <div class="pcMobileMeta"><span>👤 <b>${esc(user(j))}</b></span><span>📍 <b>${esc(c.destination||front(j))}</b></span><span>🏁 <b>Etapa 1</b></span></div>
    <div class="pcMobileMeta compact"><span>🕒 <b>${tm(c.start)}</b></span><span>📏 <b>${esc(c.distance??'-')} km</b></span><span>🚀 <b>${esc(c.speed??'-')} km/h</b></span></div>
    <div class="tripTimes"><span>${tm(c.start)}</span><span>→</span><span>${tm(c.end)}</span></div>
    <div class="miniBar"><i style="width:${p}%"></i></div>
    <div class="tripFoot"><span>${esc(rem)}</span><span class="tap">Ver detalhes ›</span></div>
  </div>`;
}

function cardCompleted(j){
  const st=lastStep(j)||{};
  const arrival=num(st.actualEnd)||Date.now();
  const elapsed=Math.max(0,Date.now()-arrival);
  return `<div class="card trip done" data-trip-id="${esc(j.monitor_id||'')}">
    <div class="tripHead"><div class="tripId"><div class="tripIcon">🚛</div><div><strong>${esc(fleet(j))}</strong><small>${esc(model(j)||front(j))}</small></div></div><span class="status">${completedStatus(j)}</span></div>
    <div class="pcMobileMeta"><span>👤 <b>${esc(user(j))}</b></span><span>📍 <b>${esc(lastLocation(j))}</b></span><span>🏁 <b>Etapa 2</b></span></div>
    <div class="pcMobileLoad">⏱ Tempo nesta etapa: <b>${dur(elapsed)}</b></div>
    <div class="tripFoot"><span>Concluído na frente / carregamento</span><span class="tap">Ver detalhes ›</span></div>
  </div>`;
}

function cardTransfer(j){
  const c=current(j)||{};
  const p=progress(c);
  const rem=c.awaitingArrival?'Previsão encerrada':`${dur(remaining(c))} restantes`;
  return `<div class="card trip move" data-trip-id="${esc(j.monitor_id||'')}">
    <div class="tripHead"><div class="tripId"><div class="tripIcon">🚛</div><div><strong>${esc(fleet(j))}</strong><small>${esc(model(j)||front(j))}</small></div></div><span class="status">${desktopStatusTransfer(j)}</span></div>
    <div class="route"><span>${esc(c.origin||front(j))}</span><i></i><span>${esc(c.destination||j.destino||'-')}</span></div>
    <div class="pcMobileMeta compact"><span>🏁 <b>Etapa 3</b></span><span>📏 <b>${esc(c.distance??'-')} km</b></span><span>🚀 <b>${esc(c.speed??'-')} km/h</b></span></div>
    <div class="tripTimes"><span>${tm(c.start)}</span><span>→</span><span>${tm(c.end)}</span></div>
    <div class="miniBar"><i style="width:${p}%"></i></div>
    <div class="tripFoot"><span>${esc(rem)}</span><span class="tap">Ver detalhes ›</span></div>
  </div>`;
}

function render(){
  const list=$('tripList'),count=$('tripCount'),filters=$('tripFilters');
  if(!list||!count||!filters)return;
  const group=filter==='active'?'active':filter==='completed'?'completed':'transfer';
  const visible=rows.filter(j=>j.grupo===group);
  count.textContent=String(visible.length);
  [...filters.querySelectorAll('[data-filter]')].forEach(b=>{
    const mapped=b.dataset.filter==='ongoing'?'active':b.dataset.filter==='done'?'completed':'transfer';
    b.classList.toggle('active',mapped===filter);
  });
  list.innerHTML=visible.length?visible.map(j=>group==='active'?cardActive(j):group==='completed'?cardCompleted(j):cardTransfer(j)).join(''):'<div class="empty">Nenhum caminhão neste grupo.</div>';
}

async function load(){
  try{
    const {data,error}=await supabase.from('journeys').select('monitor_id,frota,frente,status,etapa,origem,destino,saida_em,chegada_em,previsao_chegada,grupo,payload,atualizado_em').order('atualizado_em',{ascending:false});
    if(error)throw error;
    rows=data||[];
    render();
  }catch(e){console.warn('[CEV mobile viagens igual PC]',e)}
}

function install(){
  const filters=$('tripFilters');
  if(!filters)return setTimeout(install,200);
  filters.addEventListener('click',e=>{
    const b=e.target.closest('[data-filter]');
    if(!b)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    filter=b.dataset.filter==='ongoing'?'active':b.dataset.filter==='done'?'completed':'transfer';
    render();
  },true);
  const st=document.createElement('style');
  st.textContent=`
    #tripList .pcMobileMeta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:9px}
    #tripList .pcMobileMeta span{min-width:0;padding:7px 6px;border-radius:9px;background:#f6f9fa;color:#617784;font-size:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #tripList .pcMobileMeta b{color:#17384a;font-size:8px}
    #tripList .pcMobileMeta.compact{margin-top:6px}
    #tripList .pcMobileLoad{margin-top:8px;padding:8px 9px;border-radius:10px;background:#f1f7fa;color:#597180;font-size:8px}
    #tripList .trip.done{border-left-color:#18a66f}
    #tripList .trip.move{border-left-color:#ef9a29}
  `;
  document.head.appendChild(st);
  load();
  setInterval(load,2000);
}
install();
