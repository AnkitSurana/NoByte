// PDF text extractor: pull the selectable text out of a PDF with pdf.js, on-device.
import { initDropzone, download, humanBytes, toast } from "/js/ui.js";
import * as pdfjsLib from "/assets/vendor/pdfjs/pdf.min.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/assets/vendor/pdfjs/pdf.worker.min.js";

const $ = (id) => document.getElementById(id);
const info = $("pt-info"), out = $("pt-out"), result = $("pt-result"), outLabel = $("pt-out-label");
let filename = "extracted.txt";

initDropzone($("pt-drop"), async (files) => {
  const f = files[0];
  if (!f) return;
  if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) return toast("Choose a PDF file.", "error");
  filename = f.name.replace(/\.pdf$/i, "") + ".txt";
  info.textContent = `${f.name} · ${humanBytes(f.size)} · reading...`;
  result.classList.add("hidden");
  try {
    const buf = await f.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str).join(" ") + "\n\n";
      info.textContent = `${f.name} · ${humanBytes(f.size)} · page ${i} of ${pdf.numPages}`;
    }
    out.value = text.trim();
    outLabel.textContent = `Text (${pdf.numPages} page${pdf.numPages > 1 ? "s" : ""})`;
    result.classList.remove("hidden");
    info.textContent = `${f.name} · ${humanBytes(f.size)} · ${pdf.numPages} page${pdf.numPages > 1 ? "s" : ""}`;
    if (!out.value) toast("No selectable text found. This PDF is likely made of scanned images.", "info", 6000);
  } catch (e) {
    console.error("[pdf-text-extractor]", e);
    info.textContent = "";
    toast("Could not read this PDF. It may be corrupted or password-protected.", "error");
  }
}, { accept: "application/pdf" });

$("pt-download").addEventListener("click", () => { if (out.value) download(filename, out.value, "text/plain"); });
