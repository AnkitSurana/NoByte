// Date difference — calendar breakdown between two dates, plus date arithmetic.
// Dates are handled as plain calendar days (no time zone shifts) by parsing the
// yyyy-mm-dd value into UTC and doing all maths in UTC.
const $ = (id) => document.getElementById(id);
const from = $("dd-from"), to = $("dd-to"), inclusive = $("dd-inclusive");
const base = $("dd-base"), op = $("dd-op"), amount = $("dd-amount");

const DAY = 86400000;
const parse = (v) => { if (!v) return null; const [y, m, d] = v.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const fmt = new Intl.DateTimeFormat(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

// Years/months/days between two UTC day-stamps, borrowing like long subtraction.
function calendarParts(a, b) {
  let d1 = new Date(a), d2 = new Date(b);
  if (d1 > d2) [d1, d2] = [d2, d1];
  let years = d2.getUTCFullYear() - d1.getUTCFullYear();
  let months = d2.getUTCMonth() - d1.getUTCMonth();
  let days = d2.getUTCDate() - d1.getUTCDate();
  if (days < 0) {
    months -= 1;
    // days in the month preceding d2
    days += new Date(Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), 0)).getUTCDate();
  }
  if (months < 0) { years -= 1; months += 12; }
  return { years, months, days };
}

function runDiff() {
  const a = parse(from.value), b = parse(to.value);
  const ids = ["dd-main", "dd-days", "dd-weeks", "dd-hours", "dd-months"];
  if (a === null || b === null) { ids.forEach((id) => ($(id).textContent = "—")); return; }

  const lo = Math.min(a, b), hi = Math.max(a, b);
  let totalDays = Math.round((hi - lo) / DAY);
  if (inclusive.checked) totalDays += 1;

  const { years, months, days } = calendarParts(a, b);
  const parts = [];
  if (years) parts.push(plural(years, "year"));
  if (months) parts.push(plural(months, "month"));
  if (days || !parts.length) parts.push(plural(days, "day"));
  $("dd-main").textContent = totalDays === 0 && !inclusive.checked ? "Same day" : parts.join(", ");

  $("dd-days").textContent = totalDays.toLocaleString();
  $("dd-weeks").textContent = (totalDays / 7).toLocaleString(undefined, { maximumFractionDigits: 1 });
  $("dd-hours").textContent = (totalDays * 24).toLocaleString();
  $("dd-months").textContent = (years * 12 + months + days / 30.44).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function runAdd() {
  const a = parse(base.value);
  if (a === null || amount.value === "") { $("dd-result").textContent = "—"; return; }
  const n = Math.trunc(Number(amount.value)) * Number(op.value);
  $("dd-result").textContent = fmt.format(new Date(a + n * DAY));
}

[from, to, inclusive].forEach((el) => el.addEventListener("input", runDiff));
[base, op, amount].forEach((el) => el.addEventListener("input", runAdd));

// Sensible defaults: today, and 30 days before today. Build the yyyy-mm-dd
// string from local calendar parts so it does not drift across the UTC boundary.
const today = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
to.value = iso(today);
from.value = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30));
base.value = iso(today);
runDiff();
runAdd();
