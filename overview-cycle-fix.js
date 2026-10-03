(() => {
  'use strict';

  const MIN_CYCLE_MS = 30 * 60 * 1000;
  const MAX_CYCLE_MS = 18 * 60 * 60 * 1000;

  function monitorWindow(){
    try{
      const base = document.getElementById('base');
      const middle = base && base.contentWindow;
      const monitor = middle && middle.document && middle.document.getElementById('monitor');
      return monitor && monitor.contentWindow ? monitor.contentWindow : null;
    }catch(e){
      return null;
    }
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
    if(h) return `${h}h ${String(m).padStart(2,'0')}min`;
    return `${m}min`;
  }

  function validCycleAverage(w){
    if(!w || typeof w.lgRealCycles !== 'function') return null;
    try{
      const startToday = localDayStart();
      const values = w.lgRealCycles(false)
        .filter(c => Number(c && c.end) >= startToday && Number(c && c.end) > Number(c && c.start))
        .map(c => Number(c.end) - Number(c.start))
        .filter(ms => Number.isFinite(ms) && ms >= MIN_CYCLE_MS && ms <= MAX_CYCLE_MS);
      if(!values.length) return 0;
      return values.reduce((a,b) => a + b, 0) / values.length;
    }catch(e){
      return null;
    }
  }

  function applyFix(){
    const w = monitorWindow();
    if(!w || !w.document) return;
    const el = w.document.getElementById('ovCycle');
    if(!el) return;
    const avg = validCycleAverage(w);
    if(avg === null) return;
    el.textContent = avg ? formatMs(avg) : '--';
    el.title = 'Ciclo médio usando apenas ciclos válidos entre 30 min e 18 h';
  }

  setInterval(applyFix, 1500);
  window.addEventListener('load', () => setTimeout(applyFix, 1200));
})();
