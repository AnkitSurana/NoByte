// Image compressor — canvas re-encode with a quality slider. Nothing uploaded.
import { initDropzone, humanBytes, download, toast, debounce } from "/js/ui.js";

let sourceFile = null, sourceBitmap = null, outBlob = null;
const quality = document.getElementById("ic-quality");
const qualityVal = document.getElementById("ic-quality-val");
const format = document.getElementById("ic-format");
const compare = document.getElementById("ic-compare");
const dlBtn = document.getElementById("ic-download");
const savedBadge = document.getElementById("ic-saved");

initDropzone(document.getElementById("ic-drop"), async (files) => {
  const f = files[0];
  if (!f.type.startsWith("image/")) return toast("Choose an image file.", "error");
  sourceFile = f;
  sourceBitmap = await createImageBitmap(f);
  document.getElementById("ic-img-before").src = URL.createObjectURL(f);
  document.getElementById("ic-before").textContent = humanBytes(f.size);
  compare.classList.remove("hidden");
  run();
}, { accept: "image/*" });

const run = debounce(async () => {
  if (!sourceBitmap) return;
  const canvas = document.createElement("canvas");
  canvas.width = sourceBitmap.width;
  canvas.height = sourceBitmap.height;
  const ctx = canvas.getContext("2d");
  if (format.value === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(sourceBitmap, 0, 0);
  outBlob = await new Promise((r) => canvas.toBlob(r, format.value, Number(quality.value) / 100));
  document.getElementById("ic-img-after").src = URL.createObjectURL(outBlob);
  document.getElementById("ic-after").textContent = humanBytes(outBlob.size);
  dlBtn.disabled = false;
  const pct = Math.round((1 - outBlob.size / sourceFile.size) * 100);
  savedBadge.classList.remove("hidden");
  if (pct > 0) { savedBadge.className = "badge badge--ok"; savedBadge.textContent = `${pct}% smaller`; }
  else { savedBadge.className = "badge badge--danger"; savedBadge.textContent = `${Math.abs(pct)}% larger, try lower quality`; }
}, 150);

quality.addEventListener("input", () => { qualityVal.textContent = `${quality.value}%`; run(); });
format.addEventListener("change", run);
dlBtn.addEventListener("click", () => {
  if (!outBlob) return;
  const ext = format.value === "image/webp" ? "webp" : "jpg";
  download(sourceFile.name.replace(/\.[^.]+$/, "") + `-compressed.${ext}`, outBlob, format.value);
});
