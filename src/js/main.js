/* ================================
   SETTINGS & PERSISTENCE
   ================================ */
const settings = {
  copyWithHashtag: false,
  mode: 'default',
  stepPercent: 10,
  singlePercent: 25,
  format: 'hex',
};

const loadSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('settings') || '{}');
    Object.assign(settings, saved);
  } catch {}
};
const saveSettings = () => localStorage.setItem('settings', JSON.stringify(settings));

/* ================================
   INITIALISE CORE CONTROLS
   ================================ */
const initializeSettings = () => {
  loadSettings();

  const hashtag = document.getElementById('copy-with-hashtag');
  hashtag?.addEventListener('change', () => {
    settings.copyWithHashtag = hashtag.checked;
    saveSettings();
    updateClipboardData();
  });
  if (hashtag) hashtag.checked = settings.copyWithHashtag;

  const modeSelect    = document.getElementById('mode');
  const stepWrapper   = document.getElementById('step-wrapper');
  const singleWrapper = document.getElementById('single-wrapper');
  const stepInput     = document.getElementById('step-size');
  const singleInput   = document.getElementById('single-percent');
  const formatSelect  = document.getElementById('format');

  if (modeSelect)   modeSelect.value   = settings.mode;
  if (stepInput)    stepInput.value    = settings.stepPercent;
  if (singleInput)  singleInput.value  = settings.singlePercent;
  if (formatSelect) formatSelect.value = settings.format;

  const applyModeVisibility = () => {
    if (!modeSelect || !stepWrapper || !singleWrapper) return;
    const v = modeSelect.value;
    stepWrapper.style.display   = v === 'steps'  ? '' : 'none';
    singleWrapper.style.display = v === 'single' ? '' : 'none';
  };
  applyModeVisibility();

  modeSelect?.addEventListener('change', () => {
    settings.mode = modeSelect.value;
    saveSettings();
    applyModeVisibility();
  });

  stepInput?.addEventListener('input', () => {
    const v = Math.max(1, Math.min(50, parseInt(stepInput.value || '10', 10)));
    settings.stepPercent = Number.isFinite(v) ? v : 10;
    saveSettings();
  });

  singleInput?.addEventListener('input', () => {
    const v = Math.max(1, Math.min(99, parseInt(singleInput.value || '25', 10)));
    settings.singlePercent = Number.isFinite(v) ? v : 25;
    saveSettings();
  });

  formatSelect?.addEventListener('change', () => {
    settings.format = formatSelect.value;
    saveSettings();
    updateClipboardData();
    renderCopyTips();
  });

  injectStyles();
  renderCopyTips();
};

/* ================================
   ACCESSIBILITY PANEL CONTROLS
   ================================ */
function initA11yControls() {
  if (!window.ToneMasterAccessibility) return;

  const cfg = ToneMasterAccessibility.getConfig ? ToneMasterAccessibility.getConfig() : { enabled: 'AA', bg:'#ffffff', size:'normal' };

  const enabledSel = document.getElementById('a11y-enabled');
  const bgModeSel  = document.getElementById('a11y-bg-mode');
  const bgPicker   = document.getElementById('a11y-bg-custom');
  const bgHex      = document.getElementById('a11y-bg-hex');
  const sizeSel    = document.getElementById('a11y-size');

  if (!enabledSel || !bgModeSel || !bgPicker || !bgHex || !sizeSel) return;

  enabledSel.value = cfg.enabled ?? 'AA';
  sizeSel.value    = cfg.size ?? 'normal';

  const bg = (cfg.bg || '#ffffff').toLowerCase();
  if (bg === '#000000' || bg === '#000') bgModeSel.value = 'black';
  else if (bg === '#ffffff' || bg === '#fff') bgModeSel.value = 'white';
  else { bgModeSel.value = 'custom'; bgPicker.value = bg; bgHex.value = bg; }

  const showCustom = (bgModeSel.value === 'custom');
  bgPicker.style.display = showCustom ? '' : 'none';
  bgHex.style.display    = showCustom ? '' : 'none';

  const apply = () => {
    let resolvedBg = '#ffffff';
    if (bgModeSel.value === 'white') resolvedBg = '#ffffff';
    else if (bgModeSel.value === 'black') resolvedBg = '#000000';
    else resolvedBg = (bgHex.value || bgPicker.value || '#ffffff').trim();
    if (!/^#/.test(resolvedBg)) resolvedBg = '#' + resolvedBg;

    ToneMasterAccessibility.setConfig({
      enabled: enabledSel.value,
      bg: resolvedBg,
      size: sizeSel.value
    });

    const target = document.getElementById('tonemaster');
    ToneMasterAccessibility.applyBadges({ container: target });
  };

  enabledSel.addEventListener('change', apply);
  sizeSel.addEventListener('change', apply);
  bgModeSel.addEventListener('change', () => {
    const isCustom = bgModeSel.value === 'custom';
    bgPicker.style.display = isCustom ? '' : 'none';
    bgHex.style.display    = isCustom ? '' : 'none';
    apply();
  });
  bgPicker.addEventListener('input', () => { bgHex.value = bgPicker.value; apply(); });
  bgHex.addEventListener('input', () => { bgPicker.value = bgHex.value; apply(); });

  apply();
}

/* ================================
   FORMAT & CONVERSION HELPERS
   ================================ */
const hexToRgbObj = (hexNoHash) => {
  const hex = hexNoHash.replace(/^#/, '');
  return {
    r: parseInt(hex.slice(0,2), 16),
    g: parseInt(hex.slice(2,4), 16),
    b: parseInt(hex.slice(4,6), 16),
  };
};

const rgbToHsl = ({ r, g, b }) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > .5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const formatAs = (hexNoHash, type, withHashPref = false) => {
  if (type === 'hex') {
    const v = hexNoHash.toUpperCase();
    return withHashPref ? `#${v}` : v;
  }
  if (type === 'rgb') {
    const { r, g, b } = hexToRgbObj(hexNoHash);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const { h, s, l } = rgbToHsl(hexToRgbObj(hexNoHash));
  return `hsl(${h}, ${s}%, ${l}%)`;
};

const allFormats = ['hex', 'rgb', 'hsl'];
const formatOrder = () => {
  const first = settings.format;
  return [first, ...allFormats.filter(f => f !== first)];
};

const formatForText = (hexNoHash) => formatAs(hexNoHash, settings.format, false);
const formatForClipboardDefault = (hexNoHash) =>
  settings.format === 'hex'
    ? formatAs(hexNoHash, 'hex', settings.copyWithHashtag)
    : formatAs(hexNoHash, settings.format);

/* ================================
   INPUT PARSING
   ================================ */
const parseColorValues = (str) => {
  let arr = str.match(/\b[0-9A-Fa-f]{3}\b|[0-9A-Fa-f]{6}\b/g);
  return arr ? arr.map(h => (h.length === 3 ? h.split('').map(c => c + c).join('') : h)) : arr;
};

/* ================================
   CLIPBOARD DATA REFRESH
   ================================ */
const updateClipboardData = () => {
  document.querySelectorAll("#tonemaster td.hex-color").forEach(cell => {
    const srcHex = cell.getAttribute("data-src-hex");
    if (srcHex) cell.setAttribute("data-clipboard-text", formatForClipboardDefault(srcHex));
  });
};

/* ================================
   COPY TIPS (LEGEND)
   ================================ */
const renderCopyTips = () => {
  const anchor = document.getElementById('format') || document.getElementById('mode') || document.getElementById('color-values');
  if (!anchor) return;

  let tip = document.getElementById('copy-tips');
  if (!tip) {
    tip = document.createElement('p');
    tip.id = 'copy-tips';
    tip.className = 'tm-tip';
    anchor.closest('form')?.appendChild(tip);
  }
  const [d, s, t] = formatOrder().map(f => f.toUpperCase());
  tip.innerHTML = `Tip: <strong>Click</strong> = ${d} &nbsp;•&nbsp; <strong>Shift+Click</strong> = ${s} &nbsp;•&nbsp; <strong>Alt+Click</strong> = ${t}`;
};

/* ================================
   INLINE STYLES
   ================================ */
const injectStyles = () => {
  if (document.getElementById('tm-style')) return;
  const style = document.createElement('style');
  style.id = 'tm-style';
  style.textContent = `.tm-tip { margin-top: .5rem; font-size: .9rem; opacity: .8; }`;
  document.head.appendChild(style);
};

/* ================================
   TABLE ROW BUILDERS
   ================================ */
const makeTableRowColors = (colors, displayType) => {
  let row = "<tr>";
  const [d, s, t] = formatOrder().map(f => f.toUpperCase());
  const title = `Click = ${d} • Shift+Click = ${s} • Alt+Click = ${t}`;
  colors.forEach(hex => {
    const colorHex = hex.toString(16);
    if (displayType === "colors") {
      const clip = formatForClipboardDefault(colorHex);
      row += `
        <td tabindex="0" role="button" aria-label="Color swatch"
            class="hex-color" title="${title}"
            style="background-color:#${colorHex}"
            data-src-hex="${colorHex}"
            data-clipboard-text="${clip}">
        </td>`;
    } else {
      row += `<td class="hex-value">${formatForText(colorHex)}</td>`;
    }
  });
  row += "</tr>";
  return row;
};

/* ================================
   BUILD & RENDER TABLE
   ================================ */
const createTintsAndShades = (firstTime) => {
  if (!globalThis.ToneMasterColor) {
    console.error('ToneMasterColor is missing — ensure /js/color.js loads before /js/main.js');
    return false;
  }

  const inputEl = document.getElementById("color-values");
  const parsed = parseColorValues(inputEl ? inputEl.value : "");
  if (parsed !== null) {
    const mode = document.getElementById('mode')?.value || settings.mode;

    const step = (() => {
      const el = document.getElementById("step-size");
      const v = el ? parseInt(el.value || settings.stepPercent, 10) : settings.stepPercent;
      return Math.max(1, Math.min(50, v));
    })();

    const pctSingle = (() => {
      const el = document.getElementById("single-percent");
      const v = el ? parseInt(el.value || settings.singlePercent, 10) : settings.singlePercent;
      return Math.max(1, Math.min(99, v));
    })();

    if (settings.stepPercent !== step)        { settings.stepPercent   = step;        saveSettings(); }
    if (settings.singlePercent !== pctSingle)  { settings.singlePercent = pctSingle;   saveSettings(); }
    if (settings.mode !== mode)                { settings.mode          = mode;        saveSettings(); }

    const rows = [];
    let i = 0;

    parsed.forEach(color => {
      let shades, tints;
      if (mode === 'default') {
        shades = ToneMasterColor.series(color, 10, "shade");
        tints  = ToneMasterColor.series(color, 10, "tint");
      } else if (mode === 'steps') {
        shades = ToneMasterColor.series(color, step, "shade");
        tints  = ToneMasterColor.series(color, step, "tint");
      } else {
        shades = [ToneMasterColor.shade(color, pctSingle)];
        tints  = [ToneMasterColor.tint(color,  pctSingle)];
      }

      rows[i++] = makeTableRowColors(shades, "colors");
      rows[i++] = makeTableRowColors(shades, "RGBValues");
      rows[i++] = makeTableRowColors(tints,  "colors");
      rows[i++] = makeTableRowColors(tints,  "RGBValues");
    });

    const headersHtml = (() => {
      if (mode === 'single') return `<td><span>${pctSingle}%</span></td>`;
      const useStep = mode === 'steps' ? step : 10;
      const cells = [];
      for (let p = 0; p <= 90; p += useStep) cells.push(`<td><span>${p}%</span></td>`);
      cells.push(`<td><span>100%</span></td>`);
      return cells.join("");
    })();

    const table = `<table><thead><tr class="table-header">${headersHtml}</tr></thead>${rows.join("")}</table>`;
    const target = document.getElementById("tonemaster");
    target.innerHTML = table;

    if (window.ToneMasterAccessibility) {
      ToneMasterAccessibility.applyBadges({ container: target });
    }

    bindCellInteractions();

    window.location.hash = parsed.join(",");
    const scrollElement = document.getElementById("scroll-top");
    if (scrollElement) smoothScrollTo(scrollElement, 500);
    setTimeout(() => { target.setAttribute("tabindex", "0"); target.focus(); });
    target.addEventListener("blur", () => target.setAttribute("tabindex", "-1"));
  } else if (!firstTime) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById("tonemaster").innerHTML = "";
    window.location.hash = "";
    const warn = document.getElementById("warning");
    warn.classList.add("visible");
    setTimeout(() => warn.classList.remove("visible"), 3000);
    document.getElementById("color-values").focus();
  }
  return false;
};

/* ================================
   CELL COPY INTERACTIONS
   ================================ */
const bindCellInteractions = () => {
  const ladder = document.getElementById('tonemaster');
  if (!ladder) return;

  ladder.addEventListener('click', (e) => {
    const cell = e.target.closest('td.hex-color');
    if (!cell) return;

    const srcHex = cell.getAttribute('data-src-hex');
    if (!srcHex) return;

    const order = formatOrder();
    let chosen = order[0];
    if (e.altKey) chosen = order[2];
    else if (e.shiftKey) chosen = order[1];

    const text = chosen === 'hex'
      ? formatAs(srcHex, 'hex', settings.copyWithHashtag)
      : formatAs(srcHex, chosen);

    cell.setAttribute('data-clipboard-text', text);
  }, true);
};

/* ================================
   SMOOTH SCROLL
   ================================ */
const smoothScrollTo = (element, duration) => {
  const targetPos = element.getBoundingClientRect().top + window.scrollY;
  const startPos = window.scrollY;
  const distance = targetPos - startPos;
  let startTime = null;

  const ease = (t, b, c, d) => {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
  };

  const anim = (currentTime) => {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const run = ease(timeElapsed, startPos, distance, duration);
    window.scrollTo(0, run);
    if (timeElapsed < duration) requestAnimationFrame(anim);
  };

  requestAnimationFrame(anim);
};

/* ================================
   BOOTSTRAP
   ================================ */
document.addEventListener("DOMContentLoaded", () => {
  initializeSettings();
  initA11yControls();

  const colorValuesElement = document.getElementById("color-values");
  if (colorValuesElement) {
    colorValuesElement.value = window.location.hash.slice(1).replace(/,/g, " ");
  }

  createTintsAndShades(true);

  document.getElementById("color-entry-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    createTintsAndShades();
  });
});

document.addEventListener("keypress", (event) => {
  if (event.key === "Enter") document.activeElement.click();
});

document.addEventListener('click', (event) => {
  if (event.target.id === 'make') {
    if (!document.getElementById("carbonads")) return;
    if (typeof _carbonads !== 'undefined') _carbonads.refresh();
  }
});
