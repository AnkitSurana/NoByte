// Sliding puzzle (15-puzzle). Shuffle by legal moves so it is always solvable.
import { celebrate } from "/js/celebrate.js";

const boardEl = document.getElementById("p-board");
const movesEl = document.getElementById("p-moves");
const bestEl = document.getElementById("p-best");
const statusEl = document.getElementById("p-status");
const KEY = "game_sliding_best";

const N = 4;
let tiles, moves, solving;
let best = Number(localStorage.getItem(KEY)) || 0;
bestEl.textContent = best || "—";

const SOLVED = [...Array(N * N - 1).keys()].map((i) => i + 1).concat(0);
const isSolved = () => tiles.every((t, i) => t === SOLVED[i]);
const gap = () => tiles.indexOf(0);
const adjacent = (i, j) => {
  const [ri, ci] = [Math.floor(i / N), i % N];
  const [rj, cj] = [Math.floor(j / N), j % N];
  return Math.abs(ri - rj) + Math.abs(ci - cj) === 1;
};

function render() {
  boardEl.innerHTML = "";
  tiles.forEach((t, i) => {
    const b = document.createElement("button");
    b.type = "button";
    if (t === 0) { b.className = "gap"; b.disabled = true; b.setAttribute("aria-hidden", "true"); }
    else { b.textContent = t; b.addEventListener("click", () => slide(i)); }
    boardEl.appendChild(b);
  });
  movesEl.textContent = moves;
}

function slide(i, silent = false) {
  const g = gap();
  if (!adjacent(i, g)) return false;
  [tiles[i], tiles[g]] = [tiles[g], tiles[i]];
  if (silent) return true;
  moves++;
  render();
  if (isSolved()) win();
  return true;
}

// Any 15-puzzle can be solved in at most about 80 moves; casual solves run higher.
function verdict(m) {
  if (m <= 80) return { rank: "Very efficient", note: "Even the hardest starting position can be solved in about 80 moves." };
  if (m <= 140) return { rank: "Efficient", note: "Solving one row at a time keeps the move count down." };
  if (m <= 220) return { rank: "Solved", note: "Fixing the top row and left column first turns the rest into a smaller puzzle." };
  return { rank: "Solved", note: "Working from the corners in, top row then left column, needs fewer moves." };
}

function win() {
  const v = verdict(moves);
  statusEl.innerHTML = `${v.rank}. Solved in ${moves} moves.<span class="verdict-sub">${v.note}</span>`;
  celebrate(boardEl, { text: "In order", sub: `${moves} moves`, tone: "cool" });
  if (!best || moves < best) { best = moves; bestEl.textContent = best; try { localStorage.setItem(KEY, best); } catch {} }
}

function shuffle() {
  tiles = SOLVED.slice();
  let prev = -1;
  for (let n = 0; n < 200; n++) {
    const g = gap();
    const neighbours = [g - 1, g + 1, g - N, g + N].filter((j) => j >= 0 && j < N * N && adjacent(j, g) && j !== prev);
    const pick = neighbours[Math.floor(Math.random() * neighbours.length)];
    prev = g;
    [tiles[g], tiles[pick]] = [tiles[pick], tiles[g]];
  }
  moves = 0;
  statusEl.textContent = "";
  if (isSolved()) return shuffle(); // extremely unlikely, but never start solved
  render();
}

document.getElementById("p-new").addEventListener("click", shuffle);
shuffle();
