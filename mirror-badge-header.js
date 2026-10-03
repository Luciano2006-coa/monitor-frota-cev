(() => {
  const MOBILE_MAX = 820;
  const touchDevice = /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(navigator.userAgent || '');

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

  function isMobile(doc) {
    const innerWidth = doc?.defaultView?.innerWidth || window.innerWidth;
    return touchDevice || innerWidth <= MOBILE_MAX || window.innerWidth <= MOBILE_MAX;
  }

  function findHeader(doc) {
    return doc.querySelector('.cev-premium-wrap') ||
           doc.querySelector('.cev-topbar')?.closest('header') ||
           doc.querySelector('header');
  }

  function removeMobileBadge(doc) {
    const badge = doc?.getElementById('cevMirrorBadge');
    const strip = doc?.getElementById('cevMirrorStrip');
    if (badge) badge.remove();
    if (strip) strip.remove();
  }

  function placeBadge() {
    const doc = getInnerDoc();
    if (!doc) return;

    if (isMobile(doc)) {
      removeMobileBadge(doc);
      return;
    }

    const badge = doc.getElementById('cevMirrorBadge');
    if (!badge) return;

    const header = findHeader(doc);
    if (!header) return;

    let strip = doc.getElementById('cevMirrorStrip');
    if (!strip) {
      strip = doc.createElement('div');
      strip.id = 'cevMirrorStrip';
      doc.body.appendChild(strip);
    }

    const headerRect = header.getBoundingClientRect();
    const top = Math.max(0, Math.round(headerRect.bottom));

    strip.style.cssText = [
      'position:fixed',
      `top:${top}px`,
      'left:0',
      'right:0',
      'width:100%',
      'height:24px',
      'z-index:14500',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'box-sizing:border-box',
      'background:#0b2538',
      'border-top:1px solid rgba(255,255,255,.05)',
      'border-bottom:1px solid rgba(255,255,255,.09)',
      'box-shadow:0 3px 10px rgba(0,0,0,.12)',
      'pointer-events:none'
    ].join(';');

    if (badge.parentElement !== strip) strip.appendChild(badge);

    badge.style.cssText = [
      'position:static',
      'left:auto',
      'right:auto',
      'top:auto',
      'bottom:auto',
      'transform:none',
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'margin:0',
      'padding:0 8px',
      'border-radius:999px',
      'background:transparent',
      'color:#e9f5fb',
      'font:700 10px Segoe UI,Arial,sans-serif',
      'line-height:22px',
      'box-shadow:none',
      'white-space:nowrap',
      'pointer-events:none'
    ].join(';');
  }

  setInterval(placeBadge, 150);
  window.addEventListener('resize', placeBadge);
  document.getElementById('base')?.addEventListener('load', () => setTimeout(placeBadge, 500));
})();
