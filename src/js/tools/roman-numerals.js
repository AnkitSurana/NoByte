// Roman numeral converter — two-way, 1 to 3999. Editing one box drives the other.
const numEl = document.getElementById("rn-number");
const romEl = document.getElementById("rn-roman");
const errEl = document.getElementById("rn-error");

const TABLE = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

function toRoman(n) {
  let out = "";
  for (const [value, sym] of TABLE) while (n >= value) { out += sym; n -= value; }
  return out;
}

// Parse a Roman numeral strictly: it must round-trip back to the same string,
// which rejects malformed input like "IIII" or "VX".
function fromRoman(s) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0, prev = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    const v = map[s[i]];
    if (!v) return null;
    total += v < prev ? -v : v;
    prev = v;
  }
  return total >= 1 && total <= 3999 && toRoman(total) === s ? total : null;
}

let editing = false;
function setError(msg) { errEl.textContent = msg || ""; }

numEl.addEventListener("input", () => {
  if (editing) return;
  editing = true;
  const raw = numEl.value.trim();
  setError("");
  if (raw === "") { romEl.value = ""; }
  else if (!/^\d+$/.test(raw)) { romEl.value = ""; setError("Enter digits only."); }
  else {
    const n = Number(raw);
    if (n < 1 || n > 3999) { romEl.value = ""; setError("Number must be between 1 and 3999."); }
    else romEl.value = toRoman(n);
  }
  editing = false;
});

romEl.addEventListener("input", () => {
  if (editing) return;
  editing = true;
  const raw = romEl.value.trim().toUpperCase();
  romEl.value = raw;
  setError("");
  if (raw === "") { numEl.value = ""; }
  else {
    const n = fromRoman(raw);
    if (n === null) { numEl.value = ""; setError("Not a valid Roman numeral."); }
    else numEl.value = String(n);
  }
  editing = false;
});
