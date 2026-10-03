import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://yyuqodhrterfrhoyhfut.supabase.co';
const SUPABASE_KEY='sb_publishable_jSWXE3-Ckzf8UNCWgbcM7w_rsgnXXdK';
const COA_EMAIL='coa@cev.com.br';
const MIRROR_KEY='coa_mirror_state';
const VIEW_POLL_MS=5000;
const COA_CHECK_MS=1000;
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);
const base=document.getElementById('base');

let isCoa=false;
let currentEmail='';
let attachedInner=null;
let lastLocalHash='';
let lastAppliedVersion=0;
let writing=false;
let booted=false;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clone=v=>JSON.parse(JSON.stringify(v));
const hash=v=>{try{return JSON.stringify(v)}catch(e){return String(v)}};

function getCtx(){
  try{
    const middle=base?.contentWindow;
    const middleDoc=base?.contentDocument;
    const monitor=middleDoc?.getElementById('monitor');
    const inner=monitor?.contentWindow;
    const innerDoc=monitor?.contentDocument;
    if(!middle||!inner||!innerDoc?.body)return null;
    return {middle,middleDoc,monitor,inner,innerDoc};
  }catch(e){return null}
}

function injectMirrorBridge(c){
  if(attachedInner===c.inner&&typeof c.inner.__CEV_MIRROR_EXPORT__==='function')return;
  const s=c.innerDoc.createElement('script');
  s.textContent=`(()=>{
    try{
      if(window.__CEV_MIRROR_BRIDGE__)return;
      window.__CEV_MIRROR_BRIDGE__=true;
      const clone=v=>JSON.parse(JSON.stringify(v));
      const parse=(k,f)=>{try{const s=localStorage.getItem(k);return s?JSON.parse(s):f}catch(e){return f}};
      window.__CEV_MIRROR_EXPORT__=()=>clone({
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
      window.__CEV_MIRROR_APPLY__=(snap)=>{
        try{
          if(!snap||typeof snap!=='object')return false;
          if(snap.config&&typeof config!=='undefined'){
            config=clone(snap.config);
            localStorage.setItem('cev_v4_cfg',JSON.stringify(config));
            localStorage.setItem('cev_v4_cfg_backup',JSON.stringify(config));
            try{if(typeof buildCfg==='function')buildCfg()}catch(e){}
          }
          if(snap.fleet_fronts){
            if(typeof FLEET!=='undefined')FLEET=clone(snap.fleet_fronts.fleet||{});
            if(typeof FRONTS!=='undefined')FRONTS=clone(snap.fleet_fronts.fronts||[]);
            try{
              localStorage.setItem('mf_custom_fleet',JSON.stringify(FLEET));
              localStorage.setItem('mf_custom_fleet_backup',JSON.stringify(FLEET));
              localStorage.setItem('mf_custom_fronts',JSON.stringify(FRONTS));
              localStorage.setItem('mf_custom_fronts_backup',JSON.stringify(FRONTS));
            }catch(e){}
            try{if(typeof renderAdminFleetFrontLists==='function')renderAdminFleetFrontLists()}catch(e){}
            try{if(typeof refreshTruckOptions==='function')refreshTruckOptions()}catch(e){}
          }
          if(snap.logistics&&typeof logistics!=='undefined'){
            logistics=clone(snap.logistics);
            try{
              const t=JSON.stringify(logistics);
              localStorage.setItem('cev_v80_logistics',t);
              localStorage.setItem('cev_v80_logistics_backup',t);
            }catch(e){}
          }
          if(snap.operational_extras&&typeof data!=='undefined'){
            data.maintenance=clone(snap.operational_extras.maintenance||[]);
            data.maintenanceHistory=clone(snap.operational_extras.maintenanceHistory||[]);
            data.fueling=clone(snap.operational_extras.fueling||[]);
            data.fuelingHistory=clone(snap.operational_extras.fuelingHistory||[]);
            try{
              const t=JSON.stringify(data);
              localStorage.setItem('cev_v84_release_limpo_data',t);
              localStorage.setItem('cev_v84_release_limpo_data_backup',t);
            }catch(e){}
          }
          if(snap.effective_equipment){
            const p=clone(snap.effective_equipment);
            try{
              localStorage.setItem('cev_effective_equipment_status_v3',JSON.stringify(Array.isArray(p.data)?p.data:[]));
              localStorage.setItem('cev_effective_equipment_status_v3_backup',JSON.stringify(Array.isArray(p.data)?p.data:[]));
              localStorage.setItem('cev_effective_mill_v3',String(p.mill||'running'));
              localStorage.setItem('cev_effective_front_modes_v3',JSON.stringify(p.frontModes&&typeof p.frontModes==='object'?p.frontModes:{}));
            }catch(e){}
            try{if(typeof window.effSfApplyExternal==='function')window.effSfApplyExternal(p)}catch(e){}
          }
          try{if(typeof render==='function')render()}catch(e){}
          try{if(typeof renderOverview==='function')renderOverview()}catch(e){}
          try{if(typeof renderLogisticsPanel==='function')renderLogisticsPanel()}catch(e){}
          try{if(typeof renderEvoIntegration==='function')renderEvoIntegration()}catch(e){}
          try{if(typeof renderMaintenance==='function')renderMaintenance()}catch(e){}
          try{if(typeof renderFueling==='function')renderFueling()}catch(e){}
          return true;
        }catch(e){console.error('[CEV mirror apply]',e);return false}
      };
      document.documentElement.dataset.cevMirror='ready';
    }catch(e){console.error('[CEV mirror bridge]',e)}
  })();`;
  c.innerDoc.body.appendChild(s);s.remove();
  attachedInner=c.inner;
}

function setViewerUi(c){
  if(isCoa||!c)return;
  c.innerDoc.documentElement.dataset.cevMirrorRole='viewer';
  if(!c.innerDoc.getElementById('cevMirrorViewerStyle')){
    const st=c.innerDoc.createElement('style');
    st.id='cevMirrorViewerStyle';
    st.textContent=`html[data-cev-mirror-role="viewer"] input:not([type="search"]),html[data-cev-mirror-role="viewer"] select,html[data-cev-mirror-role="viewer"] textarea{pointer-events:none!important;opacity:.82!important}`;
    c.innerDoc.head.appendChild(st);
  }
  if(!c.innerDoc.getElementById('cevMirrorBadge')){
    const b=c.innerDoc.createElement('div');
    b.id='cevMirrorBadge';
    b.textContent='👁 Espelho do COA • atualização automática';
    b.style.cssText='position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:25000;background:#102f49;color:white;padding:8px 13px;border-radius:999px;font:700 11px Segoe UI,Arial;box-shadow:0 8px 24px #0004;pointer-events:none';
    c.innerDoc.body.appendChild(b);
  }
  if(!c.inner.__CEV_MIRROR_VIEWER_GUARD__){
    c.inner.__CEV_MIRROR_VIEWER_GUARD__=true;
    const mutating=/salvar|adicionar|excluir|apagar|remover|confirmar|chegou|quebrou|abastecer|finalizar|editar|alterar|reiniciar|limpar|retomar|nova viagem|despachar|cancelar|manutenção|manutencao/i;
    c.innerDoc.addEventListener('click',ev=>{
      const btn=ev.target?.closest?.('button,[role="button"]');
      if(!btn)return;
      const txt=String(btn.innerText||btn.textContent||'').trim();
      const oc=String(btn.getAttribute?.('onclick')||'');
      const handler=/save|delete|remove|create|update|confirm|finish|start|toggleBreak|dispatch|assign|setFixed|setTruck|clearDay|admin/i.test(oc);
      if(mutating.test(txt)||handler){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation?.();try{c.inner.alert('Este usuário é somente visualização. As alterações são feitas pelo COA.')}catch(e){}}
    },true);
  }
}

async function getSession(){const {data:{session}}=await supabase.auth.getSession();return session}

async function fetchMirror(){
  const {data,error}=await supabase.from('settings').select('valor,atualizado_em').eq('chave',MIRROR_KEY).maybeSingle();
  if(error)throw error;
  return data?.valor||null;
}

async function pushMirror(snapshot){
  if(!isCoa||writing||!snapshot)return;
  writing=true;
  try{
    const payload={version:Date.now(),updated_at:new Date().toISOString(),updated_by:COA_EMAIL,state:clone(snapshot)};
    const {error}=await supabase.from('settings').upsert([{chave:MIRROR_KEY,valor:payload,atualizado_em:new Date().toISOString()}],{onConflict:'chave'});
    if(error)throw error;
    lastAppliedVersion=payload.version;
    const c=getCtx();
    try{const el=c?.middleDoc?.getElementById('dbState');if(el)el.textContent='COA • espelho publicado'}catch(e){}
  }catch(e){console.error('[CEV mirror push]',e)}finally{writing=false}
}

async function coaTick(){
  if(!isCoa)return;
  const c=getCtx();if(!c)return;
  injectMirrorBridge(c);
  const exp=c.inner.__CEV_MIRROR_EXPORT__;
  if(typeof exp!=='function')return;
  const snap=exp();
  const h=hash(snap);
  if(h!==lastLocalHash){lastLocalHash=h;await pushMirror(snap)}
}

async function viewerTick(){
  if(isCoa)return;
  const c=getCtx();if(!c)return;
  injectMirrorBridge(c);setViewerUi(c);
  try{
    const mirror=await fetchMirror();
    if(!mirror?.state)return;
    const version=Number(mirror.version||0);
    if(version&&version<=lastAppliedVersion)return;
    const ok=c.inner.__CEV_MIRROR_APPLY__?.(mirror.state);
    if(ok){
      lastAppliedVersion=version||Date.now();
      lastLocalHash=hash(mirror.state);
      try{const el=c.middleDoc?.getElementById('dbState');if(el)el.textContent='Espelho COA atualizado'}catch(e){}
    }
  }catch(e){console.error('[CEV mirror viewer]',e)}
}

async function boot(){
  if(booted)return;booted=true;
  let session=null;
  for(let i=0;i<120;i++){
    session=await getSession();
    if(session?.user)break;
    await sleep(250);
  }
  if(!session?.user)return;
  currentEmail=String(session.user.email||'').trim().toLowerCase();
  isCoa=currentEmail===COA_EMAIL;

  let c=null;
  for(let i=0;i<160;i++){
    c=getCtx();
    if(c?.innerDoc?.documentElement?.dataset?.supabaseSync)break;
    await sleep(250);
  }
  c=getCtx();if(!c)return;
  injectMirrorBridge(c);

  if(isCoa){
    // LOCAL-FIRST: publica imediatamente o estado atual carregado do navegador do COA.
    const snap=c.inner.__CEV_MIRROR_EXPORT__?.();
    if(snap){lastLocalHash=hash(snap);await pushMirror(snap)}
    setInterval(coaTick,COA_CHECK_MS);
  }else{
    setViewerUi(c);
    await viewerTick();
    setInterval(viewerTick,VIEW_POLL_MS);
  }
}

base?.addEventListener('load',()=>{attachedInner=null;setTimeout(()=>{booted=false;boot()},700)});
boot();
