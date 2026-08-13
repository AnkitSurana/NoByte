// GST / VAT calculator — add or remove tax.
const amount = document.getElementById("gst-amount");
const rateSel = document.getElementById("gst-rate");
const customWrap = document.getElementById("gst-custom-wrap");
const custom = document.getElementById("gst-custom");
let mode = "add";

const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");

function rate() {
  return rateSel.value === "custom" ? parseFloat(custom.value) || 0 : parseFloat(rateSel.value) || 0;
}

function calc() {
  customWrap.classList.toggle("hidden", rateSel.value !== "custom");
  const a = parseFloat(amount.value);
  const r = rate() / 100;
  if (!Number.isFinite(a)) {
    ["gst-net","gst-tax","gst-gross"].forEach((id) => (document.getElementById(id).textContent = "—"));
    return;
  }
  let net, tax, gross;
  if (mode === "add") { net = a; tax = a * r; gross = a + tax; }
  else { gross = a; net = a / (1 + r); tax = gross - net; }
  document.getElementById("gst-net").textContent = fmt(net);
  document.getElementById("gst-tax").textContent = fmt(tax);
  document.getElementById("gst-gross").textContent = fmt(gross);
}
[amount, rateSel, custom].forEach((el) => el.addEventListener("input", calc));
document.getElementById("g-t-add").addEventListener("click", () => { mode = "add"; calc(); });
document.getElementById("g-t-remove").addEventListener("click", () => { mode = "remove"; calc(); });
calc();
