// Compound interest — growth of a starting balance plus monthly contributions.
const principal = document.getElementById("ci-principal");
const monthly = document.getElementById("ci-monthly");
const rate = document.getElementById("ci-rate");
const years = document.getElementById("ci-years");
const freq = document.getElementById("ci-freq");
const currency = document.getElementById("ci-currency");
const arc = document.getElementById("ci-arc");
const CIRC = 2 * Math.PI * 48;

const money = (n) => (currency.value || "") + Math.round(n).toLocaleString();

function calc() {
  const P = Math.max(0, parseFloat(principal.value) || 0);
  const M = Math.max(0, parseFloat(monthly.value) || 0);
  const annual = parseFloat(rate.value) || 0;
  const y = parseInt(years.value) || 1;
  const n = parseInt(freq.value) || 12; // compounding periods per year

  document.getElementById("ci-rate-val").textContent = `${annual}%`;
  document.getElementById("ci-years-val").textContent = `${y} ${y === 1 ? "year" : "years"}`;

  const r = annual / 100;
  // Step month by month; apply interest per compounding period as it falls.
  // Compounding happens on the fraction of periods elapsed each month.
  const perMonthGrowth = Math.pow(1 + r / n, n / 12);
  let balance = P;
  for (let m = 0; m < y * 12; m++) {
    balance += M;                 // contribution at the start of the month
    balance *= perMonthGrowth;    // grow through the month
  }

  const contributed = P + M * y * 12;
  const interest = balance - contributed;

  document.getElementById("ci-total").textContent = money(balance);
  document.getElementById("ci-contributed").textContent = money(contributed);
  document.getElementById("ci-interest").textContent = money(interest);
  const frac = balance > 0 ? contributed / balance : 0;
  arc.setAttribute("stroke-dasharray", `${frac * CIRC} ${CIRC}`);
}
[principal, monthly, rate, years, freq, currency].forEach((el) => el.addEventListener("input", calc));
calc();
