// CSV <-> JSON converter with a proper quoted-field CSV parser.
import { debounce } from "/js/ui.js";

const input = document.getElementById("cj-input");
const output = document.getElementById("cj-output");
const error = document.getElementById("cj-error");
const dir = document.getElementById("cj-dir");
const delimSel = document.getElementById("cj-delim");
const headerChk = document.getElementById("cj-header");

const EXAMPLE_CSV = 'name,role,city\nAda Lovelace,Engineer,"London, UK"\nGrace Hopper,Admiral,New York';
const EXAMPLE_JSON = JSON.stringify([{ name: "Ada Lovelace", role: "Engineer", city: "London, UK" }, { name: "Grace Hopper", role: "Admiral", city: "New York" }], null, 2);

// RFC-4180-ish parser: handles quoted fields, escaped quotes, embedded newlines.
function parseCSV(text, delim) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length && !(r.length === 1 && r[0] === ""));
}

const escapeCSV = (v, delim) => {
  const s = v === null || v === undefined ? "" : String(v);
  return new RegExp(`["\n${delim === "|" ? "\\|" : delim}]`).test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const convert = debounce(() => {
  error.textContent = "";
  input.classList.remove("textarea--invalid");
  const delim = delimSel.value;
  const text = input.value.trim();
  if (!text) { output.value = ""; return; }

  try {
    if (dir.value === "c2j") {
      const rows = parseCSV(text, delim);
      if (!rows.length) { output.value = "[]"; return; }
      let out;
      if (headerChk.checked) {
        const head = rows[0];
        out = rows.slice(1).map((r) => Object.fromEntries(head.map((k, i) => [k, r[i] ?? ""])));
      } else out = rows;
      output.value = JSON.stringify(out, null, 2);
    } else {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("Provide a JSON array of objects or arrays.");
      if (!data.length) { output.value = ""; return; }
      let lines = [];
      if (Array.isArray(data[0])) {
        lines = data.map((r) => r.map((v) => escapeCSV(v, delim)).join(delim));
      } else {
        const keys = [...new Set(data.flatMap((o) => Object.keys(o)))];
        if (headerChk.checked) lines.push(keys.map((k) => escapeCSV(k, delim)).join(delim));
        lines.push(...data.map((o) => keys.map((k) => escapeCSV(o[k], delim)).join(delim)));
      }
      output.value = lines.join("\n");
    }
  } catch (e) {
    error.textContent = e.message;
    input.classList.add("textarea--invalid");
    output.value = "";
  }
}, 200);

function syncLabels() {
  const c2j = dir.value === "c2j";
  document.getElementById("cj-in-label").textContent = c2j ? "CSV input" : "JSON input";
  document.getElementById("cj-out-label").textContent = c2j ? "JSON output" : "CSV output";
}

[input, delimSel, headerChk].forEach((el) => el.addEventListener("input", convert));
dir.addEventListener("change", () => { syncLabels(); convert(); });
document.getElementById("cj-example").addEventListener("click", () => {
  input.value = dir.value === "c2j" ? EXAMPLE_CSV : EXAMPLE_JSON;
  convert();
});
syncLabels();
input.value = EXAMPLE_CSV;
convert();
