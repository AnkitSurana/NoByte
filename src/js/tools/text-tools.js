// Text line tools — sort, dedupe, trim, reverse, number. All local. An
// operation wheel in the middle picks the transform; the result updates live.
const input = document.getElementById("tt-input");
const output = document.getElementById("tt-output");
const opLabel = document.getElementById("tt-op-label");
const spinner = document.getElementById("tt-spinner");
const reel = document.getElementById("tt-reel");

const EXAMPLE = "banana\napple\n  cherry  \napple\n\ndate\nBanana\n10\n2";

const linesOf = (s) => s.replace(/\r/g, "").split("\n");

const ops = {
  "sort-asc": (l) => [...l].sort((a, b) => a.localeCompare(b)),
  "sort-desc": (l) => [...l].sort((a, b) => b.localeCompare(a)),
  "sort-num": (l) => [...l].sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0)),
  dedupe: (l) => [...new Set(l)],
  trim: (l) => l.map((x) => x.trim()),
  blank: (l) => l.filter((x) => x.trim() !== ""),
  reverse: (l) => [...l].reverse(),
  shuffle: (l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  number: (l) => l.map((x, i) => `${i + 1}. ${x}`),
  lower: (l) => l.map((x) => x.toLowerCase()),
  upper: (l) => l.map((x) => x.toUpperCase()),
};

const OP_LABELS = {
  "sort-asc": "Sort A-Z", "sort-desc": "Sort Z-A", "sort-num": "Sort numerically",
  dedupe: "Remove duplicates", trim: "Trim whitespace", blank: "Remove blank lines",
  reverse: "Reverse order", shuffle: "Shuffle", number: "Number lines",
  lower: "lowercase", upper: "UPPERCASE",
};

const ORDER = ["sort-asc", "sort-desc", "sort-num", "dedupe", "trim", "blank", "reverse", "shuffle", "number", "lower", "upper"];

// Build the wheel: one item per operation, angled around the cylinder.
ORDER.forEach((key, i) => {
  const el = document.createElement("div");
  el.className = "cc-spinner__item";
  el.style.setProperty("--i", i);
  el.dataset.i = i;
  el.textContent = OP_LABELS[key];
  reel.appendChild(el);
});
const items = [...reel.children];

let idx = 0;
let activeOp = ORDER[0];

function counts() {
  const i = input.value ? linesOf(input.value).length : 0;
  const o = output.value ? linesOf(output.value).length : 0;
  document.getElementById("tt-in-count").textContent = `${i} line${i === 1 ? "" : "s"}`;
  document.getElementById("tt-out-count").textContent = `${o} line${o === 1 ? "" : "s"}`;
}

function refresh() {
  output.value = input.value ? ops[activeOp](linesOf(input.value)).join("\n") : "";
  opLabel.textContent = OP_LABELS[activeOp];
  counts();
}

// Rotate the reel to the active op and fade each item by its distance from the
// centre, so the middle reads dark and the edges melt into the page.
function paint() {
  reel.style.setProperty("--sel", idx);
  spinner.setAttribute("aria-valuetext", OP_LABELS[activeOp]);
  items.forEach((el, i) => {
    el.classList.toggle("is-sel", i === idx);
    el.style.opacity = String(Math.max(0, 1 - Math.abs(i - idx) * 0.26));
  });
}

function goTo(n) {
  n = Math.min(ORDER.length - 1, Math.max(0, n));
  if (n === idx) return;
  idx = n;
  activeOp = ORDER[idx];
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
  if (dragging) goTo(startIdx + Math.round((startY - e.clientY) / 22));
});
const endDrag = () => { dragging = false; spinner.classList.remove("is-dragging"); };
spinner.addEventListener("pointerup", endDrag);
spinner.addEventListener("pointercancel", endDrag);

spinner.addEventListener("click", (e) => {
  const it = e.target.closest(".cc-spinner__item");
  if (it) goTo(Number(it.dataset.i));
});
spinner.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); roll(1); }
  else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); roll(-1); }
});

input.addEventListener("input", refresh);
document.getElementById("tt-example").addEventListener("click", () => { input.value = EXAMPLE; refresh(); });

// Start with the example applied so the output shows a result on load.
input.value = EXAMPLE;
paint();
refresh();
