// Image format converter — PNG / JPG / WebP via canvas.
import { initDropzone, humanBytes, download, toast, debounce } from "/js/ui.js";

let bitmap = null, sourceFile = null, outBlob = null;
const format = document.getElementById("cv-format");
const quality = document.getElementById("cv-quality");
const qualityVal = document.getElementById("cv-quality-val");
const qualityWrap = document.getElementById("cv-quality-wrap");
const preview = document.getElementById("cv-preview");
const dlBtn = document.getElementById("cv-download");
const alphaWarn = document.getElementById("cv-alpha-warn");

initDropzone(document.getElementById("cv-drop"), async (files) => {
  const f = files[0];
  if (!f.type.startsWith("image/")) return toast("Choose an image file.", "error");
  sourceFile = f;
  bitmap = await createImageBitmap(f);
  document.getElementById("cv-info").textContent = `${f.name} · ${bitmap.width}×${bitmap.height} · ${humanBytes(f.size)}`;
  render();
}, { accept: "image/*" });

const render = debounce(async () => {
  if (!bitmap) return;
  const isJpeg = format.value === "image/jpeg";
  qualityWrap.style.display = format.value === "image/png" ? "none" : "";
  alphaWarn.classList.toggle("hidden", !isJpeg);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width; canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (isJpeg) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(bitmap, 0, 0);
  outBlob = await new Promise((r) => canvas.toBlob(r, format.value, Number(quality.value) / 100));
  preview.src = URL.createObjectURL(outBlob);
  preview.classList.remove("hidden");
  document.getElementById("cv-out-info").textContent = `Output: ${humanBytes(outBlob.size)}`;
  dlBtn.disabled = false;
}, 150);

format.addEventListener("change", render);
quality.addEventListener("input", () => { qualityVal.textContent = `${quality.value}%`; render(); });
dlBtn.addEventListener("click", () => {
  if (!outBlob) return;
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[format.value];
  download(sourceFile.name.replace(/\.[^.]+$/, "") + `.${ext}`, outBlob, format.value);
});
