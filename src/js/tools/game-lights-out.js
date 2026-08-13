// Lights Out — flip a cell and its orthogonal neighbours; clear the whole grid.
// The solver lives in a pure, tested module; this file is the DOM shell.
import { celebrate } from "/js/celebrate.js";
import { N, idx, solve } from "/js/lib/lights-out.js";

const boardEl = document.getElementById("l-board");
const movesEl = document.getElementById("l-moves");
const litEl = document.getElementById("l-lit");
const statusEl = document.getElementById("l-status");
const hintsEl = document.getElementById("l-hints");

let grid, moves, done, hints, tip, last;

// On a 5x5 board most positions can be cleared in well under 15 presses.
function verdict(m) {
  if (m <= 8) return { rank: "Very efficient", note: "A low number of presses for a 5x5 board." };
  if (m <= 14) return { rank: "Efficient", note: "Each press flips a cell and its neighbours, so changes chain across the grid." };
  if (m <= 22) return { rank: "Solved", note: "Working top to bottom, using each row to fix the one above, is the usual method." };
  return { rank: "Solved", note: "You cleared the whole grid." };
}

// Grid distance between two cell indices, used to keep a hint near the play.
const gap = (a, b) => Math.abs(((a / N) | 0) - ((b / N) | 0)) + Math.abs((a % N) - (b % N));
function toggle(r, c) {
  if (r < 0 || c < 0 || r >= N || c >= N) return;
  grid[idx(r, c)] = !grid[idx(r, c)];
}

function press(r, c, count = true) {
  toggle(r, c); toggle(r - 1, c); toggle(r + 1, c); toggle(r, c - 1); toggle(r, c + 1);
  if (count) {
    moves++;
    last = idx(r, c); // where the player is working, so the next hint stays near
    tip = -1; // the board moved on, so the old suggestion is stale
    render();
    if (grid.every((v) => !v)) {
      done = true;
      const v = verdict(moves);
      const used = hints ? ` ${hints} hint${hints === 1 ? "" : "s"} used.` : "";
      statusEl.innerHTML = `${v.rank}. Cleared in ${moves} moves.${used}<span class="verdict-sub">${v.note}</span>`;
      render();
      celebrate(boardEl, { text: "Lights out", sub: `${moves} moves`, tone: "cool" });
    }
  }
}

function render() {
  boardEl.innerHTML = "";
  grid.forEach((on, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = (on ? "on" : "") + (i === tip ? " tip" : "");
    b.setAttribute("aria-label", `${on ? "lit" : "off"} cell${i === tip ? ", suggested" : ""}`);
    b.disabled = done;
    b.addEventListener("click", () => { if (!done) press(Math.floor(i / N), i % N); });
    boardEl.appendChild(b);
  });
  movesEl.textContent = moves;
  litEl.textContent = grid.filter(Boolean).length;
  hintsEl.textContent = hints;
}

/* A hint is a cell from a shortest solution, and it says how many presses are
 * left on that path. Knowing the board is eight presses from clear, rather than
 * possibly hopeless, is most of what makes this puzzle feel fair. */
function showHint() {
  if (done) return;
  const answer = solve(grid);
  if (!answer || !answer.length) return;
  // Order never matters in a Lights Out solution, so any cell in the set is an
  // equally valid next press. Always marking the topmost-leftmost one made the
  // hint feel stuck near the corner once the player had moved on elsewhere, so
  // once play has begun point at the solution cell nearest their last move and
  // the hint follows them across the board. Before the first move, the corner
  // is as good a starting point as any.
  tip = last < 0
    ? answer[0]
    : answer.reduce((a, b) => (gap(b, last) < gap(a, last) ? b : a));
  hints++;
  const left = answer.length;
  statusEl.innerHTML = `Press the marked cell.<span class="verdict-sub">${left} press${left === 1 ? "" : "es"} clears the board from here, and this is one of them.</span>`;
  render();
}

function newPuzzle() {
  grid = Array(N * N).fill(false);
  done = false; moves = 0; hints = 0; tip = -1; last = -1;
  // Build a guaranteed-solvable board by pressing random cells from all-off.
  const presses = 5 + Math.floor(Math.random() * 8);
  for (let n = 0; n < presses; n++) press(Math.floor(Math.random() * N), Math.floor(Math.random() * N), false);
  if (grid.every((v) => !v)) return newPuzzle(); // never start solved
  moves = 0;
  statusEl.textContent = "";
  render();
}

document.getElementById("l-new").addEventListener("click", newPuzzle);
document.getElementById("l-hint").addEventListener("click", showHint);
newPuzzle();
