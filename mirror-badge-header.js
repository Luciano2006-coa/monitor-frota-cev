(() => {
  const STRIP_IDS = ['cevMirrorOuterStrip','cevMirrorStrip'];

  function getInnerDoc() {
    try {
      const base = document.getElementById('base');
      const middleDoc = base?.contentDocument;
      const monitor = middleDoc?.getElementById('monitor');
      return monitor?.contentDocument || null;
    } catch (e) {
      return null;
    }
  }

  function hideMirrorUi() {
    for (const id of STRIP_IDS) document.getElementById(id)?.remove();

    const doc = getInnerDoc();
    if (!doc) return;

    const badge = doc.getElementById('cevMirrorBadge');
    if (badge) {
      badge.style.setProperty('display', 'none', 'important');
      badge.style.setProperty('visibility', 'hidden', 'important');
      badge.style.setProperty('opacity', '0', 'important');
      badge.style.setProperty('pointer-events', 'none', 'important');
    }
  }

  /* O espelho continua sincronizando normalmente. Apenas a interface visual
     de status fica oculta no PC e no mobile. */
  setInterval(hideMirrorUi, 500);
  document.getElementById('base')?.addEventListener('load', () => setTimeout(hideMirrorUi, 500));
  setTimeout(hideMirrorUi, 300);
})();
