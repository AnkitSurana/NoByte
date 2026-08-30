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

const tabs = [document.getElementById("he-t-enc"), document.getElementById("he-t-dec")];
const encPanel = document.getElementById("he-p-enc");
const decPanel = document.getElementById("he-p-dec");

// Self-contained tab handling: keeps mode, panels, and the scope toggle in sync
// for both mouse clicks and arrow-key navigation.
function selectTab(enc) {
  mode = enc ? "encode" : "decode";
  tabs[0].setAttribute("aria-selected", String(enc));
  tabs[1].setAttribute("aria-selected", String(!enc));
  tabs[0].tabIndex = enc ? 0 : -1;
  tabs[1].tabIndex = enc ? -1 : 0;
  encPanel.hidden = !enc;
  decPanel.hidden = enc;
  scopeWrap.classList.toggle("hidden", !enc); // scope toggle only applies to encoding
  input.placeholder = enc ? '<a href="/x">Tom & Jerry</a>' : "&lt;a&gt;Tom &amp; Jerry&lt;/a&gt;";
  run();
}
const EXAMPLES = {
  encode: '<a href="/x">Tom & Jerry</a> costs 3 < 5',
  decode: '&lt;a href=&quot;/x&quot;&gt;Tom &amp; Jerry&lt;/a&gt; costs 3 &lt; 5',
};
document.getElementById("he-example").addEventListener("click", () => {
  input.value = EXAMPLES[mode];
  run();
});
tabs[0].addEventListener("click", () => selectTab(true));
tabs[1].addEventListener("click", () => selectTab(false));
tabs.forEach((t) => t.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  const enc = e.key === "ArrowLeft";
  tabs[enc ? 0 : 1].focus();
  selectTab(enc);
}));
[input, allBox].forEach((el) => el.addEventListener("input", run));
selectTab(true);
