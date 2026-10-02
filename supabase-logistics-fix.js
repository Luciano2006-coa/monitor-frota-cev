import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://yyuqodhrterfrhoyhfut.supabase.co';
const SUPABASE_KEY='sb_publishable_jSWXE3-Ckzf8UNCWgbcM7w_rsgnXXdK';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

const base=document.getElementById('base');
const POLL_MS=5000;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let pollTimer=null;
let lastAppliedHash='';
let busy=false;

const hash=v=>{try{return JSON.stringify(v)}catch(e){return String(v)}};

function getInner(){
  try{
    const outerDoc=base.contentDocument;
    const monitor=outerDoc?.getElementById('monitor');
    const d=monitor?.contentDocument;
    const w=monitor?.contentWindow;
    if(!w||!d?.body)return null;
    return {w,d};
  }catch(e){return null}
}

function injectFix(ctx){
  const s=ctx.d.createElement('script');
  s.textContent=`(()=>{
    try{
      if(window.__CEV_LOGISTICS_SYNC_FIX__)return;
      window.__CEV_LOGISTICS_SYNC_FIX__=true;

      const clone=v=>JSON.parse(JSON.stringify(v));
      let pushTimer=null;

      const markLocalChange=()=>{
        window.__CEV_LOGISTICS_LOCAL_DIRTY_UNTIL__=Date.now()+4000;
      };

      const pushLogistics=()=>{
        markLocalChange();
        clearTimeout(pushTimer);
        pushTimer=setTimeout(()=>{
          try{
            window.top.CEV_EXTRA_DB?.pushSetting('logistics',clone(logistics));
          }catch(e){console.error('[CEV logistics explicit sync]',e)}
        },120);
      };

      const wrap=(name)=>{
        try{
          const fn=window[name]||eval(name);
          if(typeof fn!=='function'||fn.__cevLogisticsSyncFix)return;
          const wrapped=function(...args){
            markLocalChange();
            const out=fn.apply(this,args);
            setTimeout(pushLogistics,0);
            return out;
          };
          wrapped.__cevLogisticsSyncFix=true;
          try{window[name]=wrapped}catch(e){}
          try{eval(name+'=wrapped')}catch(e){}
        }catch(e){console.warn('[CEV logistics wrap]',name,e)}
      };

      [
        'logisticsUpdateFront',
        'logisticsSaveFrontValue',
        'logisticsSetFixedFleet',
        'logisticsRemoveFixedFleet',
        'logisticsSetTruckType',
        'logisticsRemoveTruckType',
        'logisticsSetVisitReason',
        'lgSaveTruckType',
        'lgAssignInsideTruck',
        'lgCancelDispatchPlan'
      ].forEach(wrap);

      window.__CEV_LOGISTICS_EXPORT__=()=>clone(logistics||{});
      window.__CEV_LOGISTICS_APPLY_LIVE__=(incoming)=>{
        try{
          if(!incoming||typeof incoming!=='object')return false;
          const active=document.activeElement;
          const editing=!!(active&&['INPUT','SELECT','TEXTAREA'].includes(active.tagName));
          if(editing)return false;
          if(Number(window.__CEV_LOGISTICS_LOCAL_DIRTY_UNTIL__||0)>Date.now())return false;

          logistics=clone(incoming);
          try{
            const txt=JSON.stringify(logistics);
            localStorage.setItem('cev_v80_logistics',txt);
            localStorage.setItem('cev_v80_logistics_backup',txt);
          }catch(e){}

          try{if(typeof renderLogisticsPanel==='function')renderLogisticsPanel()}catch(e){console.error('[CEV logistics live render panel]',e)}
          try{if(typeof renderOverview==='function')renderOverview()}catch(e){console.error('[CEV logistics live render overview]',e)}
          try{if(typeof renderEvoIntegration==='function')renderEvoIntegration()}catch(e){}
          try{if(typeof render==='function')render()}catch(e){}
          return true;
        }catch(e){
          console.error('[CEV logistics live apply]',e);
          return false;
        }
      };

      document.documentElement.dataset.logisticsSyncFix='ready';
    }catch(e){console.error('[CEV logistics sync fix]',e)}
  })();`;
  ctx.d.body.appendChild(s);
  s.remove();
}

async function attach(){
  for(let i=0;i<160;i++){
    const ctx=getInner();
    if(ctx&&window.CEV_EXTRA_DB){
      injectFix(ctx);
      startPolling();
      return;
    }
    await sleep(250);
  }
  console.error('[CEV logistics sync fix] Monitor não ficou pronto.');
}

async function pollLogistics(){
  if(busy||document.hidden)return;
  const ctx=getInner();
  if(!ctx||typeof ctx.w.__CEV_LOGISTICS_APPLY_LIVE__!=='function')return;
  if(Number(ctx.w.__CEV_LOGISTICS_LOCAL_DIRTY_UNTIL__||0)>Date.now())return;

  const active=ctx.d.activeElement;
  if(active&&['INPUT','SELECT','TEXTAREA'].includes(active.tagName))return;

  busy=true;
  try{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.user)return;

    const {data,error}=await supabase
      .from('settings')
      .select('valor,atualizado_em')
      .eq('chave','logistics')
      .maybeSingle();
    if(error)throw error;
    if(!data?.valor)return;

    const dbHash=hash(data.valor);
    const local=ctx.w.__CEV_LOGISTICS_EXPORT__?.()||{};
    const localHash=hash(local);

    if(dbHash!==localHash){
      const applied=ctx.w.__CEV_LOGISTICS_APPLY_LIVE__(data.valor);
      if(applied)lastAppliedHash=dbHash;
    }else{
      lastAppliedHash=dbHash;
    }
  }catch(e){
    console.error('[CEV logistics live poll]',e);
  }finally{
    busy=false;
  }
}

function startPolling(){
  clearInterval(pollTimer);
  pollTimer=setInterval(pollLogistics,POLL_MS);
  setTimeout(pollLogistics,1000);
}

base.addEventListener('load',()=>{
  clearInterval(pollTimer);
  setTimeout(attach,700);
});

attach();
