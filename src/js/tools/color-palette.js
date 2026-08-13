// Color palette generator — tint/shade scale + hue harmonies from a base color.
import { toast } from "/js/ui.js";

const picker = document.getElementById("pl-picker");
const hexEl = document.getElementById("pl-hex");
const errEl = document.getElementById("pl-error");
const scaleEl = document.getElementById("pl-scale");
const harmonyEl = document.getElementById("pl-harmony");

/* ---- colour maths ---- */
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const toHex2 = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
const rgbToHex = (r, g, b) => `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`.toUpperCase();

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  const d = max - min;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 1); l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

// Readable text colour for a swatch, from perceived luminance.
function textOn(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#1D1A16" : "#FFF8EC";
}

/* ---- swatches ---- */
function swatch(hex, tag) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "pal-swatch";
  el.dataset.hex = hex;
  el.innerHTML = `<span class="pal-swatch__color" style="background:${hex};color:${textOn(hex)}">${tag ? `<span class="pal-swatch__tag">${tag}</span>` : ""}</span><span class="pal-swatch__hex">${hex}</span>`;
  return el;
}

function render() {
  const rgb = hexToRgb(hexEl.value);
  if (!rgb) { errEl.textContent = "Enter a 6-digit hex color, like #2563EB."; return; }
  errEl.textContent = "";
  const { h, s } = rgbToHsl(rgb);
  const baseHex = rgbToHex(rgb.r, rgb.g, rgb.b);

  // Lightness scale, base marked. Saturation eases off at the extremes so the
  // lightest and darkest steps do not look muddy.
  const steps = [0.94, 0.85, 0.75, 0.64, 0.52, 0.42, 0.32, 0.22, 0.14];
  scaleEl.innerHTML = "";
  steps.forEach((l) => {
    const sat = s * (l > 0.85 || l < 0.2 ? 0.85 : 1);
    const hex = hslToHex(h, sat, l);
    scaleEl.appendChild(swatch(hex));
  });

  const { l } = rgbToHsl(rgb);
  const harmonies = [
    ["Base", baseHex],
    ["Complementary", hslToHex(h + 180, s, l)],
    ["Analogous", hslToHex(h - 30, s, l)],
    ["Analogous", hslToHex(h + 30, s, l)],
    ["Triadic", hslToHex(h + 120, s, l)],
    ["Triadic", hslToHex(h + 240, s, l)],
  ];
  harmonyEl.innerHTML = "";
  harmonies.forEach(([tag, hex]) => harmonyEl.appendChild(swatch(hex, tag)));
}

/* ---- inputs stay in sync ---- */
function setHex(hex) {
  hexEl.value = hex.toUpperCase();
  const rgb = hexToRgb(hex);
  if (rgb) picker.value = rgbToHex(rgb.r, rgb.g, rgb.b).toLowerCase();
  render();
}
picker.addEventListener("input", () => setHex(picker.value));
hexEl.addEventListener("input", () => {
  let v = hexEl.value.trim();
  if (v && !v.startsWith("#")) v = "#" + v;
  const rgb = hexToRgb(v);
  if (rgb) picker.value = v.toLowerCase();
  render();
});

// Click a swatch to copy its hex.
document.addEventListener("click", (e) => {
  const sw = e.target.closest(".pal-swatch");
  if (!sw) return;
  navigator.clipboard.writeText(sw.dataset.hex).then(
    () => toast(`Copied ${sw.dataset.hex}`, "info", 1600),
    () => toast("Could not copy", "error")
  );
});

render();
