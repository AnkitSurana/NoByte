// Markdown table generator — grid editor to GFM.
const rowsEl = document.getElementById("mt-rows");
const colsEl = document.getElementById("mt-cols");
const grid = document.getElementById("mt-grid");
const out = document.getElementById("mt-out");

let data = [];
let aligns = [];

function ensureSize() {
  const r = Math.min(20, Math.max(1, parseInt(rowsEl.value) || 1));
  const c = Math.min(10, Math.max(1, parseInt(colsEl.value) || 1));
  rowsEl.value = r; colsEl.value = c;
  // header row + r body rows
  const total = r + 1;
  data = Array.from({ length: total }, (_, i) => Array.from({ length: c }, (_, j) => (data[i] && data[i][j]) || ""));
  aligns = Array.from({ length: c }, (_, j) => aligns[j] || "left");
  return { r, c };
}

function render() {
  const { c } = ensureSize();
  const alignRow = `<tr><th></th>${aligns.map((a, j) => `<th><select class="select" data-align="${j}" style="min-height:38px;padding:2px 22px 2px 6px;font-size:var(--t-xs);"><option value="left"${a==="left"?" selected":""}>Left</option><option value="center"${a==="center"?" selected":""}>Center</option><option value="right"${a==="right"?" selected":""}>Right</option></select></th>`).join("")}</tr>`;
  const body = data.map((row, i) => `<tr><td class="muted xs">${i === 0 ? "Header" : i}</td>${row.map((cell, j) => `<td><input class="input mono" data-r="${i}" data-c="${j}" value="${cell.replace(/"/g, "&quot;")}" style="min-height:32px;font-size:var(--t-xs);" /></td>`).join("")}</tr>`).join("");
  grid.innerHTML = alignRow + body;
  grid.querySelectorAll("input[data-r]").forEach((inp) => {
    inp.addEventListener("input", () => { data[+inp.dataset.r][+inp.dataset.c] = inp.value; build(); });
  });
  grid.querySelectorAll("select[data-align]").forEach((sel) => {
    sel.addEventListener("change", () => { aligns[+sel.dataset.align] = sel.value; build(); });
  });
  build();
}

function build() {
  const header = data[0];
  const sep = aligns.map((a) => (a === "center" ? ":---:" : a === "right" ? "---:" : ":---"));
  const rows = data.slice(1);
  const line = (cells) => `| ${cells.map((c) => (c || " ").trim() || " ").join(" | ")} |`;
  out.value = [line(header.map((h, i) => h || `Column ${i + 1}`)), `| ${sep.join(" | ")} |`, ...rows.map((r) => line(r))].join("\n");
}

[rowsEl, colsEl].forEach((el) => el.addEventListener("input", render));
document.getElementById("mt-clear").addEventListener("click", () => { data = []; render(); });
render();
