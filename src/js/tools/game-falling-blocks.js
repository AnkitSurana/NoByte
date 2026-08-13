// Falling blocks — a tetromino stacking puzzle on canvas. Keyboard + touch.
const canvas = document.getElementById("fb-canvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("fb-score");
const linesEl = document.getElementById("fb-lines");
const levelEl = document.getElementById("fb-level");
const statusEl = document.getElementById("fb-status");

const wrap = document.getElementById("fb-wrap");
const pauseBtn = document.getElementById("fb-pause");
const COLS = 10, ROWS = 20;
let CELL = 20; // recomputed to fit the display crisply

// Size the backing store to the display width times the device pixel ratio so
// every cell is the same size and stays sharp at any width.
function fit() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = wrap.clientWidth - parseFloat(getComputedStyle(wrap).paddingLeft) * 2;
  if (cssW <= 0) return;
  CELL = cssW / COLS;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssW * (ROWS / COLS) * dpr);
  canvas.style.height = cssW * (ROWS / COLS) + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

const SHAPES = {
  I: { c: "#38BDF8", m: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  O: { c: "#FACC15", m: [[1, 1], [1, 1]] },
  T: { c: "#C084FC", m: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  S: { c: "#4ADE80", m: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  Z: { c: "#FB7185", m: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
  J: { c: "#60A5FA", m: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  L: { c: "#FB923C", m: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
};
const KEYS = Object.keys(SHAPES);

let board, cur, score, lines, level, over, paused, raf, dropTimer, lastTime, bag;

const rotateCW = (m) => m[0].map((_, i) => m.map((row) => row[i]).reverse());

function newPiece() {
  if (!bag || !bag.length) bag = KEYS.slice().sort(() => Math.random() - 0.5);
  const s = SHAPES[bag.pop()];
  return { m: s.m.map((r) => r.slice()), c: s.c, x: Math.floor((COLS - s.m[0].length) / 2), y: 0 };
}

function collides(piece, x, y, m = piece.m) {
  for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
    if (!m[r][c]) continue;
    const nx = x + c, ny = y + r;
    if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
    if (ny >= 0 && board[ny][nx]) return true;
  }
  return false;
}

function merge() {
  cur.m.forEach((row, r) => row.forEach((v, c) => {
    if (v && cur.y + r >= 0) board[cur.y + r][cur.x + c] = cur.c;
  }));
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v)) { board.splice(r, 1); board.unshift(Array(COLS).fill(0)); cleared++; r++; }
  }
  if (cleared) {
    lines += cleared;
    score += [0, 40, 100, 300, 1200][cleared] * level;
    level = Math.floor(lines / 10) + 1;
    scoreEl.textContent = score; linesEl.textContent = lines; levelEl.textContent = level;
  }
}

function lock() {
  merge();
  clearLines();
  cur = newPiece();
  if (collides(cur, cur.x, cur.y)) gameOver();
}

function move(dx) { if (!collides(cur, cur.x + dx, cur.y)) cur.x += dx; }
function softDrop() {
  if (!collides(cur, cur.x, cur.y + 1)) { cur.y++; }
  else lock();
}
function hardDrop() {
  while (!collides(cur, cur.x, cur.y + 1)) cur.y++;
  lock();
}
function rotate() {
  const m = rotateCW(cur.m);
  for (const dx of [0, -1, 1, -2, 2]) {
    if (!collides(cur, cur.x + dx, cur.y, m)) { cur.m = m; cur.x += dx; return; }
  }
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
  ctx.strokeStyle = "rgba(29,26,22,.55)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x * CELL + 0.75, y * CELL + 0.75, CELL - 1.5, CELL - 1.5);
}
function draw() {
  if (!board) return;
  const cs = getComputedStyle(document.documentElement);
  const ink = (cs.getPropertyValue("--ink") || "#1D1A16").trim();
  const W = COLS * CELL, H = ROWS * CELL;
  ctx.fillStyle = (cs.getPropertyValue("--paper-2") || "#FFF3DE").trim();
  ctx.fillRect(0, 0, W, H); // drawing space is CSS px (ctx is dpr-scaled)
  // grid lines so the well reads as a playfield
  ctx.strokeStyle = ink; ctx.globalAlpha = 0.10; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < COLS; c++) { ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H); }
  for (let r = 1; r < ROWS; r++) { ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); }
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (board[r][c]) drawCell(c, r, board[r][c]);
  if (cur) {
    // ghost: where the piece would land, drawn faint
    let gy = cur.y;
    while (!collides(cur, cur.x, gy + 1)) gy++;
    if (gy > cur.y) {
      ctx.globalAlpha = 0.22;
      cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && gy + r >= 0) drawCell(cur.x + c, gy + r, cur.c); }));
      ctx.globalAlpha = 1;
    }
    cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && cur.y + r >= 0) drawCell(cur.x + c, cur.y + r, cur.c); }));
  }
}

function loop(t) {
  if (over || paused) return;
  if (!lastTime) lastTime = t;
  dropTimer += t - lastTime;
  lastTime = t;
  const interval = Math.max(90, 800 - (level - 1) * 70);
  if (dropTimer > interval) { softDrop(); dropTimer = 0; }
  draw();
  raf = requestAnimationFrame(loop);
}

// Lines cleared is the clearest measure; the level shows how fast it got.
function verdict(n, lvl) {
  if (n === 0) return { rank: "No lines cleared", note: "A line clears when a row fills completely. Keep the surface flat and leave a gap for a long piece." };
  if (n < 5) return { rank: "A few lines", note: "Rotating a piece before it lands gives you more places to put it." };
  if (n < 15) return { rank: "Steady clearing", note: "A good clear rate. The pieces speed up as the level rises." };
  if (n < 30) return { rank: "Long game", note: `Reached level ${lvl}. Watching the next piece early helps at this speed.` };
  if (n < 50) return { rank: "Very long game", note: "This far in, the drop speed leaves little time to decide where each piece goes." };
  return { rank: "Marathon", note: `${n} lines at level ${lvl}. The pieces fall quickly at this stage.` };
}

function gameOver() {
  over = true;
  cancelAnimationFrame(raf);
  pauseBtn.disabled = true;
  const v = verdict(lines, level);
  statusEl.innerHTML = `${v.rank}. Score ${score}, ${lines} lines.<span class="verdict-sub">${v.note}</span>`;
}

function togglePause() {
  if (over) return;
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
  statusEl.textContent = paused ? "Paused." : "";
  if (!paused) { lastTime = 0; raf = requestAnimationFrame(loop); }
}

function newGame() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  score = 0; lines = 0; level = 1; over = false; paused = false; bag = null;
  dropTimer = 0; lastTime = 0;
  scoreEl.textContent = 0; linesEl.textContent = 0; levelEl.textContent = 1;
  statusEl.textContent = "";
  pauseBtn.disabled = false; pauseBtn.textContent = "Pause";
  cur = newPiece();
  fit();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

const ACTIONS = { left: () => move(-1), right: () => move(1), down: softDrop, drop: hardDrop, rotate };
function act(name) {
  if (over || (paused && name !== undefined)) return;
  ACTIONS[name]?.();
  draw();
}

addEventListener("keydown", (e) => {
  if (e.key === "p" || e.key === "P") { togglePause(); return; }
  const map = { ArrowLeft: "left", ArrowRight: "right", ArrowDown: "down", ArrowUp: "rotate", " ": "drop" };
  if (map[e.key]) { e.preventDefault(); act(map[e.key]); }
});
/* On-screen pad. Holding a key repeats it, the way holding an arrow key does —
   without that, moving a piece four columns means four separate taps. Rotate
   and hard-drop are one-shot, since repeating them is never what you want. */
const REPEATABLE = new Set(["left", "right", "down"]);
document.querySelectorAll(".gpad [data-act]").forEach((btn) => {
  const name = btn.dataset.act;
  let holdTimer = null, repeat = null;
  const stop = () => {
    clearTimeout(holdTimer); clearInterval(repeat);
    holdTimer = repeat = null;
    btn.removeAttribute("data-held");
  };
  const start = (e) => {
    e.preventDefault();               // no synthetic click, no text selection
    if (holdTimer || repeat) return;  // ignore a second pointer on the same key
    act(name);
    btn.setAttribute("data-held", "true");
    if (!REPEATABLE.has(name)) return;
    holdTimer = setTimeout(() => { repeat = setInterval(() => act(name), 70); }, 220);
  };
  btn.addEventListener("pointerdown", start);
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointercancel", stop);
  btn.addEventListener("pointerleave", stop);
  // a lifted finger outside the key still has to end the repeat
  btn.addEventListener("lostpointercapture", stop);
});

// Board gestures: tap = rotate, drag left/right = move a cell at a time, swipe down = hard drop.
let tsx = 0, tsy = 0, trefx = 0, tmoved = false, tst = 0;
canvas.addEventListener("touchstart", (e) => {
  const t = e.touches[0];
  tsx = trefx = t.clientX; tsy = t.clientY; tst = Date.now(); tmoved = false;
}, { passive: true });
canvas.addEventListener("touchmove", (e) => {
  if (over || paused) return;
  const x = e.touches[0].clientX;
  while (x - trefx > 26) { act("right"); trefx += 26; tmoved = true; }
  while (x - trefx < -26) { act("left"); trefx -= 26; tmoved = true; }
}, { passive: true });
canvas.addEventListener("touchend", (e) => {
  if (over || paused || tmoved) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - tsx, dy = t.clientY - tsy, dt = Date.now() - tst;
  if (dy > 40 && dy > Math.abs(dx)) act("drop");                          // swipe down
  else if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 300) act("rotate"); // tap
}, { passive: true });

pauseBtn.addEventListener("click", togglePause);
document.getElementById("fb-new").addEventListener("click", newGame);
addEventListener("resize", fit);
newGame();
