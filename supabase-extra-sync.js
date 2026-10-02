import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://yyuqodhrterfrhoyhfut.supabase.co';
const SUPABASE_KEY='sb_publishable_jSWXE3-Ckzf8UNCWgbcM7w_rsgnXXdK';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

const base=document.getElementById('base');
const KEYS=['config','fleet_fronts','logistics','operational_extras','effective_equipment'];
const POLL_MS=5000;
let attachedWindow=null;
let applyBusy=false;
let attachBusy=false;
let syncTimers={};
let pollTimer=null;
const pendingWrites=new Map();

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clone=v=>JSON.parse(JSON.stringify(v));
const hash=v=>{try{return JSON.stringify(v)}catch(e){return String(v)}};

function getInnerMonitor(){
  try{
    const innerDoc=base.contentDocument;
    const monitor=innerDoc?.getElementById('monitor');
    const w=monitor?.contentWindow;
    if(!w||!monitor.contentDocument?.body)return null;
    return {monitor,w,d:monitor.contentDocument};
  }catch(e){return null}
}

function bridgeBootstrap(){
  try{
    if(window.__CEV_EXTRA_PATCHED__)return;
    window.__CEV_EXTRA_PATCHED__=true;

    const clone=v=>JSON.parse(JSON.stringify(v));
    const parse=(k,f)=>{try{const s=localStorage.getItem(k);return s?JSON.parse(s):f}catch(e){return f}};
    let applying=false;

    const exportSettings=()=>clone({
      config:(typeof config!=='undefined'?config:{}),
      fleet_fronts:{
        fleet:(typeof FLEET!=='undefined'?FLEET:{}),
        fronts:(typeof FRONTS!=='undefined'?FRONTS:[])
      },
      logistics:(typeof logistics!=='undefined'?logistics:{}),
      operational_extras:{
        maintenance:(typeof data!=='undefined'?data.maintenance||[]:[]),
        maintenanceHistory:(typeof data!=='undefined'?data.maintenanceHistory||[]:[]),
        fueling:(typeof data!=='undefined'?data.fueling||[]:[]),
        fuelingHistory:(typeof data!=='undefined'?data.fuelingHistory||[]:[])
      },
      effective_equipment:{
        data:parse('cev_effective_equipment_status_v3',[]),
        mill:localStorage.getItem('cev_effective_mill_v3')||'running',
        frontModes:parse('cev_effective_front_modes_v3',{})
      }
    });

    const notify=key=>{
      if(applying)return;
      try{
        const all=exportSettings();
        window.top.CEV_EXTRA_DB?.pushSetting(key,all[key]);
      }catch(e){console.error('[CEV extra notify]',e)}
    };

    const wrap=(name,key)=>{
      try{
        const fn=window[name]||eval(name);
        if(typeof fn!=='function'||fn.__cevExtraWrapped)return;
        const wrapped=function(...args){
          const out=fn.apply(this,args);
          setTimeout(()=>notify(key),0);
          return out;
        };
        wrapped.__cevExtraWrapped=true;
        try{window[name]=wrapped}catch(e){}
        try{eval(name+'=wrapped')}catch(e){}
      }catch(e){}
    };

    try{
      const previousSave=save;
      let lastExtras=JSON.stringify(exportSettings().operational_extras);
      const wrappedSave=function(...args){
        const out=previousSave.apply(this,args);
        try{
          const now=JSON.stringify(exportSettings().operational_extras);
          if(now!==lastExtras){lastExtras=now;setTimeout(()=>notify('operational_extras'),0)}
        }catch(e){}
        return out;
      };
      wrappedSave.__cevExtraWrapped=true;
      save=wrappedSave;
      window.save=wrappedSave;
    }catch(e){}

    wrap('saveCfg','config');
    wrap('saveFleetFronts','fleet_fronts');
    wrap('saveLogistics','logistics');
    ['effSfChangeStatus','effSfToggleMill','effSfToggleFront','effSfSaveMachine','effSfDeleteMachine']
      .forEach(n=>wrap(n,'effective_equipment'));

    window.__CEV_EXTRA_EXPORT_SETTINGS__=exportSettings;

    window.__CEV_EXTRA_APPLY_SETTINGS__=(map)=>{
      const active=document.activeElement;
      const editing=!!(active&&['INPUT','SELECT','TEXTAREA'].includes(active.tagName));
      if(editing)return {editing:true};

      applying=true;
      try{
        if(map?.config&&typeof config!=='undefined'){
          config=clone(map.config);
          localStorage.setItem('cev_v4_cfg',JSON.stringify(config));
          localStorage.setItem('cev_v4_cfg_backup',JSON.stringify(config));
          try{
            if(typeof buildCfg==='function')buildCfg();
            if(typeof loadRouteDefaults==='function'&&typeof front!=='undefined')loadRouteDefaults(front.value);
          }catch(e){}
        }

        if(map?.fleet_fronts){
          if(typeof FLEET!=='undefined')FLEET=clone(map.fleet_fronts.fleet||{});
          if(typeof FRONTS!=='undefined')FRONTS=clone(map.fleet_fronts.fronts||[]);
          localStorage.setItem('mf_custom_fleet',JSON.stringify(FLEET));
          localStorage.setItem('mf_custom_fleet_backup',JSON.stringify(FLEET));
          localStorage.setItem('mf_custom_fronts',JSON.stringify(FRONTS));
          localStorage.setItem('mf_custom_fronts_backup',JSON.stringify(FRONTS));
          try{
            if(typeof renderAdminFleetFrontLists==='function')renderAdminFleetFrontLists();
            if(typeof refreshTruckOptions==='function')refreshTruckOptions();
            if(typeof front!=='undefined'){
              const old=front.value;
              front.innerHTML=FRONTS.map(x=>'<option>'+String(x).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))+'</option>').join('');
              if(FRONTS.includes(old))front.value=old;
              if(typeof loadRouteDefaults==='function')loadRouteDefaults(front.value);
            }
            if(typeof buildCfg==='function')buildCfg();
          }catch(e){}
        }

        if(map?.logistics&&typeof logistics!=='undefined'){
          logistics=clone(map.logistics);
          localStorage.setItem('cev_v80_logistics',JSON.stringify(logistics));
          localStorage.setItem('cev_v80_logistics_backup',JSON.stringify(logistics));
          try{
            if(typeof renderLogisticsPanel==='function')renderLogisticsPanel();
            if(typeof renderEvoIntegration==='function')renderEvoIntegration();
          }catch(e){}
        }

        if(map?.operational_extras&&typeof data!=='undefined'){
          data.maintenance=clone(map.operational_extras.maintenance||[]);
          data.maintenanceHistory=clone(map.operational_extras.maintenanceHistory||[]);
          data.fueling=clone(map.operational_extras.fueling||[]);
          data.fuelingHistory=clone(map.operational_extras.fuelingHistory||[]);
          try{
            const s=JSON.stringify(data);
            localStorage.setItem('cev_v84_release_limpo_data',s);
            localStorage.setItem('cev_v84_release_limpo_data_backup',s);
            if(typeof renderMaintenance==='function')renderMaintenance();
            if(typeof renderFueling==='function')renderFueling();
          }catch(e){}
        }

        if(map?.effective_equipment){
          const payload=clone(map.effective_equipment);
          if(typeof window.effSfApplyExternal==='function'){
            window.effSfApplyExternal(payload);
          }else{
            const before=exportSettings().effective_equipment;
            const targetData=Array.isArray(payload.data)?payload.data:[];
            const targetMill=String(payload.mill||'running');
            const targetModes=(payload.frontModes&&typeof payload.frontModes==='object')?payload.frontModes:{};

            try{
              if(before.mill!==targetMill&&typeof window.effSfToggleMill==='function')window.effSfToggleMill();
              if(typeof window.effSfToggleFront==='function'){
                Object.keys(targetModes).forEach(front=>{
                  let cur=(exportSettings().effective_equipment.frontModes||{})[front]||'running';
                  const wanted=targetModes[front]||'running';
                  let guard=0;
                  while(cur!==wanted&&guard<3){window.effSfToggleFront(front);cur=(exportSettings().effective_equipment.frontModes||{})[front]||'running';guard++}
                });
              }
              if(typeof window.effSfChangeStatus==='function'){
                const curById=new Map((exportSettings().effective_equipment.data||[]).map(x=>[String(x.id),x]));
                targetData.forEach(x=>{const cur=curById.get(String(x.id));if(cur&&cur.status!==x.status)window.effSfChangeStatus(String(x.id),x.status)});
              }
            }catch(e){console.error('[CEV equipamentos apply live]',e)}

            const d=JSON.stringify(targetData);
            const fm=JSON.stringify(targetModes);
            localStorage.setItem('cev_effective_equipment_status_v3',d);
            localStorage.setItem('cev_effective_equipment_status_v3_backup',d);
            localStorage.setItem('cev_effective_mill_v3',targetMill);
            localStorage.setItem('cev_effective_front_modes_v3',fm);
          }
        }

        try{
          if(typeof render==='function')render();
          if(typeof renderOverview==='function')renderOverview();
          if(typeof renderLogisticsPanel==='function')renderLogisticsPanel();
        }catch(e){}
      }finally{
        applying=false;
      }
      return {editing:false};
    };

    document.documentElement.dataset.supabaseExtra='ready';
  }catch(e){
    console.error('[CEV extra bridge]',e);
  }
}

async function getSession(){
  const {data:{session}}=await supabase.auth.getSession();
  return session;
}

async function waitReady(){
  for(let i=0;i<180;i++){
    const session=await getSession();
    const m=getInnerMonitor();
    if(session?.user&&m?.w?.document?.documentElement?.dataset?.supabaseSync){
      return {session,...m};
    }
    await sleep(250);
  }
  throw new Error('Monitor/Supabase não ficou pronto para sincronização extra.');
}

function injectExtra(m){
  if(attachedWindow===m.w&&m.w.__CEV_EXTRA_EXPORT_SETTINGS__)return;
  const s=m.d.createElement('script');
  s.textContent='('+bridgeBootstrap.toString()+')();';
  m.d.body.appendChild(s);s.remove();
  attachedWindow=m.w;
}

async function fetchSettings(){
  const {data,error}=await supabase.from('settings').select('chave,valor,atualizado_em').in('chave',KEYS);
  if(error)throw error;
  const map={};
  (data||[]).forEach(r=>map[r.chave]=r.valor);
  return map;
}

async function pushSettingNow(key,value){
  if(!KEYS.includes(key))return;
  const session=await getSession();
  if(!session?.user)return;

  const wanted=clone(value);
  const wantedHash=hash(wanted);
  pendingWrites.set(key,{value:wanted,hash:wantedHash,at:Date.now(),sending:true});

  const {error}=await supabase.from('settings').upsert(
    [{chave:key,valor:wanted,atualizado_em:new Date().toISOString()}],
    {onConflict:'chave'}
  );

  const pending=pendingWrites.get(key);
  if(error){
    console.error('[CEV extra push]',key,error);
    if(pending)pending.sending=false;
    return;
  }

  if(pending&&pending.hash===wantedHash)pendingWrites.delete(key);
}

function queueSetting(key,value){
  if(!KEYS.includes(key)||applyBusy)return;
  clearTimeout(syncTimers[key]);
  const copy=clone(value);
  pendingWrites.set(key,{value:copy,hash:hash(copy),at:Date.now(),sending:false});
  syncTimers[key]=setTimeout(()=>pushSettingNow(key,copy),300);
}

window.CEV_EXTRA_DB={pushSetting:queueSetting};

async function applySettings(map){
  if(!map||!Object.keys(map).length)return;
  const m=getInnerMonitor();
  const fn=m?.w?.__CEV_EXTRA_APPLY_SETTINGS__;
  if(typeof fn!=='function')return;
  applyBusy=true;
  try{fn(map)}finally{setTimeout(()=>{applyBusy=false},120)}
}

async function migrateMissing(){
  const m=getInnerMonitor();
  const exportFn=m?.w?.__CEV_EXTRA_EXPORT_SETTINGS__;
  if(typeof exportFn!=='function')return;
  const local=exportFn();
  const db=await fetchSettings();
  for(const key of KEYS){
    if(!Object.prototype.hasOwnProperty.call(db,key)&&Object.prototype.hasOwnProperty.call(local,key)){
      await pushSettingNow(key,local[key]);
      db[key]=local[key];
    }
  }
  await applySettings(db);
}

async function pollSettings(){
  if(attachBusy||applyBusy||document.hidden)return;
  try{
    const db=await fetchSettings();
    const safe={};

    for(const key of KEYS){
      if(!Object.prototype.hasOwnProperty.call(db,key))continue;
      const pending=pendingWrites.get(key);
      if(pending){
        if(hash(db[key])===pending.hash){
          pendingWrites.delete(key);
          continue;
        }
        if(!pending.sending&&Date.now()-pending.at>=POLL_MS){
          pending.at=Date.now();
          pending.sending=true;
          pushSettingNow(key,pending.value).catch(()=>{});
        }
        continue;
      }
      safe[key]=db[key];
    }

    await applySettings(safe);
  }catch(e){
    console.error('[CEV extra poll]',e);
  }
}

function startPolling(){
  clearInterval(pollTimer);
  pollTimer=setInterval(pollSettings,POLL_MS);
}

async function attach(){
  if(attachBusy)return;
  attachBusy=true;
  try{
    const ready=await waitReady();
    injectExtra(ready);
    await migrateMissing();
    startPolling();
  }catch(e){
    console.error('[CEV extra attach]',e);
  }finally{
    attachBusy=false;
  }
}

base.addEventListener('load',()=>{
  attachedWindow=null;
  setTimeout(()=>attach(),500);
});

attach();
