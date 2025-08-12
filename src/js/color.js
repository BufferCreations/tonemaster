// src/js/color.js
(function (root) {
  // --- helpers ---
  const pad = (n, len = 2) => n.toString(16).padStart(len, "0");
  const clamp255 = v => Math.min(255, Math.max(0, Math.round(v)));

  function hexToRgb(hex) {
    const h = hex.replace(/^#/, "");
    const v = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    return {
      red: parseInt(v.slice(0, 2), 16),
      green: parseInt(v.slice(2, 4), 16),
      blue: parseInt(v.slice(4, 6), 16),
    };
  }

  function rgbToHex({ red, green, blue }) {
    return pad(clamp255(red)) + pad(clamp255(green)) + pad(clamp255(blue));
  }

  // --- edelstone parity maths ---
  // percent is 0–100 (e.g. 10 => 10%)
  function shade(hex, percent) {
    const i = percent / 10; // original tool uses 10% increments internally
    const { red, green, blue } = hexToRgb(hex);
    return rgbToHex({
      red: red * (1 - 0.1 * i),
      green: green * (1 - 0.1 * i),
      blue: blue * (1 - 0.1 * i),
    });
  }

  function tint(hex, percent) {
    const i = percent / 10;
    const { red, green, blue } = hexToRgb(hex);
    return rgbToHex({
      red: red + (255 - red) * i * 0.1,
      green: green + (255 - green) * i * 0.1,
      blue: blue + (255 - blue) * i * 0.1,
    });
  }

  // Generate a ladder from 0→100 using a step (default 10 for exact parity)
  function series(hex, step = 10, mode = "shade") {
    const out = [];
    for (let p = 0; p <= 90; p += step) {
      out.push(mode === "shade" ? shade(hex, p) : tint(hex, p));
    }
    out.push(mode === "shade" ? "000000" : "ffffff"); // keep last cell as in original
    return out;
  }

  // Export globally in any JS environment
  root.ToneMasterColor = {
    hexToRgb,
    rgbToHex,
    shade,
    tint,
    series,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
