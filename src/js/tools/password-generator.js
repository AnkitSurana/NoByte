// Password generator — uses crypto.getRandomValues (never Math.random).
const out = document.getElementById("pg-output");
const lengthInput = document.getElementById("pg-length");
const lengthVal = document.getElementById("pg-length-val");
const error = document.getElementById("pg-error");
const meter = document.getElementById("pg-meter");
const strengthBadge = document.getElementById("pg-strength");
const sets = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
};
const LOOKALIKES = /[0O1lI|]/g;
const opts = ["upper", "lower", "numbers", "symbols"].map((k) => document.getElementById(`pg-${k}`));
const excludeEl = document.getElementById("pg-exclude");

// Uniform random index without modulo bias.
function randInt(max) {
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let x;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

function buildPool() {
  let pool = "";
  const active = [];
  if (document.getElementById("pg-upper").checked) active.push(sets.upper);
  if (document.getElementById("pg-lower").checked) active.push(sets.lower);
  if (document.getElementById("pg-numbers").checked) active.push(sets.numbers);
  if (document.getElementById("pg-symbols").checked) active.push(sets.symbols);
  if (excludeEl.checked) {
    for (let i = 0; i < active.length; i++) active[i] = active[i].replace(LOOKALIKES, "");
  }
  pool = active.join("");
  return { pool, active };
}

function generate() {
  const length = Number(lengthInput.value);
  const { pool, active } = buildPool();
  if (!pool) {
    error.textContent = "Select at least one character set.";
    out.value = "";
    updateStrength(0, 0);
    return;
  }
  error.textContent = "";

  // Guarantee at least one char from each active set, then fill the rest.
  const chars = active.map((set) => set[randInt(set.length)]);
  for (let i = chars.length; i < length; i++) chars.push(pool[randInt(pool.length)]);
  // Fisher–Yates shuffle with CSPRNG.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  out.value = chars.slice(0, length).join("");
  updateStrength(length, pool.length);
}

function updateStrength(length, poolSize) {
  if (!length || !poolSize) {
    meter.removeAttribute("data-level");
    strengthBadge.textContent = "—";
    strengthBadge.className = "badge badge--muted";
    return;
  }
  const bits = Math.round(length * Math.log2(poolSize));
  let level, cls;
  if (bits < 50) { level = "weak"; cls = "badge--danger"; }
  else if (bits < 80) { level = "fair"; cls = "badge--muted"; }
  else { level = "strong"; cls = "badge--ok"; }
  meter.setAttribute("data-level", level);
  strengthBadge.textContent = `${level} · ${bits} bits`;
  strengthBadge.className = `badge ${cls}`;
}

lengthInput.addEventListener("input", () => {
  lengthVal.textContent = lengthInput.value;
  generate();
});
[...opts, excludeEl].forEach((el) => el.addEventListener("change", generate));
document.getElementById("pg-regen").addEventListener("click", generate);
generate();
