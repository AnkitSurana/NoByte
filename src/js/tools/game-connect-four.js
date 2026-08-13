// Connect Four vs an alpha-beta AI. You are 1 (red), computer is 2 (yellow).
import { celebrate } from "/js/celebrate.js";

const boardEl = document.getElementById("c4-board");
const statusEl = document.getElementById("c4-status");
const youScore = document.getElementById("c4-you");
const cpuScore = document.getElementById("c4-cpu");
const ROWS = 6, COLS = 7, DEPTH = 5;

let grid, locked, over;

const make = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));
const validCols = (g) => [...Array(COLS).keys()].filter((c) => g[0][c] === 0);
function drop(g, c, p) { for (let r = ROWS - 1; r >= 0; r--) if (!g[r][c]) { g[r][c] = p; return r; } return -1; }

// Return the four winning cells for player p, or null.
function winLine(g, p) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (g[r][c] !== p) continue;
    for (const [dr, dc] of dirs) {
      const line = [[r, c]];
      for (let k = 1; k < 4; k++) {
        const nr = r + dr * k, nc = c + dc * k;
        if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS || g[nr][nc] !== p) break;
        line.push([nr, nc]);
      }
      if (line.length === 4) return line;
    }
  }
  return null;
}
const full = (g) => g[0].every((v) => v);

// Heuristic: score every length-4 window from the AI's perspective.
function windowScore(cells, ai) {
  const me = cells.filter((v) => v === ai).length;
  const opp = cells.filter((v) => v === (ai === 2 ? 1 : 2)).length;
  const empty = cells.filter((v) => v === 0).length;
  if (me && opp) return 0;
  if (me === 4) return 10000;
  if (me === 3 && empty === 1) return 50;
  if (me === 2 && empty === 2) return 8;
  if (opp === 3 && empty === 1) return -80; // block threats a bit harder
  if (opp === 2 && empty === 2) return -6;
  return 0;
}
function evaluate(g, ai) {
  let s = 0;
  // centre preference
  for (let r = 0; r < ROWS; r++) if (g[r][3] === ai) s += 4;
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) for (const [dr, dc] of dirs) {
    const cells = [];
    for (let k = 0; k < 4; k++) {
      const nr = r + dr * k, nc = c + dc * k;
      if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS) { cells.length = 0; break; }
      cells.push(g[nr][nc]);
    }
    if (cells.length === 4) s += windowScore(cells, ai);
  }
  return s;
}

function negamax(g, depth, alpha, beta, player, ai) {
  if (winLine(g, 1)) return { score: ai === 1 ? 1e6 + depth : -1e6 - depth };
  if (winLine(g, 2)) return { score: ai === 2 ? 1e6 + depth : -1e6 - depth };
  const cols = validCols(g);
  if (depth === 0 || !cols.length) return { score: evaluate(g, ai) };

  let best = { score: player === ai ? -Infinity : Infinity, col: cols[0] };
  // try centre-out for better pruning
  cols.sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));
  for (const c of cols) {
    const g2 = g.map((row) => row.slice());
    drop(g2, c, player);
    const s = negamax(g2, depth - 1, alpha, beta, player === 1 ? 2 : 1, ai).score;
    if (player === ai) {
      if (s > best.score) best = { score: s, col: c };
      alpha = Math.max(alpha, s);
    } else {
      if (s < best.score) best = { score: s, col: c };
      beta = Math.min(beta, s);
    }
    if (alpha >= beta) break;
  }
  return best;
}

function render(winCells = []) {
  boardEl.innerHTML = "";
  const win = new Set(winCells.map(([r, c]) => r * COLS + c));
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const slot = document.createElement("div");
    slot.className = "slot" + (grid[r][c] === 1 ? " you" : grid[r][c] === 2 ? " cpu" : "") + (win.has(r * COLS + c) ? " win" : "");
    slot.addEventListener("click", () => playColumn(c));
    boardEl.appendChild(slot);
  }
}

function endRound(who) {
  over = true; locked = true;
  if (who === 1) {
    youScore.textContent = +youScore.textContent + 1;
    statusEl.innerHTML = `You win.<span class="verdict-sub">The computer looks several moves ahead, so beating it usually means setting up two threats it cannot block at once.</span>`;
    celebrate(boardEl, { text: "Four in a row", sub: "You beat the computer", burst: { n: 70 } });
  }
  else if (who === 2) { cpuScore.textContent = +cpuScore.textContent + 1; statusEl.innerHTML = `The computer wins.<span class="verdict-sub">It looks for double threats. The centre column is the strongest place to play, since it fits into the most lines.</span>`; }
  else statusEl.innerHTML = `Draw.<span class="verdict-sub">The board filled with no line of four for either side.</span>`;
}

function playColumn(c) {
  if (locked || over || grid[0][c]) return;
  drop(grid, c, 1);
  let line = winLine(grid, 1);
  render(line || []);
  if (line) return endRound(1);
  if (full(grid)) return endRound(0);
  locked = true;
  statusEl.textContent = "Computer thinking…";
  setTimeout(aiMove, 240);
}

function aiMove() {
  const { col } = negamax(grid, DEPTH, -Infinity, Infinity, 2, 2);
  drop(grid, col ?? validCols(grid)[0], 2);
  const line = winLine(grid, 2);
  render(line || []);
  if (line) return endRound(2);
  if (full(grid)) return endRound(0);
  locked = false;
  statusEl.textContent = "Your move.";
}

function newGame() {
  grid = make(); locked = false; over = false;
  statusEl.textContent = "Your move. Drop a red disc.";
  render();
}

document.getElementById("c4-new").addEventListener("click", newGame);
newGame();
