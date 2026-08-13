// Minesweeper. Mines are placed after the first click so it is always safe.
import { celebrate } from "/js/celebrate.js";

const boardEl = document.getElementById("mn-board");
const leftEl = document.getElementById("mn-left");
const timeEl = document.getElementById("mn-time");
const statusEl = document.getElementById("mn-status");
const diffEl = document.getElementById("mn-diff");
const flagBtn = document.getElementById("mn-flag");

let rows, cols, mineCount, cells, started, over, flagMode = false, timer, seconds, revealedCount;
// Set by a long-press so the click it generates does not also reveal the cell.
let suppressClickUntil = 0;

// each cell: { mine, n, rev, flag }
function blank() {
  cells = Array.from({ length: rows * cols }, () => ({ mine: false, n: 0, rev: false, flag: false }));
}
const at = (r, c) => cells[r * cols + c];
const inBounds = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols;
function neighbours(r, c) {
  const out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (dr || dc) { if (inBounds(r + dr, c + dc)) out.push([r + dr, c + dc]); }
  }
  return out;
}

function placeMines(safeR, safeC) {
  const forbidden = new Set([safeR * cols + safeC, ...neighbours(safeR, safeC).map(([r, c]) => r * cols + c)]);
  let placed = 0;
  while (placed < mineCount) {
    const i = Math.floor(Math.random() * cells.length);
    if (cells[i].mine || forbidden.has(i)) continue;
    cells[i].mine = true; placed++;
  }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!at(r, c).mine) at(r, c).n = neighbours(r, c).filter(([nr, nc]) => at(nr, nc).mine).length;
  }
}

function reveal(r, c) {
  const cell = at(r, c);
  if (cell.rev || cell.flag) return;
  cell.rev = true; revealedCount++;
  if (cell.n === 0 && !cell.mine) neighbours(r, c).forEach(([nr, nc]) => reveal(nr, nc));
}

function tick() { seconds++; timeEl.textContent = seconds; }

function startTimer() {
  seconds = 0; timeEl.textContent = 0;
  clearInterval(timer); timer = setInterval(tick, 1000);
}

function flagsUsed() { return cells.filter((c) => c.flag && !c.rev).length; }
function updateLeft() { leftEl.textContent = mineCount - flagsUsed(); }

// Pace measured as seconds spent per mine, which holds across board sizes.
function verdict(secs, mines) {
  const pace = secs / mines;
  if (pace < 2) return { rank: "Very fast clear", note: "That works out to under two seconds per mine." };
  if (pace < 4) return { rank: "Fast clear", note: "Under four seconds per mine on this board." };
  if (pace < 8) return { rank: "Steady clear", note: "A careful solve with no wrong clicks." };
  return { rank: "Cleared", note: "To go faster, use a number to open its safe neighbours in one move." };
}

function endGame(won) {
  over = true; clearInterval(timer);
  if (!won) cells.forEach((c) => { if (c.mine) c.rev = true; });
  if (won) {
    const v = verdict(seconds, mineCount);
    statusEl.innerHTML = `${v.rank}. Cleared in ${seconds}s.<span class="verdict-sub">${v.note}</span>`;
    celebrate(boardEl, { text: "Board cleared", sub: `${mineCount} mines, ${seconds}s` });
  } else {
    statusEl.innerHTML = `You hit a mine.<span class="verdict-sub">Flag the cells you are sure of, then read the numbers around them to find the safe squares.</span>`;
  }
  render();
}

function checkWin() {
  if (revealedCount === rows * cols - mineCount) endGame(true);
}

function handle(r, c, flagging) {
  if (over) return;
  const cell = at(r, c);
  if (flagging) {
    if (cell.rev) return;
    cell.flag = !cell.flag;
    updateLeft(); render();
    return;
  }
  if (cell.flag) return;
  if (!started) { placeMines(r, c); started = true; startTimer(); }
  if (cell.mine) return endGame(false);
  reveal(r, c);
  render();
  checkWin();
}

function render() {
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  boardEl.style.setProperty("--cols", cols);
  boardEl.innerHTML = "";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cell = at(r, c);
    const b = document.createElement("button");
    b.type = "button";
    if (cell.rev) {
      b.classList.add("rev");
      if (cell.mine) { b.classList.add("mine"); b.textContent = "💣"; }
      else if (cell.n) { b.dataset.n = cell.n; b.textContent = cell.n; }
    } else if (cell.flag) {
      b.textContent = "🚩";
    }
    // Long-press is the touch equivalent of right-click. Flagging re-renders
    // the board, which destroys this button mid-gesture, so the "ignore the
    // click that follows" flag has to live outside the cell — hence the
    // module-level deadline rather than a local variable.
    let holdTimer = null;
    const cancelHold = () => { clearTimeout(holdTimer); holdTimer = null; };
    b.addEventListener("touchstart", () => {
      holdTimer = setTimeout(() => { suppressClickUntil = Date.now() + 700; handle(r, c, true); }, 450);
    }, { passive: true });
    b.addEventListener("touchmove", cancelHold, { passive: true });   // a scroll, not a press
    b.addEventListener("touchend", cancelHold);
    b.addEventListener("touchcancel", cancelHold);
    b.addEventListener("click", () => {
      if (Date.now() < suppressClickUntil) return;
      handle(r, c, flagMode);
    });
    b.addEventListener("contextmenu", (e) => { e.preventDefault(); handle(r, c, true); });
    boardEl.appendChild(b);
  }
}

function newGame() {
  [rows, cols, mineCount] = diffEl.value.split(",").map(Number);
  started = false; over = false; revealedCount = 0; seconds = 0;
  clearInterval(timer); timeEl.textContent = 0;
  blank(); updateLeft(); statusEl.textContent = "";
  render();
}

flagBtn.addEventListener("click", () => {
  flagMode = !flagMode;
  flagBtn.setAttribute("aria-pressed", String(flagMode));
  flagBtn.textContent = `🚩 Flag: ${flagMode ? "on" : "off"}`;
});
diffEl.addEventListener("change", newGame);
document.getElementById("mn-new").addEventListener("click", newGame);
newGame();
