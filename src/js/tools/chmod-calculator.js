// Chmod calculator — checkboxes <-> octal <-> symbolic, kept in sync both ways.
const body = document.getElementById("cm-body");
const octalEl = document.getElementById("cm-octal");
const symbolicEl = document.getElementById("cm-symbolic");
const cmdEl = document.getElementById("cm-cmd");
const rows = [...body.querySelectorAll("tr")]; // owner, group, others

const rwx = (digit) => ((digit & 4) ? "r" : "-") + ((digit & 2) ? "w" : "-") + ((digit & 1) ? "x" : "-");

// Read the three octal digits straight from the checkboxes.
function digitsFromBoxes() {
  return rows.map((row) =>
    [...row.querySelectorAll("input")].reduce((sum, box) => sum + (box.checked ? Number(box.dataset.bit) : 0), 0)
  );
}

function render(digits) {
  const octal = digits.join("");
  octalEl.value = octal;
  symbolicEl.textContent = "-" + digits.map(rwx).join("");
  cmdEl.textContent = `chmod ${octal} file`;
}

function fromBoxes() {
  render(digitsFromBoxes());
}

// Apply an octal string (already validated to 3 digits 0–7) back onto the grid.
function applyDigits(digits) {
  rows.forEach((row, i) => {
    row.querySelectorAll("input").forEach((box) => {
      box.checked = (digits[i] & Number(box.dataset.bit)) !== 0;
    });
  });
  render(digits);
}

body.addEventListener("change", fromBoxes);

octalEl.addEventListener("input", () => {
  const clean = octalEl.value.replace(/[^0-7]/g, "").slice(0, 3);
  if (clean.length === 3) applyDigits(clean.split("").map(Number));
});
// Pad short entries once the field loses focus (e.g. "7" -> "700").
octalEl.addEventListener("blur", () => {
  let clean = octalEl.value.replace(/[^0-7]/g, "").slice(0, 3);
  if (clean.length && clean.length < 3) {
    clean = clean.padEnd(3, "0");
    applyDigits(clean.split("").map(Number));
  }
});

fromBoxes();
