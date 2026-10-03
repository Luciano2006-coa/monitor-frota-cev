(() => {
  const MOBILE_MAX = 820;
  const touchDevice = /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  const STRIP_ID = 'cevMirrorOuterStrip';
  const AGE_ID = 'cevMirrorOuterAge';
  let lockedTop = null;

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

  function hideInnerBadge(doc) {
    const badge = doc?.getElementById('cevMirrorBadge');
    if (!badge) return null;
    badge.style.setProperty('display', 'none', 'important');
    badge.style.setProperty('visibility', 'hidden', 'important');
    badge.style.setProperty('pointer-events', 'none', 'important');
    return badge;
  }

  function removeStrip() {
    document.getElementById(STRIP_ID)?.remove();
    lockedTop = null;
  }

  function readParts(sourceBadge) {
    const raw = String(sourceBadge?.textContent || '').trim();
    const age = raw.match(/contato\s+(há\s+[^•]+)/i)?.[1]?.trim() || 'há 0s';
    const pieces = raw.split('•').map(s => s.trim()).filter(Boolean);
    const viewer = pieces.length >= 3 ? pieces[2] : 'visualização';
    const mode = pieces.length >= 4 ? pieces[3] : 'visualização';
    return { age, viewer, mode };
  }

  function calculateTop(doc) {
    const header = findHeader(doc);
    if (!header) return null;
    const h = Math.round(header.getBoundingClientRect().height || header.offsetHeight || 0);
    if (!h) return null;
    return Math.max(0, h);
  }

  function createLockedStrip(doc, sourceBadge) {
    if (document.getElementById(STRIP_ID)) return document.getElementById(STRIP_ID);

    if (lockedTop == null) lockedTop = calculateTop(doc);
    if (lockedTop == null) return null;

    const { age, viewer, mode } = readParts(sourceBadge);
    const strip = document.createElement('div');
    strip.id = STRIP_ID;
    strip.innerHTML = `<span class="cev-mirror-dot">●</span>&nbsp; Espelho online &nbsp;•&nbsp; contato <span id="${AGE_ID}">${age}</span> &nbsp;•&nbsp; <span class="cev-mirror-viewer">${viewer}</span> &nbsp;•&nbsp; <span class="cev-mirror-mode">${mode}</span>`;

    strip.style.setProperty('position', 'fixed', 'important');
    strip.style.setProperty('top', `${lockedTop}px`, 'important');
    strip.style.setProperty('left', '0', 'important');
    strip.style.setProperty('right', '0', 'important');
    strip.style.setProperty('width', '100%', 'important');
    strip.style.setProperty('height', '24px', 'important');
    strip.style.setProperty('display', 'flex', 'important');
    strip.style.setProperty('align-items', 'center', 'important');
    strip.style.setProperty('justify-content', 'center', 'important');
    strip.style.setProperty('box-sizing', 'border-box', 'important');
    strip.style.setProperty('z-index', '2147483647', 'important');
    strip.style.setProperty('background', '#0b2538', 'important');
    strip.style.setProperty('border-top', '1px solid rgba(255,255,255,.05)', 'important');
    strip.style.setProperty('border-bottom', '1px solid rgba(255,255,255,.09)', 'important');
    strip.style.setProperty('box-shadow', '0 3px 10px rgba(0,0,0,.12)', 'important');
    strip.style.setProperty('color', '#e9f5fb', 'important');
    strip.style.setProperty('font', '700 10px Segoe UI,Arial,sans-serif', 'important');
    strip.style.setProperty('line-height', '24px', 'important');
    strip.style.setProperty('white-space', 'nowrap', 'important');
    strip.style.setProperty('pointer-events', 'none', 'important');
    strip.style.setProperty('transform', 'none', 'important');
    strip.style.setProperty('margin', '0', 'important');

    document.documentElement.appendChild(strip);
    return strip;
  }

  function ensureLocked() {
    const doc = getInnerDoc();
    if (!doc) return;
    const sourceBadge = hideInnerBadge(doc);

    if (isMobile(doc)) {
      removeStrip();
      return;
    }

    if (!sourceBadge) return;
    createLockedStrip(doc, sourceBadge);
  }

  function updateTimeOnly() {
    const doc = getInnerDoc();
    if (!doc) return;
    const sourceBadge = hideInnerBadge(doc);

    if (isMobile(doc)) {
      removeStrip();
      return;
    }

    const strip = document.getElementById(STRIP_ID) || createLockedStrip(doc, sourceBadge);
    if (!strip || !sourceBadge) return;

    const { age } = readParts(sourceBadge);
    const ageEl = document.getElementById(AGE_ID);
    if (ageEl && ageEl.textContent !== age) ageEl.textContent = age;
  }

  function relockOnResize() {
    const doc = getInnerDoc();
    if (!doc || isMobile(doc)) {
      removeStrip();
      return;
    }
    const newTop = calculateTop(doc);
    if (newTop == null) return;
    lockedTop = newTop;
    const strip = document.getElementById(STRIP_ID);
    if (strip) strip.style.setProperty('top', `${lockedTop}px`, 'important');
  }

  setInterval(updateTimeOnly, 500);
  window.addEventListener('resize', relockOnResize, { passive: true });
  document.getElementById('base')?.addEventListener('load', () => {
    removeStrip();
    setTimeout(ensureLocked, 700);
  });
  setTimeout(ensureLocked, 500);
})();
