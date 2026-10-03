(() => {
  const MOBILE_MAX = 820;

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

  function findHeaderHost(doc) {
    return doc.querySelector('.cev-right') ||
           doc.querySelector('.cev-topbar .row') ||
           doc.querySelector('.cev-topbar') ||
           doc.querySelector('header .row') ||
           doc.querySelector('header');
  }

  function placeBadge() {
    const doc = getInnerDoc();
    if (!doc) return;

    const badge = doc.getElementById('cevMirrorBadge');
    if (!badge) return;

    if (window.innerWidth <= MOBILE_MAX) {
      badge.style.display = 'none';
      badge.style.pointerEvents = 'none';
      return;
    }

    const host = findHeaderHost(doc);
    if (!host) return;

    if (badge.parentElement !== host) host.appendChild(badge);

    badge.style.cssText = [
      'position:static',
      'left:auto',
      'right:auto',
      'top:auto',
      'bottom:auto',
      'transform:none',
      'z-index:auto',
      'display:inline-flex',
      'align-items:center',
      'max-width:360px',
      'margin:0 0 0 8px',
      'padding:6px 10px',
      'border-radius:999px',
      'background:#102f49',
      'color:#fff',
      'font:700 10px Segoe UI,Arial,sans-serif',
      'line-height:1.2',
      'box-shadow:none',
      'white-space:nowrap',
      'pointer-events:none',
      'flex:0 0 auto'
    ].join(';');
  }

  setInterval(placeBadge, 500);
  window.addEventListener('resize', placeBadge);
  document.getElementById('base')?.addEventListener('load', () => setTimeout(placeBadge, 900));
})();
