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

  function isMobile() {
    return touchDevice || window.innerWidth <= MOBILE_MAX || matchMedia('(max-width:820px)').matches;
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

    if (isMobile()) {
      removeMobileBadge(doc);
      return;
    }

    const badge = doc.getElementById('cevMirrorBadge');
    if (!badge) return;

    const header = findHeader(doc);
    if (!header || !header.parentNode) return;

    let strip = doc.getElementById('cevMirrorStrip');
    if (!strip) {
      strip = doc.createElement('div');
      strip.id = 'cevMirrorStrip';
      header.insertAdjacentElement('afterend', strip);
    }

    const headerHeight = Math.max(0, Math.round(header.getBoundingClientRect().height));
    strip.style.cssText = [
      'position:sticky',
      `top:${headerHeight}px`,
      'z-index:9000',
      'height:24px',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:#0b2538',
      'border-bottom:1px solid rgba(255,255,255,.08)',
      'box-shadow:0 3px 10px rgba(0,0,0,.10)',
      'pointer-events:none'
    ].join(';');

    if (badge.parentElement !== strip) strip.appendChild(badge);

    badge.style.cssText = [
      'position:static',
      'transform:none',
      'display:inline-flex',
      'align-items:center',
      'margin:0',
      'padding:0 8px',
      'border-radius:999px',
      'background:transparent',
      'color:#e9f5fb',
      'font:700 10px Segoe UI,Arial,sans-serif',
      'line-height:24px',
      'box-shadow:none',
      'white-space:nowrap',
      'pointer-events:none'
    ].join(';');
  }

  setInterval(placeBadge, 150);
  window.addEventListener('resize', placeBadge);
  document.getElementById('base')?.addEventListener('load', () => setTimeout(placeBadge, 500));
})();
