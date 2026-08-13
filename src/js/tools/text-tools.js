// Text line tools — sort, dedupe, trim, reverse, number. All local.
const input = document.getElementById("tt-input");
const output = document.getElementById("tt-output");

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

function counts() {
  const i = input.value ? linesOf(input.value).length : 0;
  const o = output.value ? linesOf(output.value).length : 0;
  document.getElementById("tt-in-count").textContent = `${i} line${i === 1 ? "" : "s"}`;
  document.getElementById("tt-out-count").textContent = `${o} line${o === 1 ? "" : "s"}`;
}

document.querySelectorAll("[data-op]").forEach((btn) => {
  btn.addEventListener("click", () => {
    // chain from the current output if there is one, otherwise the input
    const source = output.value || input.value;
    output.value = ops[btn.dataset.op](linesOf(source)).join("\n");
    counts();
  });
});

input.addEventListener("input", () => { output.value = ""; counts(); });
document.getElementById("tt-example").addEventListener("click", () => { input.value = EXAMPLE; output.value = ""; counts(); });
document.getElementById("tt-use-output").addEventListener("click", () => { input.value = output.value; output.value = ""; counts(); });
document.getElementById("tt-clear").addEventListener("click", () => { input.value = ""; output.value = ""; counts(); input.focus(); });
counts();
