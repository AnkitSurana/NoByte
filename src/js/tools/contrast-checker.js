// WCAG contrast checker — relative luminance per WCAG 2.x (shared core in lib).
import { contrastRatio as ratio } from "/js/lib/wcag.js";

const fg = document.getElementById("cc-fg");
const bg = document.getElementById("cc-bg");
const fgHex = document.getElementById("cc-fg-hex");
const bgHex = document.getElementById("cc-bg-hex");
const preview = document.getElementById("cc-preview");

const isHex = (s) => /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s.trim());
const norm = (s) => { let v = s.trim().replace(/^#/, ""); if (v.length === 3) v = v.split("").map((c) => c + c).join(""); return "#" + v.toUpperCase(); };

function verdict(el, pass) {
  el.className = `badge ${pass ? "badge--ok" : "badge--danger"}`;
  el.textContent = pass ? "Pass" : "Fail";
}

function update() {
  const f = norm(fg.value), b = norm(bg.value);
  const r = ratio(f, b);
  document.getElementById("cc-ratio").textContent = `${r.toFixed(2)}:1`;
  preview.style.background = b;
  preview.style.color = f;
  verdict(document.getElementById("cc-aa"), r >= 4.5);
  verdict(document.getElementById("cc-aa-lg"), r >= 3);
  verdict(document.getElementById("cc-aaa"), r >= 7);
  verdict(document.getElementById("cc-aaa-lg"), r >= 4.5);
  if (document.activeElement !== fgHex) fgHex.value = f;
  if (document.activeElement !== bgHex) bgHex.value = b;
}

fg.addEventListener("input", update);
bg.addEventListener("input", update);
fgHex.addEventListener("input", () => { if (isHex(fgHex.value)) { fg.value = norm(fgHex.value).toLowerCase(); fgHex.classList.remove("input--invalid"); update(); } else fgHex.classList.add("input--invalid"); });
bgHex.addEventListener("input", () => { if (isHex(bgHex.value)) { bg.value = norm(bgHex.value).toLowerCase(); bgHex.classList.remove("input--invalid"); update(); } else bgHex.classList.add("input--invalid"); });
document.getElementById("cc-swap").addEventListener("click", () => { const t = fg.value; fg.value = bg.value; bg.value = t; update(); });
update();
