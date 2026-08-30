// Code beautifier: format HTML, CSS, JS with js-beautify (page globals), plus a
// safe whitespace minifier for CSS and HTML. All in the browser.
const $ = (id) => document.getElementById(id);
const inp = $("cb-in"), out = $("cb-out"), lang = $("cb-lang"), minifyBtn = $("cb-minify");
const err = $("cb-error"), status = $("cb-status");

const EXAMPLES = {
  js: "function greet(name){if(!name){return 'hi'}\nconst parts=[1,2,3].map(n=>n*2);return {name,parts}}",
  css: "body{margin:0;font-family:system-ui}.card{padding:16px;border:2px solid #000;border-radius:8px}.card:hover{background:#eee}",
  html: "<section><h1>Title</h1><ul><li>One</li><li>Two</li></ul><p>Some <strong>bold</strong> text.</p></section>",
  python: "def greet( name ):\n    if not name: return 'hi'\n    items=[n*2 for n in range(3)]\n    return {'name':name,  'items' :items}",
};

// Python is formatted with the real black formatter, run in Pyodide on demand.
const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/";
let blackPromise = null;
function loadBlack() {
  if (!blackPromise) {
    status.textContent = "Downloading Python formatter…";
    blackPromise = import(PYODIDE_URL + "pyodide.mjs")
      .then((m) => m.loadPyodide({ indexURL: PYODIDE_URL }))
      .then(async (py) => { await py.loadPackage("micropip"); await py.pyimport("micropip").install("black"); return py; })
      .catch((e) => { blackPromise = null; throw e; });
  }
  return blackPromise;
}

async function beautify() {
  const raw = inp.value;
  err.textContent = "";
  if (!raw.trim()) { out.value = ""; return; }
  if (lang.value === "python") {
    out.value = ""; // clear stale output while the formatter loads
    let py;
    try { py = await loadBlack(); } catch { status.textContent = ""; err.textContent = "Could not load the Python formatter."; return; }
    status.textContent = "";
    if (inp.value !== raw || lang.value !== "python") return; // inputs changed while loading
    py.globals.set("_src", raw);
    try {
      out.value = py.runPython("import black\nblack.format_str(_src, mode=black.Mode())");
    } catch (e) {
      err.textContent = "black could not format this Python (check the syntax).";
      out.value = "";
    }
    return;
  }
  const opts = { indent_size: 2, end_with_newline: false };
  if (lang.value === "css") out.value = beautifier.css(raw, opts);
  else if (lang.value === "html") out.value = beautifier.html(raw, { indent_size: 2, wrap_line_length: 0 });
  else out.value = beautifier.js(raw, opts);
}

function minify() {
  const raw = inp.value;
  if (!raw.trim()) { out.value = ""; return; }
  if (lang.value === "css") {
    out.value = raw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*([{}:;,>~+])\s*/g, "$1")
      .replace(/;}/g, "}")
      .trim();
  } else if (lang.value === "html") {
    out.value = raw
      .replace(/<!--(?!\[if)[\s\S]*?-->/g, "")
      .replace(/>\s+</g, "><")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
}

function updateForLang() {
  // Minify only makes sense for CSS and HTML.
  minifyBtn.classList.toggle("hidden", lang.value === "js" || lang.value === "python");
}

function loadExample() { inp.value = EXAMPLES[lang.value]; beautify(); }
// The input is "your own" once it is non-empty and not one of the built-in examples.
const isOwnCode = () => inp.value.trim() && !Object.values(EXAMPLES).includes(inp.value);

$("cb-beautify").addEventListener("click", beautify);
minifyBtn.addEventListener("click", minify);
// Switching language loads that language's example, unless you have typed your own.
lang.addEventListener("change", () => { updateForLang(); if (!isOwnCode()) loadExample(); });

updateForLang();
loadExample();
