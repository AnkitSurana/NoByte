// Avro & Parquet schema viewer - thin DOM shell over the pure parser.
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

const fileInput = document.getElementById("apv-file");
const errorEl = document.getElementById("apv-error");
const errorTextEl = document.getElementById("apv-error-text");
const metaEl = document.getElementById("apv-meta");
const resultBox = document.getElementById("apv-result");
const treeEl = document.getElementById("apv-tree");
const rawEl = document.getElementById("apv-raw");
const filterEl = document.getElementById("apv-filter");
const pasteEl = document.getElementById("apv-paste");
const treeBtn = document.getElementById("apv-view-tree");
const jsonBtn = document.getElementById("apv-view-json");
const jsonActions = document.getElementById("apv-json-actions");

// A sample .avsc so the tool shows a populated tree the moment it loads.
const EXAMPLE = JSON.stringify({
  type: "record",
  name: "User",
  namespace: "in.nobyte",
  fields: [
    { name: "id", type: "long" },
    { name: "name", type: "string" },
    { name: "email", type: ["null", "string"], default: null },
    { name: "roles", type: { type: "array", items: "string" } },
    { name: "createdAt", type: { type: "long", logicalType: "timestamp-millis" } },
  ],
}, null, 2);

let current = null; // the parsed result from the selected file

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const exampleBtn = document.getElementById("apv-example");
const DEFAULT_PLACEHOLDER = pasteEl.placeholder;
let fileMode = false; // true while a binary file is the loaded source

function showError(msg) {
  errorTextEl.textContent = msg || "";
  errorEl.hidden = !msg;
}

// Keep the paste box and the Load example / Clear button in step with the state:
// a loaded file greys the box (you cannot type binary), and any loaded content
// turns "Load example" into "Clear".
function syncControls() {
  pasteEl.readOnly = fileMode;
  pasteEl.classList.toggle("apv-locked", fileMode);
  pasteEl.placeholder = fileMode ? 'File loaded - press Clear to paste a schema instead.' : DEFAULT_PLACEHOLDER;

  const loaded = fileMode || !resultBox.hidden || pasteEl.value.trim() !== "";
  exampleBtn.dataset.mode = loaded ? "clear" : "load";
  exampleBtn.innerHTML = loaded
    ? '<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#x"></use></svg> Clear'
    : '<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#refresh"></use></svg> Load example';
}

function resetOutputs() {
  current = null;
  resultBox.hidden = true;
  metaEl.innerHTML = "";
  treeEl.innerHTML = "";
  rawEl.textContent = "";
  syncControls();
}

const FORMAT_LABEL = { avsc: "Avro schema", avro: "Avro container", parquet: "Parquet" };

/* ---- reading + parsing ---------------------------------------------- */
async function handleFile(file) {
  showError("");
  let result, format = null;
  try {
    const buffer = await file.arrayBuffer();
    const u8 = new Uint8Array(buffer);
    format = detectFormat(file.name, u8);
    if (format === "avsc") result = readAvsc(new TextDecoder().decode(u8));
    else if (format === "avro") result = readAvroContainer(u8);
    else if (format === "parquet") result = readParquet(u8);
    else throw new Error("Unrecognised file type. Choose a .avsc, .avro, or .parquet file.");
  } catch (e) {
    fileMode = false;
    resetOutputs();
    // A known extension that fails to parse means the file is damaged; say so
    // plainly and keep the technical reason in parentheses for the curious.
    if (format) {
      const label = FORMAT_LABEL[format];
      const article = /^[aeiou]/i.test(label) ? "an" : "a";
      showError(`Could not read "${file.name}" as ${article} ${label} file - it looks truncated or corrupted. (${e.message})`);
    } else {
      showError(e.message);
    }
    return;
  }
  current = result;
  fileMode = true;
  pasteEl.value = ""; // a chosen file supersedes any pasted schema
  render({ name: file.name, size: file.size }, result);
}

/* ---- pasted schema content ------------------------------------------ */
function handlePaste() {
  showError("");
  let result;
  try {
    result = readAvsc(pasteEl.value);
  } catch (e) {
    fileMode = false;
    resetOutputs();
    showError(e.message);
    return;
  }
  fileInput.value = ""; // pasted content supersedes any chosen file
  current = result;
  fileMode = false;
  render({ name: null, size: new Blob([pasteEl.value]).size }, result);
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

// Count the top-level fields so the facts strip can say "5 fields".
function fieldCount(result) {
  const nodes = result.format === "parquet" ? parquetToNodes(result.schema) : avroToNodes(result.schema);
  if (nodes.length === 1 && nodes[0].children) return nodes[0].children.length;
  return nodes.length;
}

// Labelled rows (label, value) so it is clear what each fact is. Only the facts
// that apply are shown: a pasted schema has file type / fields / size, while a
// real .parquet file also carries its codec, row count, version and writer.
function metaRowsHtml(file, result) {
  const row = (label, value) => `<dt>${label}</dt><dd>${esc(value)}</dd>`;
  const rows = [];
  if (file.name) rows.push(row("File name", file.name));
  rows.push(row("File type", result.format.toUpperCase()));
  const fc = fieldCount(result);
  if (fc) rows.push(row("Fields", String(fc)));
  rows.push(row("Size", humanBytes(file.size)));
  if (result.codec) rows.push(row("Compression", result.codec));
  if (result.numRows != null) rows.push(row("Rows", Number(result.numRows).toLocaleString()));
  if (result.version != null) rows.push(row("Format version", String(result.version)));
  if (result.createdBy) rows.push(row("Created by", result.createdBy));
  return rows.join("");
}

function render(file, result) {
  metaEl.innerHTML = metaRowsHtml(file, result);
  rawEl.textContent = JSON.stringify(exportObject(result), null, 2);
  drawTree(result);
  resultBox.hidden = false;
  syncControls();
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
  const shown = nodes.filter((n) => matches(n, q));
  if (!shown.length) {
    treeEl.innerHTML = `<p class="muted small">No field name or type matches "${esc(filterEl.value.trim())}". Clear the filter to see the whole schema.</p>`;
    return;
  }
  treeEl.innerHTML = shown.map((n) => renderNode(n, q, 0)).join("");
}

/* ---- events --------------------------------------------------------- */
// The textarea is both the paste field and the drop target: text parses live
// as you type, and dropping a binary .avro/.parquet reads it straight away.
let parseTimer;
pasteEl.addEventListener("input", () => {
  clearTimeout(parseTimer);
  parseTimer = setTimeout(() => {
    if (pasteEl.value.trim()) handlePaste();
    else { showError(""); resetOutputs(); }
  }, 350);
});
pasteEl.addEventListener("dragover", (e) => { e.preventDefault(); pasteEl.classList.add("apv-drag"); });
pasteEl.addEventListener("dragleave", () => pasteEl.classList.remove("apv-drag"));
pasteEl.addEventListener("drop", (e) => {
  if (!e.dataTransfer.files || !e.dataTransfer.files[0]) return; // let plain text drops fall through
  e.preventDefault();
  pasteEl.classList.remove("apv-drag");
  handleFile(e.dataTransfer.files[0]);
});

document.getElementById("apv-choose").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
});
// The right button loads the example while empty, and becomes Clear once
// anything is loaded (a pasted schema, the example, or an uploaded file).
exampleBtn.addEventListener("click", () => {
  if (exampleBtn.dataset.mode === "clear") {
    fileMode = false;
    fileInput.value = "";
    pasteEl.value = "";
    filterEl.value = "";
    showError("");
    resetOutputs();
    pasteEl.focus();
  } else {
    fileMode = false;
    fileInput.value = "";
    pasteEl.value = EXAMPLE;
    handlePaste();
  }
});

filterEl.addEventListener("input", () => { if (current) drawTree(current); });

// The tabs flip the shared scroll area between the field outline and the raw
// JSON. The filter only applies to the tree, and Copy / Download export the
// JSON - so both are shown only in their relevant view.
function setView(json) {
  treeEl.hidden = json;
  filterEl.hidden = json;
  rawEl.hidden = !json;
  jsonActions.hidden = !json;
  treeBtn.setAttribute("aria-selected", String(!json));
  jsonBtn.setAttribute("aria-selected", String(json));
  treeBtn.tabIndex = json ? -1 : 0;
  jsonBtn.tabIndex = json ? 0 : -1;
}
treeBtn.addEventListener("click", () => setView(false));
jsonBtn.addEventListener("click", () => setView(true));

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

// Start with the example loaded so the tree and raw panels are populated on open.
pasteEl.value = EXAMPLE;
handlePaste();

