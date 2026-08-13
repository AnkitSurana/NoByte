// 2048 — slide and merge tiles to reach 2048. Keyboard + touch, best score local.
import { celebrate } from "/js/celebrate.js";

const boardEl = document.getElementById("g-board");
const scoreEl = document.getElementById("g-score");
const bestEl = document.getElementById("g-best");
const statusEl = document.getElementById("g-status");
const N = 4;
const KEY = "game_2048_best";

let grid, score, over, won;
let best = Number(localStorage.getItem(KEY)) || 0;
bestEl.textContent = best;

const empty = () => Array.from({ length: N }, () => Array(N).fill(0));

function addRandom() {
  const cells = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) cells.push([r, c]);
  if (!cells.length) return;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

// Slide+merge a single row to the left. Returns [newRow, gained, moved].
function slideRow(row) {
  const nums = row.filter((n) => n);
  let gained = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    if (nums[i] === nums[i + 1]) { nums[i] *= 2; gained += nums[i]; nums.splice(i + 1, 1); }
  }
  while (nums.length < N) nums.push(0);
  const moved = nums.some((n, i) => n !== row[i]);
  return [nums, gained, moved];
}

const rotateCW = (g) => g[0].map((_, c) => g.map((row) => row[c]).reverse());
const rotateCCW = (g) => g[0].map((_, c) => g.map((row) => row[N - 1 - c]));

// dir: 0 left, 1 up, 2 right, 3 down. Normalise to a left-slide via rotation.
function move(dir) {
  let g = grid;
  for (let i = 0; i < dir; i++) g = rotateCW(g);
  let moved = false, gained = 0;
  g = g.map((row) => { const [nr, gg, mv] = slideRow(row); if (mv) moved = true; gained += gg; return nr; });
  for (let i = 0; i < (4 - dir) % 4; i++) g = rotateCW(g);
  if (!moved) return;
  grid = g;
  score += gained;
  // Once only: 2048 keeps going after the goal, and a popper on every merge
  // past it would wear thin fast.
  if (!won && grid.flat().includes(2048)) {
    won = true;
    celebrate(boardEl, { text: "2048", sub: "Keep going for a higher score", burst: { n: 80 } });
  }
  addRandom();
  if (!canMove()) over = true;
  render();
}

function canMove() {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (!grid[r][c]) return true;
    if (c < N - 1 && grid[r][c] === grid[r][c + 1]) return true;
    if (r < N - 1 && grid[r][c] === grid[r + 1][c]) return true;
  }
  return false;
}

function tileStyle(v) {
  if (!v) return "";
  const level = Math.log2(v);
  const light = Math.max(30, 92 - level * 7);
  const bg = `hsl(35 85% ${light}%)`;
  const fg = light < 55 ? "#FFF8EC" : "#1D1A16";
  return `background:${bg};color:${fg};`;
}

function render() {
  boardEl.innerHTML = "";
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const v = grid[r][c];
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.v = v;
    cell.style.cssText = tileStyle(v);
    cell.textContent = v || "";
    boardEl.appendChild(cell);
  }
  scoreEl.textContent = score;
  if (score > best) { best = score; bestEl.textContent = best; try { localStorage.setItem(KEY, best); } catch {} }
  if (over) {
    const v = verdict(Math.max(...grid.flat()));
    statusEl.innerHTML = `${v.rank}<span class="verdict-sub">${v.note}</span>`;
  } else {
    statusEl.textContent = won ? "You reached 2048! Keep going." : "";
  }
}

// Judged by the highest tile reached, since that is the goal of the game.
function verdict(top) {
  if (top >= 2048) return { rank: "You reached 2048", note: "That is the target tile. Most games end before it." };
  if (top >= 1024) return { rank: "Reached 1024", note: "Merging two 1024 tiles makes 2048, so you were one step away." };
  if (top >= 512) return { rank: "Reached 512", note: "Keeping your largest tile in one corner makes the next merges easier." };
  if (top >= 256) return { rank: "Reached 256", note: "Building in a single corner tends to work better than merging across the board." };
  return { rank: `Best tile was ${top}`, note: "Keeping your biggest tile in a corner and feeding it is the usual approach." };
}

function newGame() {
  grid = empty(); score = 0; over = false; won = false;
  addRandom(); addRandom(); render();
  boardEl.focus();
}

// dir 0 left, 2 right; with this rotation scheme dir 3 slides up and dir 1 down.
const DIRS = { ArrowLeft: 0, ArrowUp: 3, ArrowRight: 2, ArrowDown: 1, a: 0, w: 3, d: 2, s: 1 };
addEventListener("keydown", (e) => {
  const dir = DIRS[e.key];
  if (dir === undefined || over) return;
  e.preventDefault();
  move(dir);
});

// touch swipe
let sx = 0, sy = 0;
boardEl.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
boardEl.addEventListener("touchend", (e) => {
  if (over) return;
  const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 0) : (dy > 0 ? 1 : 3));
});

document.getElementById("g-new").addEventListener("click", newGame);
newGame();
