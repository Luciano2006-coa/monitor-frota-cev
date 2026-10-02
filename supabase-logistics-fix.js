const base=document.getElementById('base');

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

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

      const pushLogistics=()=>{
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
      return;
    }
    await sleep(250);
  }
  console.error('[CEV logistics sync fix] Monitor não ficou pronto.');
}

base.addEventListener('load',()=>setTimeout(attach,700));
attach();
