import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://yyuqodhrterfrhoyhfut.supabase.co';
const SUPABASE_KEY='sb_publishable_jSWXE3-Ckzf8UNCWgbcM7w_rsgnXXdK';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

const base=document.getElementById('base');
const KEYS=['config','fleet_fronts','logistics','operational_extras','effective_equipment'];
let channel=null,attachedWindow=null,reloadBusy=false,applyBusy=false,syncTimers={};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clone=v=>JSON.parse(JSON.stringify(v));

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
      applying=true;
      let reload=false;
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
          const d=JSON.stringify(map.effective_equipment.data||[]);
          const mill=String(map.effective_equipment.mill||'running');
          const fm=JSON.stringify(map.effective_equipment.frontModes||{});
          const changed=
            localStorage.getItem('cev_effective_equipment_status_v3')!==d||
            localStorage.getItem('cev_effective_mill_v3')!==mill||
            localStorage.getItem('cev_effective_front_modes_v3')!==fm;
          localStorage.setItem('cev_effective_equipment_status_v3',d);
          localStorage.setItem('cev_effective_equipment_status_v3_backup',d);
          localStorage.setItem('cev_effective_mill_v3',mill);
          localStorage.setItem('cev_effective_front_modes_v3',fm);
          reload=changed;
        }

        try{
          if(typeof render==='function')render();
          if(typeof renderOverview==='function')renderOverview();
          if(typeof renderLogisticsPanel==='function')renderLogisticsPanel();
        }catch(e){}
      }finally{
        applying=false;
      }
      return {reload};
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
  if(applyBusy||!KEYS.includes(key))return;
  const session=await getSession();
  if(!session?.user)return;
  const {error}=await supabase.from('settings').upsert(
    [{chave:key,valor:clone(value),atualizado_em:new Date().toISOString()}],
    {onConflict:'chave'}
  );
  if(error)console.error('[CEV extra push]',key,error);
}

function queueSetting(key,value){
  clearTimeout(syncTimers[key]);
  const copy=clone(value);
  syncTimers[key]=setTimeout(()=>pushSettingNow(key,copy),180);
}

window.CEV_EXTRA_DB={pushSetting:queueSetting};

async function applySettings(map){
  const m=getInnerMonitor();
  const fn=m?.w?.__CEV_EXTRA_APPLY_SETTINGS__;
  if(typeof fn!=='function')return;
  applyBusy=true;
  try{
    const res=fn(map)||{};
    if(res.reload&&!reloadBusy){
      reloadBusy=true;
      setTimeout(()=>base.contentWindow.location.reload(),80);
    }
  }finally{
    setTimeout(()=>{applyBusy=false},100);
  }
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

async function reloadSettings(){
  if(reloadBusy)return;
  try{
    const map=await fetchSettings();
    await applySettings(map);
  }catch(e){console.error('[CEV extra reload]',e)}
}

function startRealtime(){
  if(channel)supabase.removeChannel(channel);
  channel=supabase.channel('cev-extra-settings-'+crypto.randomUUID())
    .on('postgres_changes',{event:'*',schema:'public',table:'settings'},()=>setTimeout(reloadSettings,160))
    .subscribe();
}

async function attach(){
  try{
    const ready=await waitReady();
    injectExtra(ready);
    await migrateMissing();
    if(!reloadBusy)startRealtime();
  }catch(e){console.error('[CEV extra attach]',e)}
}

base.addEventListener('load',()=>{
  attachedWindow=null;
  setTimeout(async()=>{
    reloadBusy=false;
    await attach();
  },500);
});

attach();
setInterval(()=>{if(!document.hidden&&!reloadBusy)reloadSettings()},15000);
