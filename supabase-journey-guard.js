const base=document.getElementById('base');

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clone=v=>JSON.parse(JSON.stringify(v));

function stable(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
}

function snapshotMap(snapshot){
  const map=new Map();
  for(const group of ['active','completed','transfer','finalized']){
    for(const j of (snapshot?.[group]||[])){
      if(j?.id==null)continue;
      map.set(String(j.id),stable({group,payload:j}));
    }
  }
  return map;
}

function rowsMap(rows){
  const map=new Map();
  for(const r of (rows||[])){
    if(r?.monitor_id==null||!r?.payload)continue;
    map.set(String(r.monitor_id),stable({group:r.grupo,payload:r.payload}));
  }
  return map;
}

function getCtx(){
  try{
    const middle=base?.contentWindow;
    const middleDoc=base?.contentDocument;
    const monitor=middleDoc?.getElementById('monitor');
    const inner=monitor?.contentWindow;
    if(!middle||!inner||!middle.CEV_DB||typeof middle.CEV_DB.pushFromMonitor!=='function')return null;
    if(typeof inner.__CEV_DB_APPLY__!=='function'||typeof inner.__CEV_DB_EXPORT__!=='function')return null;
    return {middle,inner};
  }catch(e){return null}
}

let attachedInner=null;

function install(ctx){
  if(attachedInner===ctx.inner&&ctx.inner.__CEV_JOURNEY_GUARD__)return;
  if(ctx.inner.__CEV_JOURNEY_GUARD__){attachedInner=ctx.inner;return;}

  const state={
    accepted:snapshotMap(ctx.inner.__CEV_DB_EXPORT__()),
    pending:null,
    guardUntil:0,
    retryTimer:null
  };

  const originalPush=ctx.middle.CEV_DB.pushFromMonitor.bind(ctx.middle.CEV_DB);
  const originalApply=ctx.inner.__CEV_DB_APPLY__.bind(ctx.inner);

  function pendingConfirmed(dbMap){
    const p=state.pending;
    if(!p)return true;
    for(const [id,h] of p.changed){if(dbMap.get(id)!==h)return false}
    for(const id of p.deleted){if(dbMap.has(id))return false}
    return true;
  }

  function resendPending(){
    const p=state.pending;
    if(!p)return;
    clearTimeout(state.retryTimer);
    state.retryTimer=setTimeout(()=>{
      if(!state.pending)return;
      state.guardUntil=Date.now()+5000;
      try{originalPush(clone(state.pending.snapshot))}catch(e){console.error('[CEV journey guard resend]',e)}
    },900);
  }

  ctx.middle.CEV_DB.pushFromMonitor=function(snapshot){
    const copy=clone(snapshot||{});
    const next=snapshotMap(copy);
    const changed=new Map();
    const deleted=new Set();

    for(const [id,h] of next){if(state.accepted.get(id)!==h)changed.set(id,h)}
    for(const id of state.accepted.keys()){if(!next.has(id))deleted.add(id)}

    if(changed.size||deleted.size){
      state.pending={snapshot:copy,changed,deleted,startedAt:Date.now()};
      state.guardUntil=Date.now()+5000;
    }

    return originalPush(copy);
  };

  ctx.inner.__CEV_DB_APPLY__=function(rows){
    const dbMap=rowsMap(rows);

    if(state.pending){
      if(!pendingConfirmed(dbMap)){
        // Há uma ação local mais nova que o banco ainda não confirmou.
        // Ignora a leitura antiga para impedir rollback visual/operacional.
        state.guardUntil=Math.max(state.guardUntil,Date.now()+1500);
        resendPending();
        return;
      }

      clearTimeout(state.retryTimer);
      state.retryTimer=null;
      state.pending=null;
      state.guardUntil=0;
    }

    state.accepted=dbMap;
    return originalApply(rows);
  };

  ctx.inner.__CEV_JOURNEY_GUARD__={state};
  attachedInner=ctx.inner;
  console.info('[CEV] Proteção anti-rollback de viagens ativa.');
}

async function attach(){
  for(let i=0;i<160;i++){
    const ctx=getCtx();
    if(ctx){install(ctx);return}
    await sleep(250);
  }
  console.error('[CEV journey guard] Monitor não ficou pronto.');
}

base?.addEventListener('load',()=>{attachedInner=null;setTimeout(attach,700)});
attach();
setInterval(()=>{const ctx=getCtx();if(ctx&&ctx.inner!==attachedInner)install(ctx)},2000);
