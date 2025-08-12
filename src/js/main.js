// User settings (persisted)
const settings = {
  copyWithHashtag: false,
  mode: 'default',     // 'default' | 'steps' | 'single'
  stepPercent: 10,     // used in 'steps'
  singlePercent: 25,   // used in 'single'
};

const loadSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('settings') || '{}');
    Object.assign(settings, saved);
  } catch {}
};

const saveSettings = () => localStorage.setItem('settings', JSON.stringify(settings));

// Initialise UI controls from settings
const initializeSettings = () => {
  loadSettings();

  const hashtag = document.getElementById('copy-with-hashtag');
  if (hashtag) {
    hashtag.checked = settings.copyWithHashtag;
    hashtag.addEventListener('change', () => {
      settings.copyWithHashtag = hashtag.checked;
      saveSettings();
      updateClipboardData();
    });
  }

  const modeSelect = document.getElementById('mode');
  const stepWrapper = document.getElementById('step-wrapper');
  const singleWrapper = document.getElementById('single-wrapper');
  const stepInput = document.getElementById('step-size');
  const singleInput = document.getElementById('single-percent');

  // Apply persisted values
  if (modeSelect) modeSelect.value = settings.mode;
  if (stepInput) stepInput.value = settings.stepPercent;
  if (singleInput) singleInput.value = settings.singlePercent;

  // Show/hide rows based on mode
  const applyModeVisibility = () => {
    if (!modeSelect || !stepWrapper || !singleWrapper) return;
    if (modeSelect.value === 'steps') {
      stepWrapper.style.display = '';
      singleWrapper.style.display = 'none';
    } else if (modeSelect.value === 'single') {
      stepWrapper.style.display = 'none';
      singleWrapper.style.display = '';
    } else {
      stepWrapper.style.display = 'none';
      singleWrapper.style.display = 'none';
    }
  };
  applyModeVisibility();

  if (modeSelect) {
    modeSelect.addEventListener('change', () => {
      settings.mode = modeSelect.value;
      saveSettings();
      applyModeVisibility();
    });
  }

  if (stepInput) {
    stepInput.addEventListener('input', () => {
      const v = Math.max(1, Math.min(50, parseInt(stepInput.value || '10', 10)));
      settings.stepPercent = Number.isFinite(v) ? v : 10;
      saveSettings();
    });
  }

  if (singleInput) {
    singleInput.addEventListener('input', () => {
      const v = Math.max(1, Math.min(99, parseInt(singleInput.value || '25', 10)));
      settings.singlePercent = Number.isFinite(v) ? v : 25;
      saveSettings();
    });
  }
};

document.addEventListener('DOMContentLoaded', initializeSettings);

// Parse hex values (supports 3/6 chars)
const parseColorValues = (str) => {
  let arr = str.match(/\b[0-9A-Fa-f]{3}\b|[0-9A-Fa-f]{6}\b/g);
  if (arr) {
    arr = arr.map(h => (h.length === 3 ? h.split('').map(c => c + c).join('') : h));
  }
  return arr;
};

const updateClipboardData = () => {
  document.querySelectorAll("#tonemaster td[data-clipboard-text]").forEach(cell => {
    const code = cell.getAttribute("data-clipboard-text");
    cell.setAttribute(
      "data-clipboard-text",
      settings.copyWithHashtag
        ? (code.startsWith('#') ? code : `#${code}`)
        : code.replace(/^#/, '')
    );
  });
};

// Row builder
const makeTableRowColors = (colors, displayType) => {
  let row = "<tr>";
  colors.forEach(hex => {
    const colorHex = hex.toString(16);
    if (displayType === "colors") {
      const prefix = settings.copyWithHashtag ? "#" : "";
      row += `<td tabindex="0" role="button" aria-label="Color swatch" class="hex-color" style="background-color:#${colorHex}" data-clipboard-text="${prefix}${colorHex}"></td>`;
    } else {
      row += `<td class="hex-value">${colorHex.toUpperCase()}</td>`;
    }
  });
  row += "</tr>";
  return row;
};

// Build table
const createTintsAndShades = (firstTime) => {
  // Guard: maths must be loaded
  if (!globalThis.ToneMasterColor) {
    console.error('ToneMasterColor is missing — ensure /js/color.js loads before /js/main.js');
    return false;
  }

  const inputEl = document.getElementById("color-values");
  const parsed = parseColorValues(inputEl ? inputEl.value : "");
  if (parsed !== null) {
    // Resolve mode + inputs
    const modeSelect = document.getElementById('mode');
    const mode = modeSelect ? modeSelect.value : settings.mode;

    const stepInput = document.getElementById("step-size");
    const step = stepInput
      ? Math.max(1, Math.min(50, parseInt(stepInput.value || settings.stepPercent, 10)))
      : settings.stepPercent;

    const singleInput = document.getElementById("single-percent");
    const pctSingle = singleInput
      ? Math.max(1, Math.min(99, parseInt(singleInput.value || settings.singlePercent, 10)))
      : settings.singlePercent;

    // Keep settings in sync if user typed directly
    if (settings.stepPercent !== step) { settings.stepPercent = step; saveSettings(); }
    if (settings.singlePercent !== pctSingle) { settings.singlePercent = pctSingle; saveSettings(); }
    if (settings.mode !== mode) { settings.mode = mode; saveSettings(); }

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
      } else { // 'single'
        shades = [ToneMasterColor.shade(color, pctSingle)];
        tints  = [ToneMasterColor.tint(color,  pctSingle)];
      }

      rows[i++] = makeTableRowColors(shades, "colors");
      rows[i++] = makeTableRowColors(shades, "RGBValues");
      rows[i++] = makeTableRowColors(tints,  "colors");
      rows[i++] = makeTableRowColors(tints,  "RGBValues");
    });

    // Headers
    let headersHtml = "";
    if (mode === 'single') {
      headersHtml = `<td><span>${pctSingle}%</span></td>`;
    } else {
      const useStep = (mode === 'steps') ? step : 10;
      const headerCells = [];
      for (let p = 0; p <= 90; p += useStep) headerCells.push(`<td><span>${p}%</span></td>`);
      headerCells.push(`<td><span>100%</span></td>`);
      headersHtml = headerCells.join("");
    }

    const table = `<table><thead><tr class="table-header">${headersHtml}</tr></thead>${rows.join("")}</table>`;

    // Render
    const target = document.getElementById("tonemaster");
    target.innerHTML = table;

    // Update URL hash with colours (leave mode/step out for now)
    window.location.hash = parsed.join(",");

    // Smooth scroll
    const scrollElement = document.getElementById("scroll-top");
    if (scrollElement) smoothScrollTo(scrollElement, 500);

    // Focus management
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

// Smooth scroll util
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

// DOM ready
document.addEventListener("DOMContentLoaded", () => {
  // Prefill from URL hash
  const colorValuesElement = document.getElementById("color-values");
  if (colorValuesElement) {
    colorValuesElement.value = window.location.hash.slice(1).replace(/,/g, " ");
  }

  createTintsAndShades(true);

  // Form submit
  const form = document.getElementById("color-entry-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      createTintsAndShades();
    });
  }
});

// Enter key -> click
document.addEventListener("keypress", (event) => {
  if (event.key === "Enter") document.activeElement.click();
});

// Carbon ads refresh hook
document.addEventListener('click', (event) => {
  if (event.target.id === 'make') {
    if (!document.getElementById("carbonads")) return;
    if (typeof _carbonads !== 'undefined') _carbonads.refresh();
  }
});
