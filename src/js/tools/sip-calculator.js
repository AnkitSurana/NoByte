// SIP calculator — future value of a monthly investment.
const amount = document.getElementById("sip-amount");
const rate = document.getElementById("sip-rate");
const years = document.getElementById("sip-years");
const currency = document.getElementById("sip-currency");
const arc = document.getElementById("sip-arc");
const CIRC = 2 * Math.PI * 48;

const money = (n) => (currency.value || "") + Math.round(n).toLocaleString();

function calc() {
  const P = Math.max(0, parseFloat(amount.value) || 0);
  const annual = parseFloat(rate.value) || 0;
  const y = parseInt(years.value) || 1;
  document.getElementById("sip-rate-val").textContent = `${annual}%`;
  document.getElementById("sip-years-val").textContent = `${y} ${y === 1 ? "year" : "years"}`;

  const i = annual / 100 / 12;
  const n = y * 12;
  // Future value of an annuity-due (contribution at the start of each month)
  const fv = i === 0 ? P * n : P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  const invested = P * n;
  const gains = fv - invested;

  document.getElementById("sip-total").textContent = money(fv);
  document.getElementById("sip-invested").textContent = money(invested);
  document.getElementById("sip-gains").textContent = money(gains);
  const frac = fv > 0 ? invested / fv : 0;
  arc.setAttribute("stroke-dasharray", `${frac * CIRC} ${CIRC}`);
}
[amount, rate, years, currency].forEach((el) => el.addEventListener("input", calc));
calc();
