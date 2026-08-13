// HTML entity encoder / decoder. Encoding is done by hand so the output is
// predictable; decoding leans on the browser's own parser for correctness.
const input = document.getElementById("he-input");
const output = document.getElementById("he-output");
const allBox = document.getElementById("he-all");
const scopeWrap = document.getElementById("he-scope-wrap");
let mode = "encode";

const NAMED = { "&": "amp", "<": "lt", ">": "gt", '"': "quot", "'": "#39" };

function encode(text, escapeAll) {
  let out = "";
  for (const ch of text) {
    if (NAMED[ch]) { out += `&${NAMED[ch]};`; continue; }
    if (escapeAll && ch.codePointAt(0) > 127) { out += `&#${ch.codePointAt(0)};`; continue; }
    out += ch;
  }
  return out;
}

// Decode by letting a detached <textarea> parse the entities. A textarea is an
// RCDATA element, so any literal tags in the input stay as text and nothing can
// execute — only entity references are resolved. Covers every named and numeric
// reference the browser knows, with no lookup table of our own.
const decoder = document.createElement("textarea");
function decode(text) {
  decoder.innerHTML = text;
  return decoder.value;
}

function run() {
  output.value = mode === "encode" ? encode(input.value, allBox.checked) : decode(input.value);
}

function setMode(next) {
  mode = next;
  const enc = next === "encode";
  document.getElementById("he-t-enc").setAttribute("aria-selected", String(enc));
  document.getElementById("he-t-dec").setAttribute("aria-selected", String(!enc));
  document.getElementById("he-t-enc").tabIndex = enc ? 0 : -1;
  document.getElementById("he-t-dec").tabIndex = enc ? -1 : 0;
  document.getElementById("he-p-enc").hidden = !enc;
  document.getElementById("he-p-dec").hidden = enc;
  scopeWrap.style.visibility = enc ? "visible" : "hidden"; // scope toggle only applies to encoding
  input.placeholder = enc ? '<a href="/x">Tom & Jerry</a>' : "&lt;a&gt;Tom &amp; Jerry&lt;/a&gt;";
  run();
}

document.getElementById("he-t-enc").addEventListener("click", () => setMode("encode"));
document.getElementById("he-t-dec").addEventListener("click", () => setMode("decode"));
[input, allBox].forEach((el) => el.addEventListener("input", run));
setMode("encode");
