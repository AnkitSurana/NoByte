// PDF page tools — reorder (drag), delete, extract, and split PDF pages.
import { initDropzone, withPending, download, toast, humanBytes } from "/js/ui.js";
import * as pdfjsLib from "/assets/vendor/pdfjs/pdf.min.js";
pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/vendor/pdfjs/pdf.worker.min.js";

const { PDFDocument } = PDFLib;

const drop = document.getElementById("pp-drop");
const workspace = document.getElementById("pp-workspace");
const grid = document.getElementById("pp-pages");
const infoEl = document.getElementById("pp-info");
const btn = {
  selall: document.getElementById("pp-selall"),
  clear: document.getElementById("pp-clear"),
  del: document.getElementById("pp-delete"),
  extract: document.getElementById("pp-extract"),
  split: document.getElementById("pp-split"),
  download: document.getElementById("pp-download"),
};

let sourceBytes = null;   // original PDF bytes (Uint8Array)
let fileName = "document.pdf";
let pages = [];           // ordered: { orig: 0-based index in source, sel: bool }

/* ---------- load + render thumbnails ---------- */
initDropzone(drop, async (files) => {
  const f = files[0];
  if (!f || f.type !== "application/pdf") return toast("Choose a PDF file.", "error");
  fileName = f.name;
  try {
    sourceBytes = new Uint8Array(await f.arrayBuffer());
    // pdf.js consumes (transfers) the buffer, so hand it a copy.
    const doc = await pdfjsLib.getDocument({ data: sourceBytes.slice() }).promise;
    pages = Array.from({ length: doc.numPages }, (_, i) => ({ orig: i, sel: false }));
    // Show the workspace immediately with numbered placeholders; the page
    // operations do not need the previews, so nothing waits on rendering.
    grid.innerHTML = "";
    const cards = pages.map((p) => { const c = makeCard(p.orig); grid.appendChild(c); return c; });
    workspace.hidden = false;
    updateInfo();
    renderThumbs(doc, cards); // fill in previews in the background
  } catch (e) {
    toast("Could not open that PDF. It may be encrypted or damaged.", "error");
    workspace.hidden = true;
  }
}, { accept: "application/pdf" });

function makeCard(orig) {
  const card = document.createElement("div");
  card.className = "pp-page";
  card.dataset.orig = orig;
  card.innerHTML = `
    <label class="pp-page__sel"><input type="checkbox" data-sel aria-label="Select page ${orig + 1}" /></label>
    <div class="pp-page__thumb pp-page__thumb--ph" data-thumb>${orig + 1}</div>
    <span class="pp-page__n">${orig + 1}</span>`;
  card.querySelector("[data-sel]").addEventListener("change", (e) => {
    const p = pages.find((x) => x.orig === orig);
    if (p) p.sel = e.target.checked;
    card.classList.toggle("is-sel", e.target.checked);
    updateInfo();
  });
  return card;
}

// Render page previews one at a time, replacing each placeholder. A per-page
// timeout means a slow or unrenderable page never blocks the tool; its
// placeholder simply stays.
async function renderThumbs(doc, cards) {
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
  for (let n = 1; n <= doc.numPages; n++) {
    try {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width; canvas.height = viewport.height;
      await withTimeout(page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise, 6000);
      const holder = cards[n - 1] && cards[n - 1].querySelector("[data-thumb]");
      if (!holder) continue;
      const img = document.createElement("img");
      img.className = "pp-page__thumb";
      img.src = canvas.toDataURL("image/png");
      img.alt = `Page ${n}`;
      img.draggable = false;
      holder.replaceWith(img);
    } catch { /* keep the numbered placeholder */ }
  }
}

// Reorder `pages` to match the DOM after a drag.
Sortable.create(grid, {
  animation: 150,
  ghostClass: "pp-page--ghost",
  onEnd: () => {
    const order = [...grid.children].map((c) => Number(c.dataset.orig));
    pages.sort((a, b) => order.indexOf(a.orig) - order.indexOf(b.orig));
    updateInfo();
  },
});

/* ---------- selection ---------- */
function setAll(sel) {
  pages.forEach((p) => (p.sel = sel));
  grid.querySelectorAll(".pp-page").forEach((card) => {
    card.querySelector("[data-sel]").checked = sel;
    card.classList.toggle("is-sel", sel);
  });
  updateInfo();
}
btn.selall.addEventListener("click", () => setAll(true));
btn.clear.addEventListener("click", () => setAll(false));

function updateInfo() {
  const selected = pages.filter((p) => p.sel).length;
  infoEl.textContent = `${fileName} · ${pages.length} page${pages.length === 1 ? "" : "s"}${selected ? ` · ${selected} selected` : ""}`;
  btn.del.disabled = selected === 0 || selected === pages.length;
  btn.extract.disabled = selected === 0;
}

/* ---------- build + save ---------- */
async function buildPdf(indices) {
  const src = await PDFDocument.load(sourceBytes);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  copied.forEach((p) => out.addPage(p));
  return out.save();
}
const baseName = () => fileName.replace(/\.pdf$/i, "");

btn.download.addEventListener("click", () => withPending(btn.download, async () => {
  if (!pages.length) return;
  try {
    const bytes = await buildPdf(pages.map((p) => p.orig));
    download(`${baseName()}-edited.pdf`, bytes, "application/pdf");
  } catch { toast("Could not save the PDF.", "error"); }
}));

btn.del.addEventListener("click", () => {
  const remaining = pages.filter((p) => !p.sel);
  if (!remaining.length) return toast("That would remove every page.", "error");
  const keep = new Set(remaining.map((p) => p.orig));
  grid.querySelectorAll(".pp-page").forEach((card) => { if (!keep.has(Number(card.dataset.orig))) card.remove(); });
  pages = remaining.map((p) => ({ ...p, sel: false }));
  grid.querySelectorAll("[data-sel]").forEach((c) => (c.checked = false));
  grid.querySelectorAll(".pp-page").forEach((c) => c.classList.remove("is-sel"));
  updateInfo();
});

btn.extract.addEventListener("click", () => withPending(btn.extract, async () => {
  const picked = pages.filter((p) => p.sel).map((p) => p.orig);
  if (!picked.length) return;
  try {
    const bytes = await buildPdf(picked);
    download(`${baseName()}-extract.pdf`, bytes, "application/pdf");
  } catch { toast("Could not extract those pages.", "error"); }
}));

btn.split.addEventListener("click", () => withPending(btn.split, async () => {
  if (!pages.length) return;
  try {
    const src = await PDFDocument.load(sourceBytes);
    const files = {};
    const width = String(pages.length).length;
    for (let i = 0; i < pages.length; i++) {
      const out = await PDFDocument.create();
      const [copied] = await out.copyPages(src, [pages[i].orig]);
      out.addPage(copied);
      files[`${baseName()}-page-${String(i + 1).padStart(width, "0")}.pdf`] = await out.save();
    }
    download(`${baseName()}-split.zip`, fflate.zipSync(files, { level: 0 }), "application/zip");
    toast(`Split into ${pages.length} files.`, "success");
  } catch { toast("Could not split the PDF.", "error"); }
}));
