// Reaction time — Formula 1 lights-out start. Five lights come on, then out;
// react the moment they go dark. Clicking early is a jump start.
const board = document.getElementById("rx-board");
const lights = [...document.querySelectorAll("#rx-lights .rx-light")];
const msgEl = document.getElementById("rx-msg");
const factEl = document.getElementById("rx-fact");
const lastEl = document.getElementById("r-last");
const bestEl = document.getElementById("r-best");
const avgEl = document.getElementById("r-avg");
const KEY = "game_reaction_best";

let state = "idle"; // idle | arming | hold | go | result | fault
let token = 0;      // invalidates pending timers on reset
let startTime = 0;
const times = [];
let best = Number(localStorage.getItem(KEY)) || 0;
bestEl.textContent = best ? `${best} ms` : "—";

const setLights = (n) => lights.forEach((l, i) => l.classList.toggle("on", i < n));

function f1Fact(ms) {
  if (ms < 150) return "That is faster than a typical human reaction, so it may have been a lucky guess at the timing.";
  if (ms < 200) return "An F1 driver reacts to the lights in about 200 ms, so this is around that mark.";
  if (ms < 250) return "Close to a racing driver's reaction time off the line.";
  if (ms < 320) return "The average human reaction is about 250 ms, so this is around normal.";
  if (ms < 450) return "A little slower than average. Try again to lower it.";
  return "Watch the lights rather than your finger, and click the moment they go out.";
}

function startSequence() {
  const my = ++token;
  state = "arming";
  board.classList.remove("go", "fault");
  factEl.textContent = "";
  setLights(0);
  msgEl.textContent = "Wait for the lights to go out…";
  let i = 0;
  const on = () => {
    if (my !== token) return;
    setLights(++i);
    if (i < 5) setTimeout(on, 650 + Math.random() * 350);
    else { state = "hold"; setTimeout(() => { if (my === token) lightsOut(); }, 500 + Math.random() * 2500); }
  };
  setTimeout(on, 600);
}

function lightsOut() {
  state = "go";
  setLights(0);
  board.classList.add("go");
  msgEl.textContent = "GO!";
  startTime = performance.now();
}

function jumpStart() {
  token++; // cancel any pending light timers
  state = "fault";
  setLights(0);
  board.classList.remove("go");
  board.classList.add("fault");
  msgEl.textContent = "Jump start!";
  factEl.textContent = "You went before the lights went out. Tap to try again.";
}

function record(ms) {
  times.push(ms);
  lastEl.textContent = `${ms} ms`;
  if (!best || ms < best) { best = ms; bestEl.textContent = `${best} ms`; try { localStorage.setItem(KEY, best); } catch {} }
  avgEl.textContent = `${Math.round(times.reduce((a, b) => a + b, 0) / times.length)} ms`;
}

function react() {
  const ms = Math.round(performance.now() - startTime);
  state = "result";
  board.classList.remove("go");
  record(ms);
  msgEl.textContent = `${ms} ms`;
  factEl.textContent = f1Fact(ms);
}

board.addEventListener("click", () => {
  if (state === "idle" || state === "result" || state === "fault") startSequence();
  else if (state === "arming" || state === "hold") jumpStart();
  else if (state === "go") react();
});
