// src/js/accessibility-checker.js
(function (global) {
  // -------- state & defaults --------
  const STORE_KEY = 'a11ySettings';
  const defaults = {
    enabled: 'off',     // 'off' | 'AA' | 'AAA'
    bg: '#ffffff',      // background colour
    size: 'normal',     // 'normal' | 'large'
    target: 'text',     // reserved for future (e.g. 'ui' 3:1)
  };
  const cfg = { ...defaults, ...load() };
  const lumCache = Object.create(null);

  // -------- public API --------
  const API = {
    setConfig, getConfig,
    applyBadges,
    // exposed for tests/exports
    luminance, contrast, evaluate, levelForContrast,
  };
  global.ToneMasterAccessibility = API;

  // -------- config --------
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
  }
  function save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(cfg));
  }
  function setConfig(partial) {
    Object.assign(cfg, partial || {});
    save();
  }
  function getConfig() {
    return { ...cfg };
  }

  // -------- maths (WCAG 2.x) --------
  function hexToRgb(hex) {
    const h = hex.replace(/^#/, '').toLowerCase();
    const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    return {
      r: parseInt(v.slice(0,2), 16),
      g: parseInt(v.slice(2,4), 16),
      b: parseInt(v.slice(4,6), 16),
    };
  }

  function channelToLin(c8) {
    const c = c8 / 255;
    return (c <= 0.04045) ? (c / 12.92) : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function luminance(hex) {
    const key = hex.startsWith('#') ? hex.toLowerCase() : ('#' + hex.toLowerCase());
    if (lumCache[key] != null) return lumCache[key];
    const { r, g, b } = hexToRgb(key);
    const L = 0.2126 * channelToLin(r) + 0.7152 * channelToLin(g) + 0.0722 * channelToLin(b);
    lumCache[key] = L;
    return L;
  }

  function contrast(fgHex, bgHex) {
    const L1 = luminance(fgHex);
    const L2 = luminance(bgHex);
    const [hi, lo] = L1 >= L2 ? [L1, L2] : [L2, L1];
    return (hi + 0.05) / (lo + 0.05);
  }

  // Returns 'AAA' | 'AA' | 'FAIL' for given ratio and size
  function levelForContrast(ratio, size = cfg.size) {
    const isLarge = (size === 'large');
    if (isLarge) {
      if (ratio >= 4.5) return 'AAA';
      if (ratio >= 3)   return 'AA';
      return 'FAIL';
    } else {
      if (ratio >= 7)   return 'AAA';
      if (ratio >= 4.5) return 'AA';
      return 'FAIL';
    }
  }

  // Evaluate a single foreground hex against current config
  function evaluate(fgHex) {
    const ratio = contrast(fgHex, cfg.bg);
    const level = levelForContrast(ratio, cfg.size);
    const passAgainstTarget =
      cfg.enabled === 'AAA' ? (level === 'AAA')
    : cfg.enabled === 'AA'  ? (level === 'AA' || level === 'AAA')
    : null; // 'off' ⇒ not applicable
    return { ratio, level, passAgainstTarget };
  }

  // -------- DOM rendering --------
  function injectStyles() {
    if (document.getElementById('tm-a11y-style')) return;
    const style = document.createElement('style');
    style.id = 'tm-a11y-style';
    style.textContent = `
      td.hex-color { position: relative; }
      .tm-a11y-badge {
        position: absolute; top: 4px; right: 4px;
        font: 600 10px/1 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        padding: 3px 5px; border-radius: 6px;
        background: rgba(0,0,0,.55); color: #fff;
        pointer-events: none; user-select: none;
      }
      .tm-a11y-badge.fail  { background: rgba(190, 20, 20, .75); }
      .tm-a11y-badge.aa    { background: rgba(18, 132, 48, .75); }
      .tm-a11y-badge.aaa   { background: rgba(9, 94, 201, .80); }
    `;
    document.head.appendChild(style);
  }

  function applyBadges({ container } = {}) {
    injectStyles();

    if (cfg.enabled === 'off') {
      (container || document).querySelectorAll('.tm-a11y-badge').forEach(n => n.remove());
      return;
    }

    const root = container || document;
    const cells = root.querySelectorAll('#tonemaster td.hex-color');
    cells.forEach(cell => {
      const hex = cell.getAttribute('data-src-hex');
      if (!hex || hex.length !== 6) return;

      const { ratio, level } = evaluate('#' + hex);
      const ratioStr = ratio.toFixed(2) + ':1';
      const title = `${ratioStr} vs ${cfg.bg.toUpperCase()} (${cfg.size})`;

      let badge = cell.querySelector('.tm-a11y-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'tm-a11y-badge';
        cell.appendChild(badge);
      }

      badge.classList.remove('fail', 'aa', 'aaa');
      if (level === 'AAA') {
        badge.classList.add('aaa');
        badge.textContent = 'AAA';
      } else if (level === 'AA') {
        badge.classList.add('aa');
        badge.textContent = 'AA';
      } else {
        badge.classList.add('fail');
        badge.textContent = '×';
      }
      badge.setAttribute('title', title);
    });
  }
})(window);
