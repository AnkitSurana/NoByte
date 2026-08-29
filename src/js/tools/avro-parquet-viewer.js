// Avro & Parquet schema viewer — thin DOM shell over the pure parser.
//
// Drag/drop or pick an .avsc / .avro / .parquet file; the file is read entirely
// in the browser and the schema is shown both as an expandable tree and as raw
// JSON. The heavy lifting lives in src/js/lib/avro-parquet-schema.js (and is
// unit-tested in test/avro-parquet-schema.test.js) so nothing here does byte
// parsing.
import { humanBytes } from "/js/ui.js";
import {
  detectFormat, readAvsc, readAvroContainer, readParquet,
  avroToNodes, parquetToNodes,
} from "/js/lib/avro-parquet-schema.js";

const drop = document.getElementById("apv-drop");
const fileInput = document.getElementById("apv-file");
const errorEl = document.getElementById("apv-error");
const metaCard = document.getElementById("apv-meta");
const resultBox = document.getElementById("apv-result");
const treeEl = document.getElementById("apv-tree");
const rawEl = document.getElementById("apv-raw");
const filterEl = document.getElementById("apv-filter");
const pasteEl = document.getElementById("apv-paste");

let current = null; // the parsed result from the selected file

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const set = (id, text) => { document.getElementById(id).textContent = text; };

function showError(msg) { errorEl.textContent = msg; }

/* ---- reading + parsing ---------------------------------------------- */
async function handleFile(file) {
  showError("");
  let result;
  try {
    const buffer = await file.arrayBuffer();
    const u8 = new Uint8Array(buffer);
    const format = detectFormat(file.name, u8);
    if (format === "avsc") result = readAvsc(new TextDecoder().decode(u8));
    else if (format === "avro") result = readAvroContainer(u8);
    else if (format === "parquet") result = readParquet(u8);
    else throw new Error("Unrecognised file type. Use .avsc, .avro, or .parquet.");
  } catch (e) {
    current = null;
    metaCard.hidden = true;
    resultBox.hidden = true;
    treeEl.innerHTML = "";
    rawEl.value = "";
    showError(`${file.name}: ${e.message}`);
    return;
  }
  current = result;
  pasteEl.value = ""; // a chosen file supersedes any pasted schema
  render(file, result);
}

/* ---- pasted schema content ------------------------------------------ */
function handlePaste() {
  showError("");
  let result;
  try {
    result = readAvsc(pasteEl.value);
  } catch (e) {
    current = null;
    metaCard.hidden = true;
    resultBox.hidden = true;
    treeEl.innerHTML = "";
    rawEl.value = "";
    showError(e.message);
    return;
  }
  fileInput.value = ""; // pasted content supersedes any chosen file
  current = result;
  render({ name: "Pasted schema", size: new Blob([pasteEl.value]).size }, result);
}

function exportObject(result) {
  if (result.format === "parquet") {
    return {
      format: "parquet",
      version: result.version,
      createdBy: result.createdBy,
      numRows: result.numRows,
      codec: result.codec,
      schema: result.schema,
    };
  }
  return result.schema;
}

function render(file, result) {
  set("m-name", file.name);
  set("m-format", result.format.toUpperCase());
  set("m-size", humanBytes(file.size));
  set("m-codec", result.codec || "—");
  set("m-rows", result.numRows != null ? Number(result.numRows).toLocaleString() : "—");
  set("m-version", result.version != null ? result.version : "—");
  set("m-created", result.createdBy || "—");

  rawEl.value = JSON.stringify(exportObject(result), null, 2);
  drawTree(result);
  metaCard.hidden = false;
  resultBox.hidden = false;
}

/* ---- tree rendering ------------------------------------------------- */
function matches(node, q) {
  if (!q) return true;
  const hay = [node.name, node.type, node.repetition, node.converted, node.logical, node.meta]
    .filter(Boolean).join(" ").toLowerCase();
  if (hay.includes(q)) return true;
  return (node.children || []).some((c) => matches(c, q));
}

function renderNode(node, q, depth) {
  const children = node.children || [];
  const extras = [node.repetition, node.converted, node.logical].filter(Boolean).join(" · ");
  const head =
    `<span class="tree-name">${esc(node.name)}</span>` +
    `<span class="badge badge--muted">${esc(node.type)}</span>` +
    (extras ? `<span class="muted xs">${esc(extras)}</span>` : "") +
    (node.meta ? `<span class="muted xs">${esc(node.meta)}</span>` : "");

  if (!children.length) return `<div class="tree-leaf">${head}</div>`;

  const kids = (q ? children.filter((c) => matches(c, q)) : children)
    .map((c) => renderNode(c, q, depth + 1)).join("");
  // Roots and filtered views start expanded; otherwise the user toggles.
  const open = (q || depth === 0) ? " open" : "";
  return `<details class="tree-node"${open}><summary>${head}</summary><div class="tree-children">${kids}</div></details>`;
}

function drawTree(result) {
  const nodes = result.format === "parquet" ? parquetToNodes(result.schema) : avroToNodes(result.schema);
  const q = filterEl.value.trim().toLowerCase();
  treeEl.innerHTML = nodes.filter((n) => matches(n, q)).map((n) => renderNode(n, q, 0)).join("");
}

/* ---- events --------------------------------------------------------- */
drop.addEventListener("click", (e) => {
  if (e.target === fileInput) return; // ignore the synthetic click from fileInput.click()
  fileInput.click();
});
drop.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
});
drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("drop-zone--over"); });
drop.addEventListener("dragleave", () => drop.classList.remove("drop-zone--over"));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("drop-zone--over");
  if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener("change", () => {
  if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
});

filterEl.addEventListener("input", () => { if (current) drawTree(current); });

document.getElementById("apv-paste-go").addEventListener("click", () => {
  if (!pasteEl.value.trim()) { showError("Paste a schema first."); return; }
  handlePaste();
});
pasteEl.addEventListener("keydown", (e) => {
  // Parse on Ctrl/Cmd+Enter as a convenience.
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handlePaste(); }
});

document.getElementById("apv-download").addEventListener("click", () => {
  if (!current) return;
  const blob = new Blob([JSON.stringify(exportObject(current), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${current.format === "parquet" ? "parquet" : "avro"}-schema.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("apv-clear").addEventListener("click", () => {
  current = null;
  fileInput.value = "";
  pasteEl.value = "";
  filterEl.value = "";
  showError("");
  metaCard.hidden = true;
  resultBox.hidden = true;
  treeEl.innerHTML = "";
  rawEl.value = "";
});

