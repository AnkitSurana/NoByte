// Snake — classic grid arcade game on canvas. Keyboard + touch, best score local.
// The snake stays still until the first move, so it never dies before you start.
const canvas = document.getElementById("s-canvas");
const ctx = canvas.getContext("2d");
const wrap = document.getElementById("s-wrap");
const scoreEl = document.getElementById("s-score");
const bestEl = document.getElementById("s-best");
const statusEl = document.getElementById("s-status");
const timeEl = document.getElementById("s-time");
const pauseBtn = document.getElementById("s-pause");
const KEY = "game_snake_best";

const GRID = 20;             // cells per side
const START_MS = 190;       // slow to begin with
const MIN_MS = 70;          // fastest it gets
let CELL = 20;              // recomputed to fit the display

// Step interval shrinks with score, so the snake gradually speeds up.
const stepMs = () => Math.max(MIN_MS, START_MS - score * 6);
// Each food has a clock; reach it in time or the game ends. The window shrinks as you grow.
const foodMs = () => Math.max(3500, 6500 - score * 150);

let snake, dir, nextDir, food, alive, running, paused, timer, score;
let foodLeft, foodTotal, lastTickTime;
let best = Number(localStorage.getItem(KEY)) || 0;
bestEl.textContent = best;

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Crisp, evenly-sized cells at any display width via a device-pixel-ratio backing store.
function fit() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = wrap.clientWidth - parseFloat(getComputedStyle(wrap).paddingLeft) * 2;
  if (cssW <= 0) return;
  CELL = cssW / GRID;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = canvas.width;
  canvas.style.height = cssW + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function placeFood() {
  do {
    food = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some((s) => s.x === food.x && s.y === food.y));
  foodTotal = foodLeft = foodMs(); // reset the clock for the new food
  updateTime();
}

function updateTime() {
  const secs = Math.max(0, Math.ceil((foodLeft || 0) / 1000));
  timeEl.textContent = alive ? secs + "s" : "–";
  timeEl.classList.toggle("low", alive && running && !paused && foodLeft <= 2000);
}

function draw() {
  const w = GRID * CELL;
  ctx.fillStyle = css("--paper-2") || "#FFF3DE";
  ctx.fillRect(0, 0, w, w);
  // faint grid lines — use the theme ink colour so they show in light and dark
  ctx.strokeStyle = css("--ink") || "#1D1A16";
  ctx.globalAlpha = 0.12;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < GRID; i++) {
    ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, w);
    ctx.moveTo(0, i * CELL); ctx.lineTo(w, i * CELL);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = css("--c-img") || "#FF7BB0";
  ctx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);
  const ink = css("--ink") || "#1D1A16";
  snake.forEach((s, i) => {
    ctx.fillStyle = ink;
    ctx.globalAlpha = i === 0 ? 1 : 0.82;
    ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
  });
  ctx.globalAlpha = 1;
}

function step() {
  if (!alive || paused || !running) return;
  dir = nextDir;
  // walls wrap: leaving one edge re-enters from the opposite one
  const head = { x: (snake[0].x + dir.x + GRID) % GRID, y: (snake[0].y + dir.y + GRID) % GRID };
  // the only way to die is to run into your own body
  if (snake.some((s) => s.x === head.x && s.y === head.y)) return gameOver();
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) { score += 1; scoreEl.textContent = score; placeFood(); }
  else snake.pop();
  draw();
}

// Self-scheduling loop; also counts down the current food's clock in real time.
function tick() {
  const now = performance.now();
  const elapsed = lastTickTime ? now - lastTickTime : 0;
  lastTickTime = now;
  if (alive && running && !paused) {
    foodLeft -= elapsed;
    if (foodLeft <= 0) { foodLeft = 0; updateTime(); return gameOver("time"); }
    step();
    updateTime();
  }
  timer = setTimeout(tick, stepMs());
}

// The snake grows by one for each piece of food, so the score is its length.
function verdict(s) {
  if (s < 5) return { rank: "Short run", note: "The snake grows by one each time it eats." };
  if (s < 15) return { rank: "Decent run", note: "Turning early leaves you more room to move as the snake gets longer." };
  if (s < 30) return { rank: "Long snake", note: "Longer than a typical casual game. Wrapping through the walls helps at this length." };
  if (s < 50) return { rank: "Very long", note: "Keeping a snake this long alive means planning turns ahead of the head." };
  return { rank: "Huge snake", note: "A hard length to keep alive on a board this size." };
}

function gameOver(reason) {
  alive = false; running = false;
  clearTimeout(timer);
  pauseBtn.disabled = true;
  updateTime();
  if (score > best) { best = score; bestEl.textContent = best; try { localStorage.setItem(KEY, best); } catch {} }
  const v = verdict(score);
  const lead = reason === "time" ? "Out of time. " : "";
  statusEl.innerHTML = `${lead}${v.rank}. You scored ${score}.<span class="verdict-sub">${v.note}</span>`;
}

function newGame() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir = nextDir = { x: 1, y: 0 };
  score = 0; alive = true; running = false; paused = false;
  lastTickTime = 0;
  scoreEl.textContent = 0;
  statusEl.textContent = "Press an arrow key or swipe to start.";
  pauseBtn.disabled = true; pauseBtn.textContent = "Pause";
  placeFood();
  fit();
  clearTimeout(timer);
  tick();
}

function start() {
  if (running || !alive) return;
  running = true;
  statusEl.textContent = "";
  pauseBtn.disabled = false;
}

function setDir(x, y) {
  if (!alive) return;
  if (dir.x === -x && dir.y === -y) return; // no instant reverse
  start();
  nextDir = { x, y };
}

function togglePause() {
  if (!running || !alive) return;
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
  statusEl.textContent = paused ? "Paused." : "";
}

const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
addEventListener("keydown", (e) => {
  if (e.key === " ") { e.preventDefault(); return togglePause(); }
  const m = KEYS[e.key];
  if (!m) return;
  e.preventDefault();
  setDir(m[0], m[1]);
});

let sx = 0, sy = 0;
canvas.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
canvas.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
}, { passive: true });

pauseBtn.addEventListener("click", togglePause);
document.getElementById("s-new").addEventListener("click", newGame);
addEventListener("resize", fit);
newGame();
