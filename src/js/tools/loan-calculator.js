// Loan calculator — amortization math + SVG donut, all local.
const amount = document.getElementById("lc-amount");
const rate = document.getElementById("lc-rate");
const term = document.getElementById("lc-term");
const currency = document.getElementById("lc-currency");
const rateVal = document.getElementById("lc-rate-val");
const termVal = document.getElementById("lc-term-val");
const arc = document.getElementById("lc-arc");
const schedule = document.getElementById("lc-schedule");

const CIRC = 2 * Math.PI * 48;

function money(n) {
  const sym = currency.value || "";
  return sym + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calc() {
  const P = Math.max(0, parseFloat(amount.value) || 0);
  const annual = parseFloat(rate.value) || 0;
  const years = parseInt(term.value) || 1;
  rateVal.textContent = `${annual}%`;
  termVal.textContent = `${years} ${years === 1 ? "year" : "years"}`;

  const n = years * 12;
  const r = annual / 100 / 12;
  const monthly = r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
  const totalPaid = monthly * n;
  const totalInterest = totalPaid - P;

  document.getElementById("lc-monthly").textContent = money(monthly);
  document.getElementById("lc-principal").textContent = money(P);
  document.getElementById("lc-interest").textContent = money(totalInterest);
  document.getElementById("lc-total").textContent = money(totalPaid);

  const principalFrac = totalPaid > 0 ? P / totalPaid : 0;
  arc.setAttribute("stroke-dasharray", `${principalFrac * CIRC} ${CIRC}`);
  arc.parentElement.querySelector("circle").setAttribute("stroke", "var(--ink-3)");

  buildSchedule(P, r, monthly, years);
}

function buildSchedule(P, r, monthly, years) {
  let balance = P;
  const rows = ["<tr><th>Year</th><th>Interest paid</th><th>Principal paid</th><th>Balance</th></tr>"];
  for (let y = 1; y <= years; y++) {
    let yearInterest = 0, yearPrincipal = 0;
    for (let m = 0; m < 12; m++) {
      const interest = balance * r;
      const principal = Math.min(monthly - interest, balance);
      yearInterest += interest;
      yearPrincipal += principal;
      balance -= principal;
      if (balance < 0) balance = 0;
    }
    rows.push(`<tr><td>${y}</td><td>${money(yearInterest)}</td><td>${money(yearPrincipal)}</td><td>${money(balance)}</td></tr>`);
  }
  schedule.innerHTML = rows.join("");
}

[amount, currency].forEach((el) => el.addEventListener("input", calc));
[rate, term].forEach((el) => el.addEventListener("input", calc));
calc();
