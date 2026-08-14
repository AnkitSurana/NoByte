// PDF converter — images->PDF, PDF->images, merge. All in-browser.
import { initDropzone, withPending, download, toast, humanBytes } from "/js/ui.js";
import * as pdfjsLib from "/assets/vendor/pdfjs/pdf.min.js";
pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/vendor/pdfjs/pdf.worker.min.js";

const { PDFDocument } = PDFLib;

/* ---------------- Images -> PDF ---------------- */
let images = []; // {file, url}
const listImages = document.getElementById("list-images");
const btnImg2Pdf = document.getElementById("btn-img2pdf");

function renderImages() {
  listImages.innerHTML = "";
  images.forEach((item, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <img class="file-thumb" src="${item.url}" alt="" />
      <span class="file-name">${escapeHtml(item.file.name)}</span>
      <span class="file-size">${humanBytes(item.file.size)}</span>
      <span class="file-actions">
        <button class="icon-btn icon-btn--sm" data-up ${i === 0 ? "disabled" : ""} aria-label="Move up"><svg class="icon" aria-hidden="true"><use href="#chevron-down" style="transform:rotate(180deg);transform-origin:center"></use></svg></button>
        <button class="icon-btn icon-btn--sm" data-down ${i === images.length - 1 ? "disabled" : ""} aria-label="Move down"><svg class="icon" aria-hidden="true"><use href="#chevron-down"></use></svg></button>
        <button class="icon-btn icon-btn--sm" data-remove aria-label="Remove"><svg class="icon" aria-hidden="true"><use href="#x"></use></svg></button>
      </span>`;
    li.querySelector("[data-up]").addEventListener("click", () => { if (i > 0) { [images[i - 1], images[i]] = [images[i], images[i - 1]]; renderImages(); } });
    li.querySelector("[data-down]").addEventListener("click", () => { if (i < images.length - 1) { [images[i + 1], images[i]] = [images[i], images[i + 1]]; renderImages(); } });
    li.querySelector("[data-remove]").addEventListener("click", () => { URL.revokeObjectURL(item.url); images.splice(i, 1); renderImages(); });
    listImages.appendChild(li);
  });
  btnImg2Pdf.disabled = images.length === 0;
}

initDropzone(document.getElementById("dz-images"), (files) => {
  for (const f of files) if (/^image\/(jpeg|png)$/.test(f.type)) images.push({ file: f, url: URL.createObjectURL(f) });
  renderImages();
}, { accept: "image/png,image/jpeg", multiple: true });

btnImg2Pdf.addEventListener("click", () => withPending(btnImg2Pdf, async () => {
  try {
    const pdf = await PDFDocument.create();
    for (const { file } of images) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const img = file.type === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const page = pdf.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
    const out = await pdf.save();
    download("images.pdf", out, "application/pdf");
    toast(`Created a PDF with ${images.length} page${images.length > 1 ? "s" : ""}.`, "success");
  } catch (e) {
    toast("Could not create the PDF. Check the image files.", "error");
  }
}));

/* ---------------- PDF -> images ---------------- */
let pdf2imgFile = null;
const p2iInfo = document.getElementById("p2i-info");
const btnPdf2Img = document.getElementById("btn-pdf2img");

initDropzone(document.getElementById("dz-pdf2img"), async (files) => {
  const f = files[0];
  if (f.type !== "application/pdf") return toast("Choose a PDF file.", "error");
  pdf2imgFile = f;
  p2iInfo.textContent = `${f.name} · ${humanBytes(f.size)}`;
  btnPdf2Img.disabled = false;
}, { accept: "application/pdf" });

btnPdf2Img.addEventListener("click", () => withPending(btnPdf2Img, async () => {
  try {
    const format = document.getElementById("p2i-format").value;
    const scale = parseFloat(document.getElementById("p2i-scale").value);
    const ext = format === "image/png" ? "png" : "jpg";
    const data = new Uint8Array(await pdf2imgFile.arrayBuffer());
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const files = {};
    const base = pdf2imgFile.name.replace(/\.pdf$/i, "");
    for (let n = 1; n <= doc.numPages; n++) {
      p2iInfo.textContent = `Rendering page ${n} of ${doc.numPages}…`;
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (format === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob = await new Promise((r) => canvas.toBlob(r, format, 0.92));
      files[`${base}-page-${String(n).padStart(2, "0")}.${ext}`] = new Uint8Array(await blob.arrayBuffer());
    }
    if (doc.numPages === 1) {
      const only = Object.entries(files)[0];
      download(only[0], only[1], format);
    } else {
      const zip = fflate.zipSync(files, { level: 0 });
      download(`${base}-images.zip`, zip, "application/zip");
    }
    p2iInfo.textContent = `${pdf2imgFile.name} · ${humanBytes(pdf2imgFile.size)}`;
    toast(`Exported ${doc.numPages} page${doc.numPages > 1 ? "s" : ""}.`, "success");
  } catch (e) {
    p2iInfo.textContent = "";
    toast("Could not read that PDF. It may be encrypted or damaged.", "error");
  }
}));

/* ---------------- Merge PDFs ---------------- */
let mergeFiles = [];
const listMerge = document.getElementById("list-merge");
const btnMerge = document.getElementById("btn-merge");

function renderMerge() {
  listMerge.innerHTML = "";
  mergeFiles.forEach((file, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <svg class="icon" aria-hidden="true" style="width:22px;height:22px;color:var(--ink-3)"><use href="#file-type"></use></svg>
      <span class="file-name">${escapeHtml(file.name)}</span>
      <span class="file-size">${humanBytes(file.size)}</span>
      <span class="file-actions">
        <button class="icon-btn icon-btn--sm" data-up ${i === 0 ? "disabled" : ""} aria-label="Move up"><svg class="icon" aria-hidden="true"><use href="#chevron-down" style="transform:rotate(180deg);transform-origin:center"></use></svg></button>
        <button class="icon-btn icon-btn--sm" data-down ${i === mergeFiles.length - 1 ? "disabled" : ""} aria-label="Move down"><svg class="icon" aria-hidden="true"><use href="#chevron-down"></use></svg></button>
        <button class="icon-btn icon-btn--sm" data-remove aria-label="Remove"><svg class="icon" aria-hidden="true"><use href="#x"></use></svg></button>
      </span>`;
    li.querySelector("[data-up]").addEventListener("click", () => { if (i > 0) { [mergeFiles[i - 1], mergeFiles[i]] = [mergeFiles[i], mergeFiles[i - 1]]; renderMerge(); } });
    li.querySelector("[data-down]").addEventListener("click", () => { if (i < mergeFiles.length - 1) { [mergeFiles[i + 1], mergeFiles[i]] = [mergeFiles[i], mergeFiles[i + 1]]; renderMerge(); } });
    li.querySelector("[data-remove]").addEventListener("click", () => { mergeFiles.splice(i, 1); renderMerge(); });
    listMerge.appendChild(li);
  });
  btnMerge.disabled = mergeFiles.length < 2;
}

initDropzone(document.getElementById("dz-merge"), (files) => {
  for (const f of files) if (f.type === "application/pdf") mergeFiles.push(f);
  renderMerge();
}, { accept: "application/pdf", multiple: true });

btnMerge.addEventListener("click", () => withPending(btnMerge, async () => {
  try {
    const out = await PDFDocument.create();
    for (const file of mergeFiles) {
      const src = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }
    download("merged.pdf", await out.save(), "application/pdf");
    toast(`Merged ${mergeFiles.length} PDFs.`, "success");
  } catch (e) {
    toast("Could not merge. One of the files may be encrypted or damaged.", "error");
  }
}));

const escapeHtml = (s = "") => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
