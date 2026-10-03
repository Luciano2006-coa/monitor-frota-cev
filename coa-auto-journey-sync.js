const COA_EMAIL='coa@cev.com.br';
const POLL_MS=2000;
const base=document.getElementById('base');
let lastHash='';
let busy=false;

function clone(v){return JSON.parse(JSON.stringify(v))}
function hash(v){try{return JSON.stringify(v)}catch(e){return String(v)}}

function getCtx(){
  try{
    const middle=base?.contentWindow;
    const middleDoc=base?.contentDocument;
    const monitor=middleDoc?.getElementById('monitor');
    const inner=monitor?.contentWindow;
    if(!middle||!inner)return null;
    return {middle,inner};
  }catch(e){return null}
}

async function tick(){
  if(busy||document.hidden)return;
  const c=getCtx();
  if(!c)return;

  const email=String(c.middle.__CEV_SUPABASE_USER__?.email||'').trim().toLowerCase();
  if(email!==COA_EMAIL)return;

  const exp=c.inner.__CEV_DB_EXPORT__;
  const push=c.middle.CEV_DB?.pushFromMonitor;
  if(typeof exp!=='function'||typeof push!=='function')return;

  let snap;
  try{snap=clone(exp())}catch(e){return}
  const h=hash(snap);
  if(h===lastHash)return;

  busy=true;
  try{
    lastHash=h;
    push(snap);
  }catch(e){
    console.error('[CEV COA auto journey sync]',e);
    lastHash='';
  }finally{
    setTimeout(()=>{busy=false},250);
  }
}

setInterval(tick,POLL_MS);
setTimeout(tick,1200);
