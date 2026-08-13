// Image resizer — pixels or percent, optional aspect lock. All local.
import { initDropzone, humanBytes, download, toast, debounce } from "/js/ui.js";

let bitmap = null, sourceFile = null, outBlob = null;
let mode = "px";
const w = document.getElementById("ir-w");
const h = document.getElementById("ir-h");
const lock = document.getElementById("ir-lock");
const pct = document.getElementById("ir-pct");
const pctVal = document.getElementById("ir-pct-val");
const format = document.getElementById("ir-format");
const preview = document.getElementById("ir-preview");
const dlBtn = document.getElementById("ir-download");

initDropzone(document.getElementById("ir-drop"), async (files) => {
  const f = files[0];
  if (!f.type.startsWith("image/")) return toast("Choose an image file.", "error");
  sourceFile = f;
  bitmap = await createImageBitmap(f);
  document.getElementById("ir-info").textContent = `${f.name} · ${bitmap.width}×${bitmap.height} · ${humanBytes(f.size)}`;
  w.value = bitmap.width; h.value = bitmap.height;
  render();
}, { accept: "image/*" });

function targetSize() {
  if (!bitmap) return { tw: 0, th: 0 };
  if (mode === "pct") {
    const s = Number(pct.value) / 100;
    return { tw: Math.max(1, Math.round(bitmap.width * s)), th: Math.max(1, Math.round(bitmap.height * s)) };
  }
  return { tw: Math.max(1, parseInt(w.value) || 1), th: Math.max(1, parseInt(h.value) || 1) };
}

const render = debounce(async () => {
  if (!bitmap) return;
  const { tw, th } = targetSize();
  const canvas = document.createElement("canvas");
  canvas.width = tw; canvas.height = th;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  if (format.value === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, tw, th); }
  ctx.drawImage(bitmap, 0, 0, tw, th);
  outBlob = await new Promise((r) => canvas.toBlob(r, format.value, 0.92));
  preview.src = URL.createObjectURL(outBlob);
  preview.classList.remove("hidden");
  document.getElementById("ir-out-info").textContent = `${tw}×${th} · ${humanBytes(outBlob.size)}`;
  dlBtn.disabled = false;
}, 150);

w.addEventListener("input", () => {
  if (lock.checked && bitmap) h.value = Math.round((parseInt(w.value) || 1) * (bitmap.height / bitmap.width));
  render();
});
h.addEventListener("input", () => {
  if (lock.checked && bitmap) w.value = Math.round((parseInt(h.value) || 1) * (bitmap.width / bitmap.height));
  render();
});
pct.addEventListener("input", () => { pctVal.textContent = `${pct.value}%`; render(); });
format.addEventListener("change", render);
document.getElementById("ir-t-px").addEventListener("click", () => { mode = "px"; render(); });
document.getElementById("ir-t-pct").addEventListener("click", () => { mode = "pct"; render(); });
dlBtn.addEventListener("click", () => {
  if (!outBlob) return;
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[format.value];
  download(sourceFile.name.replace(/\.[^.]+$/, "") + `-resized.${ext}`, outBlob, format.value);
});
