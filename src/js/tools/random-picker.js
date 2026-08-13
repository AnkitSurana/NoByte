// Random picker — pick or shuffle list entries using crypto-grade randomness.
const input = document.getElementById("rp-input");
const nEl = document.getElementById("rp-n");
const repeat = document.getElementById("rp-repeat");
const errEl = document.getElementById("rp-error");
const countEl = document.getElementById("rp-count");
const resultWrap = document.getElementById("rp-result-wrap");
const result = document.getElementById("rp-result");

const items = () => input.value.split("\n").map((s) => s.trim()).filter(Boolean);

// Unbiased integer in [0, max) using rejection sampling over crypto bytes.
function randInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let x;
  do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
  return x % max;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function updateCount() {
  const n = items().length;
  countEl.textContent = n ? `${n} ${n === 1 ? "entry" : "entries"}` : "";
}

function show(list) {
  result.value = list.join("\n");
  resultWrap.hidden = false;
}

function pick() {
  errEl.textContent = "";
  const list = items();
  if (!list.length) { errEl.textContent = "Add at least one entry."; resultWrap.hidden = true; return; }
  const n = Math.max(1, Math.trunc(Number(nEl.value) || 1));

  if (repeat.checked) {
    show(Array.from({ length: n }, () => list[randInt(list.length)]));
  } else {
    if (n > list.length) { errEl.textContent = `Only ${list.length} entries. Turn on repeats to pick ${n}.`; return; }
    show(shuffle(list).slice(0, n));
  }
}

document.getElementById("rp-pick").addEventListener("click", pick);
document.getElementById("rp-shuffle").addEventListener("click", () => {
  errEl.textContent = "";
  const list = items();
  if (!list.length) { errEl.textContent = "Add at least one entry."; resultWrap.hidden = true; return; }
  show(shuffle(list));
});
input.addEventListener("input", updateCount);
updateCount();
