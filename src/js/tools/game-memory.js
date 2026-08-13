// Memory match — find all 8 pairs in as few moves as possible.
import { celebrate } from "/js/celebrate.js";

const boardEl = document.getElementById("m-board");
const movesEl = document.getElementById("m-moves");
const pairsEl = document.getElementById("m-pairs");
const bestEl = document.getElementById("m-best");
const statusEl = document.getElementById("m-status");
const KEY = "game_memory_best";

const FACES = ["🍎", "🚀", "⭐", "🎈", "🐱", "🌙", "🍕", "🎸"];
let deck, flipped, matched, moves, busy;
let best = Number(localStorage.getItem(KEY)) || 0;
bestEl.textContent = best || "—";

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function render() {
  boardEl.innerHTML = "";
  deck.forEach((face, i) => {
    const b = document.createElement("button");
    b.type = "button";
    const up = flipped.includes(i), done = matched.has(i);
    b.textContent = up || done ? face : "";
    b.className = done ? "done" : up ? "up" : "";
    b.disabled = done || busy;
    b.setAttribute("aria-label", up || done ? face : "face-down card");
    b.addEventListener("click", () => flip(i));
    boardEl.appendChild(b);
  });
  pairsEl.textContent = `${matched.size / 2} / ${FACES.length}`;
  movesEl.textContent = moves;
}

function flip(i) {
  if (busy || flipped.includes(i) || matched.has(i)) return;
  flipped.push(i);
  if (flipped.length === 2) {
    moves++;
    const [a, b] = flipped;
    if (deck[a] === deck[b]) {
      matched.add(a); matched.add(b);
      flipped = [];
      render();
      if (matched.size === deck.length) win();
    } else {
      busy = true;
      render();
      setTimeout(() => { flipped = []; busy = false; render(); }, 750);
      return;
    }
  }
  render();
}

// There are 8 pairs, so a game with no repeated cards takes 8 moves.
function verdict(m) {
  if (m <= 10) return { rank: "Very efficient", note: "A game with no repeats is 8 moves, so this was close to it." };
  if (m <= 14) return { rank: "Efficient", note: "You repeated only a few cards." };
  if (m <= 20) return { rank: "Solved", note: "Fixing each card to a spot on the grid helps you repeat fewer of them." };
  return { rank: "Solved", note: "Try to remember where a card was the first time you turned it over." };
}

function win() {
  const v = verdict(moves);
  statusEl.innerHTML = `${v.rank}. Solved in ${moves} moves.<span class="verdict-sub">${v.note}</span>`;
  celebrate(boardEl, { text: "All pairs", sub: `${moves} moves` });
  if (!best || moves < best) { best = moves; bestEl.textContent = best; try { localStorage.setItem(KEY, best); } catch {} }
}

function newGame() {
  deck = shuffle([...FACES, ...FACES]);
  flipped = []; matched = new Set(); moves = 0; busy = false;
  statusEl.textContent = "";
  render();
}

document.getElementById("m-new").addEventListener("click", newGame);
newGame();
