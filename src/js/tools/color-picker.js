// Color picker — HEX / RGB / HSL, all local.
import { copyText } from "/js/ui.js";

const preview = document.getElementById("cp-preview");
const colorInput = document.getElementById("cp-input");
const hexEdit = document.getElementById("cp-hex-edit");
const swatchWrap = document.getElementById("cp-swatches");

const PRESETS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#111827", "#6b7280", "#ffffff"];

function hexToRgb(hex) {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) };
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
const isHex = (s) => /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s.trim());
const norm = (s) => {
  let v = s.trim().replace(/^#/, "");
  if (v.length === 3) v = v.split("").map((c) => c + c).join("");
  return "#" + v.toUpperCase();
};

const fmt = {};
function update(hex) {
  const H = norm(hex);
  const { r, g, b } = hexToRgb(H);
  const { h, s, l } = rgbToHsl(r, g, b);
  fmt.hex = H;
  fmt.rgb = `rgb(${r}, ${g}, ${b})`;
  fmt.hsl = `hsl(${h}, ${s}%, ${l}%)`;
  preview.style.background = H;
  colorInput.value = H.toLowerCase();
  if (document.activeElement !== hexEdit) hexEdit.value = H;
  hexEdit.classList.remove("input--invalid");
  document.querySelectorAll("[data-fmt]").forEach((el) => (el.textContent = fmt[el.dataset.fmt]));
}

colorInput.addEventListener("input", () => update(colorInput.value));
hexEdit.addEventListener("input", () => {
  if (isHex(hexEdit.value)) update(hexEdit.value);
  else hexEdit.classList.add("input--invalid");
});

PRESETS.forEach((c) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "swatch";
  b.style.background = c;
  b.setAttribute("aria-label", c);
  b.addEventListener("click", () => update(c));
  swatchWrap.appendChild(b);
});

document.querySelectorAll("[data-copy-fmt]").forEach((btn) => {
  btn.addEventListener("click", () => copyText(fmt[btn.dataset.copyFmt], btn));
});

update("#2563eb");
