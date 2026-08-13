// Tip / split and discount calculator.
const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");

const bill = document.getElementById("tp-bill");
const pct = document.getElementById("tp-pct");
const people = document.getElementById("tp-people");

function calcTip() {
  document.getElementById("tp-pct-val").textContent = `${pct.value}%`;
  const b = parseFloat(bill.value);
  const p = Math.max(1, parseInt(people.value) || 1);
  people.value = p;
  if (!Number.isFinite(b)) { ["tp-tip","tp-total","tp-each"].forEach((i) => (document.getElementById(i).textContent = "—")); return; }
  const tip = b * (Number(pct.value) / 100);
  const total = b + tip;
  document.getElementById("tp-tip").textContent = fmt(tip);
  document.getElementById("tp-total").textContent = fmt(total);
  document.getElementById("tp-each").textContent = fmt(total / p);
}
[bill, pct, people].forEach((el) => el.addEventListener("input", calcTip));
document.querySelectorAll("[data-tip]").forEach((b) => b.addEventListener("click", () => { pct.value = b.dataset.tip; calcTip(); }));

const price = document.getElementById("tp-price");
const disc = document.getElementById("tp-disc");
function calcDisc() {
  document.getElementById("tp-disc-val").textContent = `${disc.value}%`;
  const p = parseFloat(price.value);
  if (!Number.isFinite(p)) { ["tp-save","tp-final"].forEach((i) => (document.getElementById(i).textContent = "—")); return; }
  const save = p * (Number(disc.value) / 100);
  document.getElementById("tp-save").textContent = fmt(save);
  document.getElementById("tp-final").textContent = fmt(p - save);
}
[price, disc].forEach((el) => el.addEventListener("input", calcDisc));

calcTip();
calcDisc();
