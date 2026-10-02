import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://yyuqodhrterfrhoyhfut.supabase.co';
const SUPABASE_KEY='sb_publishable_jSWXE3-Ckzf8UNCWgbcM7w_rsgnXXdK';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);
const base=document.getElementById('base');
const KEYS=['config','fleet_fronts','operational_extras','effective_equipment'];
const POLL_MS=5000;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clone=v=>JSON.parse(JSON.stringify(v));
const hash=v=>JSON.stringify(v);
let poll=null,attached=null,busy=false,pending=new Map();

function ctx(){
  try{
    const d1=base.contentDocument;
    const monitor=d1?.getElementById('monitor');
    const w=monitor?.contentWindow,d=monitor?.contentDocument;
    if(!w||!d?.body)return null;
    return {w,d};
  }catch(e){return null}
}

function inject(c){
  if(attached===c.w&&c.w.__CEV_EXTRA_V2__)return;
  const s=c.d.createElement('script');
  s.textContent=`(()=>{
    if(window.__CEV_EXTRA_V2__)return;window.__CEV_EXTRA_V2__=true;
    const clone=v=>JSON.parse(JSON.stringify(v));
    const parse=(k,f)=>{try{const x=localStorage.getItem(k);return x?JSON.parse(x):f}catch(e){return f}};
    let applying=false;
    const exportAll=()=>({
      config:clone(typeof config!=='undefined'?config:{}),
      fleet_fronts:{fleet:clone(typeof FLEET!=='undefined'?FLEET:{}),fronts:clone(typeof FRONTS!=='undefined'?FRONTS:[])},
      operational_extras:{maintenance:clone(data?.maintenance||[]),maintenanceHistory:clone(data?.maintenanceHistory||[]),fueling:clone(data?.fueling||[]),fuelingHistory:clone(data?.fuelingHistory||[])},
      effective_equipment:{data:parse('cev_effective_equipment_status_v3',[]),mill:localStorage.getItem('cev_effective_mill_v3')||'running',frontModes:parse('cev_effective_front_modes_v3',{})}
    });
    const notify=k=>{if(applying)return;try{window.top.CEV_EXTRA_V2_DB?.push(k,exportAll()[k])}catch(e){}};
    const wrap=(n,k)=>{try{const fn=window[n]||eval(n);if(typeof fn!=='function'||fn.__cevV2)return;const w=function(...a){const r=fn.apply(this,a);setTimeout(()=>notify(k),0);return r};w.__cevV2=true;window[n]=w;try{eval(n+'=w')}catch(e){}}catch(e){}};
    wrap('saveCfg','config');wrap('saveFleetFronts','fleet_fronts');
    ['effSfChangeStatus','effSfToggleMill','effSfToggleFront','effSfSaveMachine','effSfDeleteMachine'].forEach(n=>wrap(n,'effective_equipment'));
    try{const raw=save;let last=JSON.stringify(exportAll().operational_extras);save=function(...a){const r=raw.apply(this,a);const now=JSON.stringify(exportAll().operational_extras);if(now!==last){last=now;setTimeout(()=>notify('operational_extras'),0)}return r};window.save=save}catch(e){}
    window.__CEV_EXTRA_V2_EXPORT__=exportAll;
    window.__CEV_EXTRA_V2_APPLY__=(map)=>{
      const a=document.activeElement;if(a&&['INPUT','SELECT','TEXTAREA'].includes(a.tagName))return false;
      applying=true;
      try{
        if(map.config&&typeof config!=='undefined'){config=clone(map.config);localStorage.setItem('cev_v4_cfg',JSON.stringify(config));localStorage.setItem('cev_v4_cfg_backup',JSON.stringify(config));try{buildCfg?.();if(typeof loadRouteDefaults==='function'&&typeof front!=='undefined')loadRouteDefaults(front.value)}catch(e){}}
        if(map.fleet_fronts){if(typeof FLEET!=='undefined')FLEET=clone(map.fleet_fronts.fleet||{});if(typeof FRONTS!=='undefined')FRONTS=clone(map.fleet_fronts.fronts||[]);localStorage.setItem('mf_custom_fleet',JSON.stringify(FLEET));localStorage.setItem('mf_custom_fleet_backup',JSON.stringify(FLEET));localStorage.setItem('mf_custom_fronts',JSON.stringify(FRONTS));localStorage.setItem('mf_custom_fronts_backup',JSON.stringify(FRONTS));try{renderAdminFleetFrontLists?.();refreshTruckOptions?.();buildCfg?.()}catch(e){}}
        if(map.operational_extras&&typeof data!=='undefined'){data.maintenance=clone(map.operational_extras.maintenance||[]);data.maintenanceHistory=clone(map.operational_extras.maintenanceHistory||[]);data.fueling=clone(map.operational_extras.fueling||[]);data.fuelingHistory=clone(map.operational_extras.fuelingHistory||[]);try{const s=JSON.stringify(data);localStorage.setItem('cev_v84_release_limpo_data',s);localStorage.setItem('cev_v84_release_limpo_data_backup',s);renderMaintenance?.();renderFueling?.()}catch(e){}}
        if(map.effective_equipment){const p=clone(map.effective_equipment);const d=JSON.stringify(p.data||[]),fm=JSON.stringify(p.frontModes||{}),mill=String(p.mill||'running');localStorage.setItem('cev_effective_equipment_status_v3',d);localStorage.setItem('cev_effective_equipment_status_v3_backup',d);localStorage.setItem('cev_effective_front_modes_v3',fm);localStorage.setItem('cev_effective_mill_v3',mill);try{if(typeof effSfApplyExternal==='function')effSfApplyExternal(p)}catch(e){}}
        try{render?.();renderOverview?.()}catch(e){}
      }finally{applying=false}
      return true;
    };
  })();`;
  c.d.body.appendChild(s);s.remove();attached=c.w;
}

async function session(){return (await supabase.auth.getSession()).data.session}
async function fetchAll(){const {data,error}=await supabase.from('settings').select('chave,valor').in('chave',KEYS);if(error)throw error;const m={};(data||[]).forEach(r=>m[r.chave]=r.valor);return m}
async function pushNow(k,v){if(!KEYS.includes(k))return;const s=await session();if(!s?.user)return;const copy=clone(v);pending.set(k,{hash:hash(copy),value:copy,at:Date.now()});const {error}=await supabase.from('settings').upsert([{chave:k,valor:copy,atualizado_em:new Date().toISOString()}],{onConflict:'chave'});if(error){console.error('[extras v2]',error);return}pending.delete(k)}
window.CEV_EXTRA_V2_DB={push:(k,v)=>pushNow(k,v)};

async function sync(){if(busy||document.hidden)return;const c=ctx();if(!c)return;inject(c);if(typeof c.w.__CEV_EXTRA_V2_APPLY__!=='function')return;busy=true;try{const db=await fetchAll(),safe={};for(const k of KEYS){if(!(k in db))continue;const p=pending.get(k);if(p&&p.hash!==hash(db[k]))continue;safe[k]=db[k]}c.w.__CEV_EXTRA_V2_APPLY__(safe)}catch(e){console.error('[extras v2 poll]',e)}finally{busy=false}}
async function attach(){for(let i=0;i<120;i++){const c=ctx();if(c){inject(c);clearInterval(poll);poll=setInterval(sync,POLL_MS);setTimeout(sync,700);return}await sleep(250)}}
base.addEventListener('load',()=>{attached=null;setTimeout(attach,700)});attach();