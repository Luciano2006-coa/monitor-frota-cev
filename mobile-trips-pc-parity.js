import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://yyuqodhrterfrhoyhfut.supabase.co';
const SUPABASE_KEY='sb_publishable_jSWXE3-Ckzf8UNCWgbcM7w_rsgnXXdK';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d};

let rows=[];
let filter='active';
let painting=false;
let fetchBusy=false;

function stepCurrent(j){return j?.payload?.current||null}
function stepLast(j){const a=j?.payload?.steps;return Array.isArray(a)&&a.length?a[a.length-1]:null}
function route(j){const c=stepCurrent(j),l=stepLast(j);return [String(c?.origin||l?.origin||j.origem||j.frente||'--'),String(c?.destination||l?.destination||j.destino||'--')]}
function startMs(j){const c=stepCurrent(j);return num(c?.start||j?.payload?.start||(j?.saida_em?new Date(j.saida_em).getTime():0))}
function etaMs(j){const c=stepCurrent(j);return num(c?.end||(j?.previsao_chegada?new Date(j.previsao_chegada).getTime():0))}
function fmtClock(v){if(!v)return '--:--';const d=new Date(v);return Number.isNaN(d.getTime())?'--:--':d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
function fmtTimer(ms){ms=Math.max(0,num(ms));const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),r=s%60;return [h,m,r].map(x=>String(x).padStart(2,'0')).join(':')}
function elapsed(j){const c=stepCurrent(j),l=stepLast(j);if(c?.start)return Date.now()-num(c.start);if(l?.start&&l?.actualEnd)return num(l.actualEnd)-num(l.start);return 0}
function progress(j){if(j.grupo==='completed')return 100;const c=stepCurrent(j);const st=num(c?.start),en=num(c?.end);if(!st||!en||en<=st)return j.grupo==='transfer'?8:3;return Math.max(3,Math.min(100,(Date.now()-st)/(en-st)*100))}
function info(group){
  if(group==='active')return {label:'EM VIAGEM',cls:'active'};
  if(group==='completed')return {label:'CONCLUÍDO',cls:'done'};
  return {label:'EM DESLOCAMENTO',cls:'move'};
}
function selected(){return rows.filter(j=>j.grupo===filter)}

function card(j){
  const st=info(j.grupo),[origin,dest]=route(j),p=progress(j),start=startMs(j),eta=etaMs(j),last=stepLast(j);
  const end=j.grupo==='completed'?(j.chegada_em?new Date(j.chegada_em).getTime():num(last?.actualEnd)):eta;
  return `<div class="card trip ${st.cls}" data-trip-id="${esc(j.monitor_id||'')}">
    <div class="tripHead"><div class="tripId"><div class="tripIcon">🚛</div><div><strong>${esc(j.frota||j.payload?.truck||'-')}</strong><small>${esc(j.frente||'Monitor CEV')}</small></div></div><span class="status">${st.label}</span></div>
    <div class="route"><span>${esc(origin)}</span><i></i><span>${esc(dest)}</span></div>
    <div class="tripTimes"><span>Saída ${fmtClock(start)}</span><span>${j.grupo==='completed'?'Fim':'Prev.'} ${fmtClock(end)}</span></div>
    <div class="miniBar"><i style="width:${p}%"></i></div>
    <div class="tripFoot"><span class="timer">${fmtTimer(elapsed(j))}</span><span class="tap">Ver detalhes ›</span></div>
  </div>`;
}

function render(){
  const list=$('tripList'),count=$('tripCount');
  if(!list||!count)return;
  const current=selected();
  const html=current.length?current.slice(0,100).map(card).join(''):'<div class="empty">Nenhum caminhão neste grupo.</div>';
  if(list.innerHTML!==html){
    painting=true;
    list.innerHTML=html;
    count.textContent=String(current.length);
    queueMicrotask(()=>painting=false);
  }else count.textContent=String(current.length);
}

function syncButtons(){
  const wrap=$('tripFilters');if(!wrap)return;
  const btns=[...wrap.querySelectorAll('button')];
  const defs=[['active','Em viagem'],['completed','Concluídos'],['transfer','Em deslocamento']];
  btns.slice(0,3).forEach((b,i)=>{b.dataset.pcGroup=defs[i][0];b.textContent=defs[i][1];b.classList.toggle('active',defs[i][0]===filter)});
}

async function refresh(){
  if(fetchBusy)return;fetchBusy=true;
  try{
    const {data,error}=await supabase.from('journeys').select('monitor_id,frota,frente,origem,destino,saida_em,chegada_em,previsao_chegada,grupo,payload,atualizado_em').in('grupo',['active','completed','transfer']).order('atualizado_em',{ascending:false});
    if(error)throw error;
    rows=data||[];
    syncButtons();
    render();
  }catch(e){console.warn('[CEV mobile trips parity]',e)}finally{fetchBusy=false}
}

function boot(){
  const wrap=$('tripFilters'),list=$('tripList');
  if(!wrap||!list)return setTimeout(boot,250);
  syncButtons();

  /* Captura antes do listener antigo para impedir que a lógica simplificada misture os grupos. */
  wrap.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    const group=b.dataset.pcGroup;
    if(!group)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    filter=group;
    syncButtons();
    render();
  },true);

  const observer=new MutationObserver(()=>{if(!painting)queueMicrotask(()=>{syncButtons();render()})});
  observer.observe(list,{childList:true,subtree:true});

  refresh();
  setInterval(refresh,2000);
  setInterval(()=>{if(!document.hidden)render()},1000);
}

boot();
