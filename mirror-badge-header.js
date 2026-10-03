(() => {
  const MOBILE_MAX = 820;
  const touchDevice = /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  const OUTER_STRIP_ID = 'cevMirrorOuterStrip';
  const OUTER_TEXT_ID = 'cevMirrorOuterText';

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
    return doc.querySelector('header') ||
           doc.querySelector('.cev-topbar')?.closest('header') ||
           doc.querySelector('.cev-premium-wrap');
  }

  function removeOuterStrip() {
    document.getElementById(OUTER_STRIP_ID)?.remove();
  }

  function hideInnerBadge(doc) {
    const badge = doc?.getElementById('cevMirrorBadge');
    if (!badge) return null;
    badge.style.setProperty('display', 'none', 'important');
    badge.style.setProperty('pointer-events', 'none', 'important');
    return badge;
  }

  function ensureOuterStrip() {
    let strip = document.getElementById(OUTER_STRIP_ID);
    if (!strip) {
      strip = document.createElement('div');
      strip.id = OUTER_STRIP_ID;
      const text = document.createElement('span');
      text.id = OUTER_TEXT_ID;
      strip.appendChild(text);
      document.body.appendChild(strip);
    }
    return strip;
  }

  function placeBadge() {
    const doc = getInnerDoc();
    if (!doc) return;

    const sourceBadge = hideInnerBadge(doc);

    if (isMobile(doc)) {
      removeOuterStrip();
      return;
    }

    if (!sourceBadge) return;

    const header = findHeader(doc);
    if (!header) return;

    /*
      A faixa é criada no documento EXTERNO, e não dentro do painel que rola.
      O topo usa somente a altura física do cabeçalho; nunca usa
      getBoundingClientRect().bottom, que varia com a rolagem/sticky.
    */
    const headerStyle = doc.defaultView?.getComputedStyle(header);
    const headerTop = Math.max(0, parseFloat(headerStyle?.top) || 0);
    const top = Math.max(0, Math.round(headerTop + header.offsetHeight));

    const strip = ensureOuterStrip();
    const text = strip.querySelector('#' + OUTER_TEXT_ID);
    if (text) text.textContent = sourceBadge.textContent || '● Espelho online';

    const stale = String(sourceBadge.textContent || '').trim().startsWith('⚠');

    strip.style.cssText = [
      'position:fixed',
      `top:${top}px`,
      'left:0',
      'right:0',
      'width:100%',
      'height:24px',
      'z-index:2147483000',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'box-sizing:border-box',
      `background:${stale ? '#7a3b10' : '#0b2538'}`,
      'border-top:1px solid rgba(255,255,255,.05)',
      'border-bottom:1px solid rgba(255,255,255,.09)',
      'box-shadow:0 3px 10px rgba(0,0,0,.12)',
      'pointer-events:none',
      'transform:translateZ(0)',
      'will-change:transform'
    ].join(';');

    if (text) {
      text.style.cssText = [
        'display:inline-flex',
        'align-items:center',
        'justify-content:center',
        'margin:0',
        'padding:0 8px',
        'color:#e9f5fb',
        'font:700 10px Segoe UI,Arial,sans-serif',
        'line-height:22px',
        'white-space:nowrap',
        'pointer-events:none'
      ].join(';');
    }
  }

  setInterval(placeBadge, 200);
  window.addEventListener('resize', placeBadge, { passive: true });
  document.getElementById('base')?.addEventListener('load', () => setTimeout(placeBadge, 500));
  setTimeout(placeBadge, 300);
})();
