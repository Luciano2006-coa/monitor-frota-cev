import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://yyuqodhrterfrhoyhfut.supabase.co';
const SUPABASE_KEY='sb_publishable_jSWXE3-Ckzf8UNCWgbcM7w_rsgnXXdK';
const REFRESH_MS=2000;
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
let rows=[];
let filter='active';
let lastStructureKey='';

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

function desktopStatusActive(j){const c=current(j)||{};if(c.awaitingArrival)return '⚠ Confirmar chegada';if(c.breakdownActive)return '🚨 Quebrado';if(c.paused)return '⏸ Pausado';return '▶ Em viagem'}
function desktopStatusTransfer(j){const c=current(j)||{};if(c.awaitingArrival)return '⚠ Confirmar chegada';if(c.breakdownActive)return '🚨 Quebrado';return 'Em deslocamento'}
function completedStatus(j){const loc=lastLocation(j).toLowerCase();const fuel=Array.isArray(j?.payload?.fuelingEvents)&&j.payload.fuelingEvents.some(x=>!x?.end);if(fuel)return '⛽ Abastecendo';if(/usina|vicentina|central|gadotti|adecoagro/.test(loc))return '🏭 No destino';return '⏱ Carregando'}

function structureSignature(j){
  const c=current(j)||{},st=lastStep(j)||{};
  return [
    j.monitor_id,j.grupo,fleet(j),model(j),user(j),front(j),lastLocation(j),
    c.origin,c.destination,c.start,c.end,c.distance,c.speed,
    !!c.awaitingArrival,!!c.breakdownActive,!!c.paused,
    st.origin,st.destination,st.start,st.actualEnd,
    completedStatus(j),desktopStatusActive(j),desktopStatusTransfer(j)
  ].join('|');
}

function cardActive(j){const c=current(j)||{};return `<div class="card trip active" data-trip-pc-id="${esc(j.monitor_id||'')}" data-group="active"><div class="tripHead"><div class="tripId"><div class="tripIcon">🚛</div><div><strong>${esc(fleet(j))}</strong><small>${esc(model(j)||front(j))}</small></div></div><span class="status">${desktopStatusActive(j)}</span></div><div class="pcMobileMeta"><span>👤 <b>${esc(user(j))}</b></span><span>📍 <b>${esc(c.destination||front(j))}</b></span><span>🏁 <b>Etapa 1</b></span></div><div class="pcMobileMeta compact"><span>🕒 <b>${tm(c.start)}</b></span><span>📏 <b>${esc(c.distance??'-')} km</b></span><span>🚀 <b>${esc(c.speed??'-')} km/h</b></span></div><div class="tripTimes"><span>${tm(c.start)}</span><span>→</span><span>${tm(c.end)}</span></div><div class="miniBar"><i class="pcDynBar"></i></div><div class="tripFoot"><span class="pcDynText"></span><span class="tap">Ver detalhes ›</span></div></div>`}
function cardCompleted(j){const st=lastStep(j)||{};return `<div class="card trip done" data-trip-pc-id="${esc(j.monitor_id||'')}" data-group="completed"><div class="tripHead"><div class="tripId"><div class="tripIcon">🚛</div><div><strong>${esc(fleet(j))}</strong><small>${esc(model(j)||front(j))}</small></div></div><span class="status">${completedStatus(j)}</span></div><div class="pcMobileMeta"><span>👤 <b>${esc(user(j))}</b></span><span>📍 <b>${esc(lastLocation(j))}</b></span><span>🏁 <b>Etapa 2</b></span></div><div class="pcMobileLoad">⏱ Tempo nesta etapa: <b class="pcDynElapsed" data-arrival="${num(st.actualEnd)||Date.now()}">0 min</b></div><div class="tripFoot"><span>Na roça / carregamento</span><span class="tap">Ver detalhes ›</span></div></div>`}
function cardTransfer(j){const c=current(j)||{};return `<div class="card trip move" data-trip-pc-id="${esc(j.monitor_id||'')}" data-group="transfer"><div class="tripHead"><div class="tripId"><div class="tripIcon">🚛</div><div><strong>${esc(fleet(j))}</strong><small>${esc(model(j)||front(j))}</small></div></div><span class="status">${desktopStatusTransfer(j)}</span></div><div class="route"><span>${esc(c.origin||front(j))}</span><i></i><span>${esc(c.destination||j.destino||'-')}</span></div><div class="pcMobileMeta compact"><span>🏁 <b>Etapa 3</b></span><span>📏 <b>${esc(c.distance??'-')} km</b></span><span>🚀 <b>${esc(c.speed??'-')} km/h</b></span></div><div class="tripTimes"><span>${tm(c.start)}</span><span>→</span><span>${tm(c.end)}</span></div><div class="miniBar"><i class="pcDynBar"></i></div><div class="tripFoot"><span class="pcDynText"></span><span class="tap">Ver detalhes ›</span></div></div>`}

function visibleRows(){const group=filter==='active'?'active':filter==='completed'?'completed':'transfer';return rows.filter(j=>j.grupo===group)}
function renderStructure(force=false){
  const list=$('tripListPc'),count=$('tripCountPc'),filters=$('tripFiltersPc');if(!list||!count||!filters)return;
  const visible=visibleRows();
  const key=filter+'::'+visible.map(structureSignature).join(';;');
  count.textContent=String(visible.length);
  [...filters.querySelectorAll('[data-filter]')].forEach(b=>{const mapped=b.dataset.filter==='ongoing'?'active':b.dataset.filter==='done'?'completed':'transfer';b.classList.toggle('active',mapped===filter)});
  if(!force&&key===lastStructureKey){updateDynamic();return}
  lastStructureKey=key;
  const group=filter==='active'?'active':filter==='completed'?'completed':'transfer';
  list.innerHTML=visible.length?visible.map(j=>group==='active'?cardActive(j):group==='completed'?cardCompleted(j):cardTransfer(j)).join(''):'<div class="empty">Nenhum caminhão neste grupo.</div>';
  updateDynamic();
}

function updateDynamic(){
  const list=$('tripListPc');if(!list)return;
  list.querySelectorAll('[data-trip-pc-id]').forEach(card=>{
    const j=rows.find(x=>String(x.monitor_id)===String(card.dataset.tripPcId));if(!j)return;
    const c=current(j)||{};
    const bar=card.querySelector('.pcDynBar');
    const text=card.querySelector('.pcDynText');
    const elapsed=card.querySelector('.pcDynElapsed');
    if(bar)bar.style.width=`${progress(c)}%`;
    if(text){
      if(j.grupo==='active')text.textContent=c.awaitingArrival?'Previsão encerrada':c.paused?'Viagem pausada':c.breakdownActive?'Processo interrompido':`${dur(remaining(c))} restantes`;
      else if(j.grupo==='transfer')text.textContent=c.awaitingArrival?'Previsão encerrada':`${dur(remaining(c))} restantes`;
    }
    if(elapsed){const arrival=num(elapsed.dataset.arrival)||Date.now();elapsed.textContent=dur(Date.now()-arrival)}
  });
}

async function load(){try{const {data,error}=await supabase.from('journeys').select('monitor_id,frota,frente,status,etapa,origem,destino,saida_em,chegada_em,previsao_chegada,grupo,payload,atualizado_em').order('atualizado_em',{ascending:false});if(error)throw error;rows=data||[];renderStructure(false)}catch(e){console.warn('[CEV mobile viagens igual PC]',e)}}

function openDetail(j){const sheet=$('detailSheet'),title=$('sheetTitle'),sub=$('sheetSub'),body=$('sheetBody');if(!sheet||!title||!sub||!body)return;const c=current(j)||{},st=lastStep(j)||{};const label=j.grupo==='active'?'Em viagem':j.grupo==='completed'?'Concluídos':'Em deslocamento';title.textContent=`🚛 Frota ${fleet(j)}`;sub.textContent=`${label} • somente visualização`;body.innerHTML=`<div class="sheetGrid"><div><small>Frente</small><b>${esc(front(j))}</b></div><div><small>Status</small><b>${esc(j.grupo==='active'?desktopStatusActive(j):j.grupo==='completed'?completedStatus(j):desktopStatusTransfer(j))}</b></div><div><small>Origem</small><b>${esc(c.origin||st.origin||j.origem||'-')}</b></div><div><small>Destino</small><b>${esc(c.destination||st.destination||j.destino||'-')}</b></div><div><small>Início</small><b>${tm(c.start||st.start)}</b></div><div><small>Previsão</small><b>${tm(c.end||j.previsao_chegada)}</b></div></div>`;sheet.classList.add('open');sheet.setAttribute('aria-hidden','false')}

function install(){
  const filters=$('tripFiltersPc'),list=$('tripListPc');if(!filters||!list)return setTimeout(install,100);
  filters.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter==='ongoing'?'active':b.dataset.filter==='done'?'completed':'transfer';lastStructureKey='';renderStructure(true)});
  list.addEventListener('click',e=>{const card=e.target.closest('[data-trip-pc-id]');if(!card)return;const j=rows.find(x=>String(x.monitor_id)===String(card.dataset.tripPcId));if(j)openDetail(j)});
  const st=document.createElement('style');st.id='cevTripPcParityStyle';st.textContent=`#tripLegacyArea{display:none!important}#tripListPc .pcMobileMeta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:9px}#tripListPc .pcMobileMeta span{min-width:0;padding:7px 6px;border-radius:9px;background:#f6f9fa;color:#617784;font-size:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#tripListPc .pcMobileMeta b{color:#17384a;font-size:8px}#tripListPc .pcMobileMeta.compact{margin-top:6px}#tripListPc .pcMobileLoad{margin-top:8px;padding:8px 9px;border-radius:10px;background:#f1f7fa;color:#597180;font-size:8px}#tripListPc .trip.done{border-left-color:#18a66f}#tripListPc .trip.move{border-left-color:#ef9a29}`;if(!document.getElementById(st.id))document.head.appendChild(st);
  load();
  setInterval(load,REFRESH_MS);
  setInterval(updateDynamic,1000);
}
install();
