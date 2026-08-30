// Case converter — all transforms run locally. A small spinner in the middle
// picks the case (scroll, arrows, or arrow keys); the result fills the box on
// the right and the picker value rolls as it changes.
const input = document.getElementById("cc-input");
const output = document.getElementById("cc-output");
const label = document.getElementById("cc-active-label");
const spinner = document.getElementById("cc-spinner");
const reel = document.getElementById("cc-reel");

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

const ORDER = ["upper", "lower", "title", "sentence", "camel", "pascal", "snake", "kebab", "constant", "alternating"];

// Build the wheel: one item per case, angled around the cylinder by its index.
ORDER.forEach((key, i) => {
  const el = document.createElement("div");
  el.className = "cc-spinner__item";
  el.style.setProperty("--i", i);
  el.dataset.i = i;
  el.textContent = labels[key];
  reel.appendChild(el);
});
const items = [...reel.children];

let idx = 0;
let activeCase = ORDER[0];

function refresh() {
  output.value = transforms[activeCase](input.value);
  label.textContent = labels[activeCase];
}

// Rotate the reel to the active case and fade each item by its distance from
// the centre, so the middle reads dark and the edges melt into the page.
function paint() {
  reel.style.setProperty("--sel", idx);
  spinner.setAttribute("aria-valuetext", labels[activeCase]);
  items.forEach((el, i) => {
    el.classList.toggle("is-sel", i === idx);
    el.style.opacity = String(Math.max(0, 1 - Math.abs(i - idx) * 0.26));
  });
}

// Roll to an absolute index (clamped to the ends).
function goTo(n) {
  n = Math.min(ORDER.length - 1, Math.max(0, n));
  if (n === idx) return;
  idx = n;
  activeCase = ORDER[idx];
  paint();
  refresh();
}
const roll = (dir) => goTo(idx + dir);

// Wheel, throttled so a trackpad flick steps once rather than twenty times.
let lastWheel = 0;
spinner.addEventListener("wheel", (e) => {
  e.preventDefault();
  const now = Date.now();
  if (now - lastWheel < 90) return;
  lastWheel = now;
  roll(e.deltaY > 0 ? 1 : -1);
}, { passive: false });

// Drag to spin: every ~22px dragged is one step (transition off while dragging).
let dragging = false, startY = 0, startIdx = 0;
spinner.addEventListener("pointerdown", (e) => {
  dragging = true; startY = e.clientY; startIdx = idx;
  spinner.classList.add("is-dragging");
  spinner.setPointerCapture(e.pointerId);
});
spinner.addEventListener("pointermove", (e) => {
  if (dragging) goTo(startIdx + Math.round((e.clientY - startY) / 22));
});
const endDrag = () => { dragging = false; spinner.classList.remove("is-dragging"); };
spinner.addEventListener("pointerup", endDrag);
spinner.addEventListener("pointercancel", endDrag);

// Tap an off-centre case to jump to it; keyboard arrows step one at a time.
spinner.addEventListener("click", (e) => {
  const it = e.target.closest(".cc-spinner__item");
  if (it) goTo(Number(it.dataset.i));
});
spinner.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); roll(1); }
  else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); roll(-1); }
});

paint();
input.addEventListener("input", refresh);
document.querySelector("[data-example]").addEventListener("click", () => {
  input.value = EXAMPLE;
  refresh();
});

// Start with the example so output shows on load.
input.value = EXAMPLE;
refresh();
