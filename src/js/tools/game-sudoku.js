// Sudoku — generates puzzles with a unique solution via backtracking.
import { celebrate } from "/js/celebrate.js";

const boardEl = document.getElementById("su-board");
const padEl = document.getElementById("su-pad");
const statusEl = document.getElementById("su-status");
const diffEl = document.getElementById("su-diff");

let puzzle, given, solution, selected = -1;

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function canPlace(g, i, v) {
  const r = Math.floor(i / 9), c = i % 9;
  for (let k = 0; k < 9; k++) {
    if (g[r * 9 + k] === v || g[k * 9 + c] === v) return false;
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
    if (g[(br + dr) * 9 + (bc + dc)] === v) return false;
  }
  return true;
}

// Fill the first empty cell recursively; digit order randomised for variety.
function fill(g) {
  const i = g.indexOf(0);
  if (i === -1) return true;
  for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (canPlace(g, i, v)) { g[i] = v; if (fill(g)) return true; g[i] = 0; }
  }
  return false;
}

// Count solutions up to `limit` (2 is enough to prove non-uniqueness).
function countSolutions(g, limit = 2) {
  const i = g.indexOf(0);
  if (i === -1) return 1;
  let total = 0;
  for (let v = 1; v <= 9; v++) {
    if (canPlace(g, i, v)) {
      g[i] = v;
      total += countSolutions(g, limit);
      g[i] = 0;
      if (total >= limit) break;
    }
  }
  return total;
}

function generate(clues) {
  solution = Array(81).fill(0);
  fill(solution);
  puzzle = solution.slice();
  // Remove cells while a unique solution survives.
  for (const i of shuffle([...Array(81).keys()])) {
    if (puzzle.filter((v) => v).length <= clues) break;
    const saved = puzzle[i];
    puzzle[i] = 0;
    const copy = puzzle.slice();
    if (countSolutions(copy) !== 1) puzzle[i] = saved; // revert if now ambiguous
  }
  given = puzzle.map((v) => v !== 0);
}

function conflicts() {
  const bad = new Set();
  for (let i = 0; i < 81; i++) {
    const v = puzzle[i];
    if (!v) continue;
    const copy = puzzle.slice(); copy[i] = 0;
    if (!canPlace(copy, i, v)) bad.add(i);
  }
  return bad;
}

function render() {
  const bad = conflicts();
  boardEl.innerHTML = "";
  for (let i = 0; i < 81; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = puzzle[i] || "";
    if (given[i]) b.classList.add("given");
    if (i === selected) b.classList.add("sel");
    if (bad.has(i)) b.classList.add("bad");
    b.addEventListener("click", () => { if (!given[i]) { selected = i; render(); } });
    boardEl.appendChild(b);
  }
}

// The fewer starting clues, the more of the grid you had to work out yourself.
function verdict(clues) {
  if (clues <= 27) return { rank: "Hard puzzle solved", note: "A hard grid starts with fewer given numbers, so more of it comes from deduction." };
  if (clues <= 32) return { rank: "Medium puzzle solved", note: "A medium grid leaves real gaps to reason through rather than fill in directly." };
  return { rank: "Solved", note: "Every row, column and box checks out. Try fewer clues next for a harder puzzle." };
}

function place(v) {
  if (selected < 0 || given[selected]) return;
  puzzle[selected] = v;
  statusEl.textContent = "";
  render();
  if (puzzle.every((x, i) => x === solution[i])) {
    const vd = verdict(Number(diffEl.value));
    statusEl.innerHTML = `${vd.rank}<span class="verdict-sub">${vd.note}</span>`;
    celebrate(boardEl, { text: "Grid solved", sub: "Every row, column and box", burst: { n: 70 } });
  }
}

function buildPad() {
  padEl.innerHTML = "";
  for (let v = 1; v <= 9; v++) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "gkey"; b.textContent = v;
    b.addEventListener("click", () => place(v));
    padEl.appendChild(b);
  }
  const erase = document.createElement("button");
  erase.type = "button"; erase.className = "gkey";
  // a sprite icon, not the ⌫ character: that glyph comes from a fallback font
  // and never matches the weight of the digits beside it
  erase.setAttribute("aria-label", "Erase");
  erase.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#delete"></use></svg>';
  erase.addEventListener("click", () => place(0));
  padEl.appendChild(erase);
}

addEventListener("keydown", (e) => {
  if (selected < 0) return;
  if (/^[1-9]$/.test(e.key)) place(Number(e.key));
  else if (e.key === "0" || e.key === "Backspace" || e.key === "Delete") place(0);
});

function newGame() {
  statusEl.textContent = "Generating…";
  // let the status paint before the (brief) synchronous generation
  setTimeout(() => {
    generate(Number(diffEl.value));
    selected = -1;
    statusEl.textContent = "";
    render();
  }, 20);
}

document.getElementById("su-check").addEventListener("click", () => {
  const bad = conflicts();
  const filled = puzzle.every((v) => v);
  statusEl.textContent = bad.size ? "Some numbers conflict." : filled ? "No conflicts, looks complete." : "No conflicts so far.";
});
document.getElementById("su-solve").addEventListener("click", () => {
  puzzle = solution.slice(); selected = -1; statusEl.textContent = "Here is the solution.";
  render();
});
diffEl.addEventListener("change", newGame);
document.getElementById("su-new").addEventListener("click", newGame);

buildPad();
newGame();
