(() => {
  'use strict';

  const MIN_CYCLE_MS = 30 * 60 * 1000;
  const MAX_CYCLE_MS = 18 * 60 * 60 * 1000;
  let lastWindow = null;

  function monitorWindow(){
    try{
      const base = document.getElementById('base');
      const middle = base && base.contentWindow;
      const monitor = middle && middle.document && middle.document.getElementById('monitor');
      return monitor && monitor.contentWindow ? monitor.contentWindow : null;
    }catch(e){ return null; }
  }

  function localDayStart(){
    const d = new Date();
    d.setHours(0,0,0,0);
    return d.getTime();
  }

  function formatMs(ms){
    ms = Math.max(0, Number(ms) || 0);
    const totalMin = Math.round(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h ? `${h}h ${String(m).padStart(2,'0')}min` : `${m}min`;
  }

  function readCycles(w){
    try{
      if(typeof w.lgRealCycles === 'function') return w.lgRealCycles(false) || [];
    }catch(e){}
    try{
      const result = w.eval("typeof lgRealCycles==='function' ? lgRealCycles(false) : []");
      return Array.isArray(result) ? result : [];
    }catch(e){ return []; }
  }

  function validCycleAverage(w){
    const startToday = localDayStart();
    const cycles = readCycles(w);
    const values = cycles
      .filter(c => c && !c.open && Number(c.end) >= startToday && Number(c.end) > Number(c.start))
      .map(c => Number(c.end) - Number(c.start))
      .filter(ms => Number.isFinite(ms) && ms >= MIN_CYCLE_MS && ms <= MAX_CYCLE_MS);
    return values.length ? values.reduce((a,b)=>a+b,0) / values.length : 0;
  }

  function applyFixTo(w){
    if(!w || !w.document) return;
    const el = w.document.getElementById('ovCycle');
    if(!el) return;
    const avg = validCycleAverage(w);
    el.textContent = avg ? formatMs(avg) : '--';
    el.title = 'Média do tempo real dos ciclos concluídos hoje';
    el.dataset.cevCycleFixed = '1';
  }

  function hookRender(w){
    if(!w || typeof w.renderOverview !== 'function') return;
    if(w.renderOverview.__cevCycleFixed) return;
    const original = w.renderOverview;
    const wrapped = function(...args){
      const result = original.apply(this,args);
      try{ applyFixTo(w); }catch(e){}
      setTimeout(()=>{ try{ applyFixTo(w); }catch(e){} }, 20);
      return result;
    };
    wrapped.__cevCycleFixed = true;
    wrapped.__cevOriginal = original;
    w.renderOverview = wrapped;
  }

  function ensure(){
    const w = monitorWindow();
    if(!w) return;
    if(lastWindow !== w) lastWindow = w;
    hookRender(w);
    applyFixTo(w);
  }

  setInterval(ensure, 500);
  window.addEventListener('load', ()=>setTimeout(ensure, 800));
})();
