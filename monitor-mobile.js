import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://yyuqodhrterfrhoyhfut.supabase.co';
const SUPABASE_KEY='sb_publishable_jSWXE3-Ckzf8UNCWgbcM7w_rsgnXXdK';
const COA_EMAIL='coa@cev.com.br';
const REFRESH_MS=2000;
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);

let currentUser=null,profile=null,isCoa=false,busy=false,lastOk=0;
let journeys=[],mirror=null,tripFilter='all',equipFilter='all';

const pt=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0});
const pt1=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const clone=v=>JSON.parse(JSON.stringify(v));
function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d}
function todayStart(){const d=new Date();d.setHours(0,0,0,0);return d.getTime()}
function formatTons(v){return `${pt.format(Math.max(0,num(v)))} t`}
function fmtClock(v){if(!v)return '--:--';const d=new Date(v);return Number.isNaN(d.getTime())?'--:--':d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
function fmtDuration(ms){ms=Math.max(0,num(ms));const m=Math.floor(ms/60000);const h=Math.floor(m/60),r=m%60;if(h)return `${h}h ${String(r).padStart(2,'0')}min`;return `${r}min`}
function fmtTimer(ms){ms=Math.max(0,num(ms));const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),r=s%60;return [h,m,r].map(x=>String(x).padStart(2,'0')).join(':')}
function statusInfo(group){return group==='active'?['Em trajeto','blue','🚛']:group==='completed'?['Carregando','orange','🌾']:group==='transfer'?['Em deslocamento','green','🚚']:['Finalizado','gray','✓']}
function equipmentStatus(s){return s==='operation'?['Rodando','green']:s==='maintenance'?['Manutenção','red']:s==='scheduled'?['Programado','gray']:['Parado','gray']}
function currentStep(j){return j?.payload?.current||null}
function lastStep(j){const a=j?.payload?.steps;return Array.isArray(a)&&a.length?a[a.length-1]:null}
function journeyStart(j){return num(currentStep(j)?.start||j.saida_em&&new Date(j.saida_em).getTime()||j.payload?.start)}
function journeyProgress(j){const c=currentStep(j);if(!c)return 100;const st=num(c.start),en=num(c.end);if(!st||!en||en<=st)return 0;return Math.max(3,Math.min(100,(Date.now()-st)/(en-st)*100))}
function journeyElapsed(j){const c=currentStep(j);if(c?.start)return Date.now()-num(c.start);const l=lastStep(j);if(l?.start&&l?.actualEnd)return num(l.actualEnd)-num(l.start);return 0}
function displayRoute(j){const c=currentStep(j),l=lastStep(j);const o=c?.origin||l?.origin||j.origem||'';const d=c?.destination||l?.destination||j.destino||'';return o&&d?`${o} → ${d}`:(j.frente||d||o||'Sem rota')}
function truckMultiplier(frota){const t=mirror?.state?.logistics?.truckTypes?.[String(frota)];return t==='duque'?2:t==='tremiado'?3:1}
function stepTons(step,row){const front=String(step?.origin||row?.frente||'');const snap=num(step?.tonsPerTripSnapshot,NaN);const mult=num(step?.truckMultiplierSnapshot,NaN);if(Number.isFinite(snap)&&Number.isFinite(mult))return snap*mult;const base=num(mirror?.state?.logistics?.fronts?.[front]?.tonsPerTrip,0);return base*truckMultiplier(row?.frota||row?.payload?.truck)}
function deliveredMap(){const start=todayStart(),out={};for(const row of journeys){for(const st of (row?.payload?.steps||[])){const end=num(st.actualEnd);const origin=String(st.origin||'');const dest=String(st.destination||'');if(end>=start&&origin&&['Usina','Adecoagro','Gadotti'].includes(dest)){out[origin]=(out[origin]||0)+stepTons(st,row)}}}return out}
function deliveryTimes(){const start=todayStart(),a=[];for(const row of journeys)for(const st of(row?.payload?.steps||[])){const end=num(st.actualEnd);if(end>=start&&String(st.origin||'').startsWith('Frente')||end>=start&&['Gama','Minatel'].includes(String(st.origin||''))){if(['Usina','Adecoagro','Gadotti'].includes(String(st.destination||'')))a.push(end)}}return a.filter(Boolean)}
function averageSamples(){const trip=[],load=[];for(const r of journeys){for(const st of(r?.payload?.steps||[])){const d=num(st.actualEnd)-num(st.start);if(d>=5*60000&&d<=18*3600000)trip.push(d)}for(const e of(r?.payload?.loadingEvents||[])){const d=num(e.duration);if(d>=2*60000&&d<=12*3600000)load.push(d)}}return {trip,load}}
function avg(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}

async function fetchAll(){
  const [jr,st]=await Promise.all([
    supabase.from('journeys').select('monitor_id,frota,frente,status,etapa,origem,destino,saida_em,chegada_em,previsao_chegada,grupo,payload,atualizado_em').order('atualizado_em',{ascending:false}),
    supabase.from('settings').select('valor,atualizado_em').eq('chave','coa_mirror_state').maybeSingle()
  ]);
  if(jr.error)throw jr.error;if(st.error)throw st.error;
  journeys=jr.data||[];mirror=st.data?.valor||null;lastOk=Date.now();
}

function renderOverview(){
  const groups={active:0,completed:0,transfer:0};
  const running=new Set();
  for(const j of journeys){if(groups[j.grupo]!==undefined)groups[j.grupo]++;if(j.grupo!=='finalized')running.add(String(j.frota||j.payload?.truck||''))}
  $('kpiTrajeto').textContent=groups.active;$('kpiCarregando').textContent=groups.completed;$('kpiTransfer').textContent=groups.transfer;$('kpiRodando').textContent=[...running].filter(Boolean).length;
  const fronts=mirror?.state?.logistics?.fronts||{};
  const meta=Object.values(fronts).filter(x=>x?.active!==false).reduce((s,x)=>s+num(x?.target),0);
  const dm=deliveredMap(),real=Object.values(dm).reduce((a,b)=>a+b,0);
  const pct=meta?real/meta*100:0;
  $('metaDia').textContent=formatTons(meta);$('realizadoDia').textContent=formatTons(real);$('metaPct').textContent=`${pt1.format(pct)}%`;$('metaProgress').style.width=`${Math.min(100,pct)}%`;
  const ts=deliveryTimes();const first=ts.length?Math.min(...ts):0;const hours=first?Math.max(.5,(Date.now()-first)/3600000):0;const proj=hours?real/hours*24:0;const pp=meta?proj/meta*100:0;
  $('proj24').textContent=formatTons(proj);$('projPct').textContent=`${pt1.format(pp)}%`;$('projProgress').style.width=`${Math.min(100,pp)}%`;
  const sm=averageSamples();$('avgTrip').textContent=sm.trip.length?fmtDuration(avg(sm.trip)):'--';$('avgLoad').textContent=sm.load.length?fmtDuration(avg(sm.load)):'--';
}

function renderTrips(){
  const rows=journeys.filter(j=>j.grupo!=='finalized'&&(tripFilter==='all'||j.grupo===tripFilter));
  $('tripCount').textContent=String(rows.length);
  if(!rows.length){$('tripList').innerHTML='<div class="empty">Nenhuma viagem neste filtro.</div>';return}
  $('tripList').innerHTML=rows.map(j=>{const [label,color,ico]=statusInfo(j.grupo);const prog=journeyProgress(j);const c=currentStep(j);const eta=c?.end||j.previsao_chegada;return `<div class="trip"><div class="tripTop"><div class="truckIco">${ico}</div><div class="tripMain"><b>${esc(j.frota||j.payload?.truck||'-')}</b><div class="route">${esc(displayRoute(j))}</div></div><span class="badge ${color}">${label}</span></div><div class="progress ${color==='orange'?'orange':color==='blue'?'blue':''}"><i style="width:${prog}%"></i></div><div class="tripInfo"><div>Tempo atual<b class="time" data-start="${journeyStart(j)}">${fmtTimer(journeyElapsed(j))}</b></div><div>${j.grupo==='completed'?'Chegada':'Previsão'}<b>${j.grupo==='completed'?fmtClock(j.chegada_em):fmtClock(eta)}</b></div></div></div>`}).join('');
}

function renderFronts(){
  const cfg=mirror?.state?.logistics?.fronts||{},dm=deliveredMap(),eq=mirror?.state?.effective_equipment?.data||[];
  const names=Object.keys(cfg);$('frontCount').textContent=String(names.length);
  if(!names.length){$('frontList').innerHTML='<div class="empty">Sem frentes configuradas.</div>';return}
  $('frontList').innerHTML=names.map(name=>{const c=cfg[name]||{},meta=num(c.target),real=num(dm[name]),pct=meta?real/meta*100:0;const trucks=new Set(journeys.filter(j=>j.grupo!=='finalized'&&j.frente===name).map(j=>j.frota));const equip=eq.filter(e=>e.front===name),run=equip.filter(e=>e.status==='operation').length;return `<div class="card"><div class="frontCard"><div class="iconbox">🌾</div><div><div class="cardTitle">${esc(name)}</div><div class="sub" style="color:${c.active===false?'#ff962c':'#28d983'}">● ${c.active===false?'Inativa':'Em operação'}</div></div><b>›</b></div><div class="frontStats"><div><b>${trucks.size}</b><span>caminhões</span></div><div><b>${run}/${equip.length}</b><span>equipamentos</span></div><div><b>${pt1.format(pct)}%</b><span>da meta</span></div></div><div class="progress blue"><i style="width:${Math.min(100,pct)}%"></i></div><div class="rowLabel"><span>${formatTons(real)} realizado</span><b>${formatTons(meta)}</b></div></div>`}).join('');
}

function renderEquipment(){
  let a=clone(mirror?.state?.effective_equipment?.data||[]);
  if(equipFilter==='maintenance')a=a.filter(e=>e.status==='maintenance');else if(equipFilter!=='all')a=a.filter(e=>String(e.type||'').toUpperCase()===equipFilter);
  a.sort((x,y)=>String(x.front).localeCompare(String(y.front),'pt-BR')||String(x.fleet).localeCompare(String(y.fleet)));
  $('equipCount').textContent=String(a.length);
  if(!a.length){$('equipList').innerHTML='<div class="empty">Nenhum equipamento neste filtro.</div>';return}
  $('equipList').innerHTML=a.map(e=>{const [st,color]=equipmentStatus(e.status);return `<div class="card"><div class="equip"><div class="iconbox">🚜</div><div class="eqMain"><b>${esc(e.fleet||'-')}</b><div class="eqSub">${esc(e.front||'Sem frente')} • ${esc(e.model||e.type||'Equipamento')}</div></div><span class="badge ${color}">${st}</span></div><div class="eqStats"><div>Tipo<b>${esc(e.type||'-')}</b></div><div>Status<b>${st}</b></div></div></div>`}).join('');
}

function renderMirror(){
  if(isCoa){$('mirror').classList.add('hidden');return}
  $('mirror').classList.remove('hidden');const age=lastOk?Math.floor((Date.now()-lastOk)/1000):999;const ok=age<10;$('mirrorDot').className='dot'+(ok?'':' warn');$('mirrorText').textContent=ok?`Espelho online • contato há ${age}s • ${String(currentUser?.email||'').split('@')[0]} • visualização`:`⚠ Sem atualização há ${age}s • ${String(currentUser?.email||'').split('@')[0]}`;
}
function renderAll(){renderOverview();renderTrips();renderFronts();renderEquipment();renderMirror()}
function tickTimers(){document.querySelectorAll('.time[data-start]').forEach(el=>{const st=num(el.dataset.start);if(st)el.textContent=fmtTimer(Date.now()-st)});$('clock').textContent=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});renderMirror()}

async function refresh(){if(busy||document.hidden||!currentUser)return;busy=true;try{await fetchAll();renderAll()}catch(e){console.error('[CEV mobile refresh]',e)}finally{busy=false}}
async function loadAuthorized(user){const {data:p,error}=await supabase.from('profiles').select('nome,role,ativo,email').eq('id',user.id).single();if(error)throw error;if(!p?.ativo)throw new Error('Usuário desativado.');currentUser=user;profile=p;isCoa=String(user.email||'').toLowerCase()===COA_EMAIL;$('brandUser').textContent=isCoa?'COA':String(p.nome||user.email?.split('@')[0]||'Visualização');$('auth').classList.add('hidden');$('app').hidden=false;await refresh()}

$('login').addEventListener('click',async()=>{const email=$('email').value.trim(),password=$('password').value;if(!email||!password){$('authStatus').textContent='Informe e-mail e senha.';$('authStatus').className='authStatus err';return}$('login').disabled=true;$('authStatus').textContent='Entrando...';try{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;await loadAuthorized(data.user)}catch(e){$('authStatus').textContent='❌ '+(e?.message||String(e));$('authStatus').className='authStatus err'}finally{$('login').disabled=false}});
$('password').addEventListener('keydown',e=>{if(e.key==='Enter')$('login').click()});
$('logout').addEventListener('click',async()=>{await supabase.auth.signOut();location.reload()});

document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x===btn));document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===btn.dataset.view));window.scrollTo({top:0,behavior:'smooth'})}));
$('tripFilters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;tripFilter=b.dataset.filter;[...$('tripFilters').children].forEach(x=>x.classList.toggle('active',x===b));renderTrips()});
$('equipFilters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;equipFilter=b.dataset.filter;[...$('equipFilters').children].forEach(x=>x.classList.toggle('active',x===b));renderEquipment()});

setInterval(refresh,REFRESH_MS);setInterval(tickTimers,1000);tickTimers();
(async()=>{const {data:{session}}=await supabase.auth.getSession();if(session?.user){try{await loadAuthorized(session.user)}catch(e){$('authStatus').textContent='❌ '+(e?.message||String(e));$('authStatus').className='authStatus err'}}})();
