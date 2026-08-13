// Case converter — all transforms run locally.
const input = document.getElementById("cc-input");
const output = document.getElementById("cc-output");
const label = document.getElementById("cc-active-label");
const buttons = document.getElementById("cc-buttons");

const EXAMPLE = "the quick brown fox jumps over the lazy dog";

const words = (s) => s.match(/[A-Za-z0-9]+/g) || [];
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

const transforms = {
  upper: (s) => s.toUpperCase(),
  lower: (s) => s.toLowerCase(),
  title: (s) => s.replace(/\w\S*/g, (w) => cap(w)),
  sentence: (s) =>
    s.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase()),
  camel: (s) => words(s).map((w, i) => (i === 0 ? w.toLowerCase() : cap(w))).join(""),
  pascal: (s) => words(s).map(cap).join(""),
  snake: (s) => words(s).map((w) => w.toLowerCase()).join("_"),
  kebab: (s) => words(s).map((w) => w.toLowerCase()).join("-"),
  constant: (s) => words(s).map((w) => w.toUpperCase()).join("_"),
  alternating: (s) =>
    s.split("").map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase())).join(""),
};

const labels = {
  upper: "UPPERCASE", lower: "lowercase", title: "Title Case", sentence: "Sentence case",
  camel: "camelCase", pascal: "PascalCase", snake: "snake_case", kebab: "kebab-case",
  constant: "CONSTANT_CASE", alternating: "aLtErNaTiNg",
};

let activeCase = "upper";
function apply() {
  output.value = transforms[activeCase](input.value);
  label.textContent = labels[activeCase];
}

buttons.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-case]");
  if (!btn) return;
  activeCase = btn.dataset.case;
  apply();
});
input.addEventListener("input", apply);
document.querySelector("[data-example]").addEventListener("click", () => {
  input.value = EXAMPLE;
  apply();
});
document.querySelector("[data-clear]").addEventListener("click", () => {
  input.value = "";
  apply();
  input.focus();
});
apply();
