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

document.getElementById("jf-format").addEventListener("click", () => {
  const v = parse();
  if (v !== null) show(JSON.stringify(v, null, indentValue()));
});
document.getElementById("jf-minify").addEventListener("click", () => {
  const v = parse();
  if (v !== null) show(JSON.stringify(v));
});
document.getElementById("jf-example").addEventListener("click", () => {
  input.value = EXAMPLE;
  show(JSON.stringify(JSON.parse(EXAMPLE), null, indentValue()));
  error.textContent = "";
});
document.getElementById("jf-clear").addEventListener("click", () => {
  input.value = ""; output.value = ""; error.textContent = ""; stats.textContent = "";
  input.classList.remove("textarea--invalid");
  input.focus();
});
input.addEventListener("input", () => { if (input.value.trim()) parse(); else { error.textContent=""; input.classList.remove("textarea--invalid"); } });
