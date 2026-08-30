// JSON formatter / validator — reports the exact line and column on error.
const input = document.getElementById("jf-input");
const output = document.getElementById("jf-output");
const error = document.getElementById("jf-error");
const stats = document.getElementById("jf-stats");

const EXAMPLE = '{"name":"NoByte","tags":["fast","local"],"meta":{"version":2,"active":true}}';

function positionFromIndex(text, index) {
  const upto = text.slice(0, index);
  const line = upto.split("\n").length;
  const column = index - upto.lastIndexOf("\n");
  return { line, column };
}

function parse() {
  const text = input.value.trim();
  if (!text) { error.textContent = ""; output.value = ""; stats.textContent = ""; return null; }
  try {
    const value = JSON.parse(text);
    error.textContent = "";
    input.classList.remove("textarea--invalid");
    return value;
  } catch (e) {
    input.classList.add("textarea--invalid");
    const m = /position (\d+)/.exec(e.message);
    if (m) {
      const { line, column } = positionFromIndex(text, Number(m[1]));
      error.textContent = `Invalid JSON at line ${line}, column ${column}: ${e.message.replace(/ in JSON.*$/, "")}`;
    } else {
      error.textContent = `Invalid JSON: ${e.message}`;
    }
    output.value = "";
    stats.textContent = "";
    return null;
  }
}

function indentValue() {
  const v = document.getElementById("jf-indent").value;
  return v === "tab" ? "\t" : Number(v);
}

function show(text) {
  output.value = text;
  stats.textContent = `${text.length.toLocaleString()} characters`;
}

let mode = "format";
const tabs = [document.getElementById("jf-t-format"), document.getElementById("jf-t-minify")];
const indentWrap = document.getElementById("jf-indent-wrap");
const indentSel = document.getElementById("jf-indent");

// Live output: re-render on input, mode change, or indent change.
function render() {
  const v = parse();
  if (v === null) return; // parse() clears output/stats on empty or invalid input
  show(mode === "minify" ? JSON.stringify(v) : JSON.stringify(v, null, indentValue()));
}

// Format / Minify segmented control, self-contained (mouse + arrow keys).
function selectMode(fmt) {
  mode = fmt ? "format" : "minify";
  tabs[0].setAttribute("aria-selected", String(fmt));
  tabs[1].setAttribute("aria-selected", String(!fmt));
  tabs[0].tabIndex = fmt ? 0 : -1;
  tabs[1].tabIndex = fmt ? -1 : 0;
  // Indent only applies when formatting. Keep it in place (disabled) so the
  // layout below never shifts when switching modes.
  indentWrap.classList.toggle("is-disabled", !fmt);
  indentSel.disabled = !fmt;
  render();
}
tabs[0].addEventListener("click", () => selectMode(true));
tabs[1].addEventListener("click", () => selectMode(false));
tabs.forEach((t) => t.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  const fmt = e.key === "ArrowLeft";
  tabs[fmt ? 0 : 1].focus();
  selectMode(fmt);
}));
document.getElementById("jf-indent").addEventListener("change", render);
document.getElementById("jf-example").addEventListener("click", () => { input.value = EXAMPLE; render(); });
input.addEventListener("input", render);
selectMode(true);
