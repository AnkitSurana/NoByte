// Cron expression explainer — plain-English reading plus the next run times.
// Standard 5-field cron only. No @reboot / L / W / seconds.
const input = document.getElementById("ce-input");
const errEl = document.getElementById("ce-error");
const textEl = document.getElementById("ce-text");
const runsEl = document.getElementById("ce-runs");
const fieldsBody = document.querySelector("#ce-fields tbody");

// Display info for the field-by-field breakdown, in cron order.
const FIELD_INFO = [
  { label: "Minute", range: "0–59" },
  { label: "Hour", range: "0–23" },
  { label: "Day of month", range: "1–31" },
  { label: "Month", range: "1–12" },
  { label: "Day of week", range: "0–6 (Sun–Sat)" },
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_ALIAS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const DAY_ALIAS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

const FIELDS = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "dom", min: 1, max: 31 },
  { name: "month", min: 1, max: 12, alias: MONTH_ALIAS },
  { name: "dow", min: 0, max: 6, alias: DAY_ALIAS },
];

// Parse one field into a sorted set of allowed integers. Throws on bad input.
function parseField(raw, field) {
  const set = new Set();
  const resolve = (tok) => {
    const a = field.alias && field.alias[tok.toLowerCase()];
    if (a !== undefined) return a;
    if (!/^\d+$/.test(tok)) throw new Error(`"${tok}" is not valid in the ${field.name} field`);
    return Number(tok);
  };
  for (const part of raw.split(",")) {
    const [rangePart, stepPart] = part.split("/");
    const step = stepPart === undefined ? 1 : Number(stepPart);
    if (!Number.isInteger(step) || step < 1) throw new Error(`bad step "/${stepPart}" in the ${field.name} field`);

    let lo, hi;
    if (rangePart === "*") {
      lo = field.min; hi = field.max;
    } else if (rangePart.includes("-")) {
      const [a, b] = rangePart.split("-");
      lo = resolve(a); hi = resolve(b);
    } else {
      lo = hi = resolve(rangePart);
      if (stepPart !== undefined) hi = field.max; // "5/10" means from 5 to the max, stepping
    }
    // Cron allows 7 as Sunday in the day-of-week field, so validation tolerates it.
    const hiBound = field.name === "dow" ? 7 : field.max;
    if (lo < field.min || hi > hiBound || lo > hi) throw new Error(`${field.name} value out of range (${field.min}–${field.max})`);
    for (let v = lo; v <= hi; v += step) set.add(v);
  }
  // Normalise Sunday-as-7 to 0.
  if (field.name === "dow" && set.has(7)) { set.add(0); set.delete(7); }
  return [...set].sort((a, b) => a - b);
}

function parse(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`expected 5 fields, found ${parts.length}`);
  return FIELDS.map((f, i) => ({ field: f, raw: parts[i], values: parseField(parts[i], f) }));
}

// ---- English ----
const isEvery = (p) => p.values.length === p.field.max - p.field.min + 1;

function listPhrase(nums, mapper) {
  const items = nums.map(mapper);
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function timePhrase(minP, hourP) {
  // Both specific and short -> exact clock times.
  if (!isEvery(minP) && !isEvery(hourP) && minP.values.length * hourP.values.length <= 12) {
    const times = [];
    for (const h of hourP.values) for (const m of minP.values) {
      times.push(`${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`);
    }
    return `at ${listPhrase(times, (t) => t)}`;
  }
  const minEvery = isEvery(minP), hourEvery = isEvery(hourP);
  if (minEvery && hourEvery) return "every minute";
  if (minEvery) return `every minute during ${listPhrase(hourP.values, (h) => `${((h + 11) % 12) + 1} ${h < 12 ? "am" : "pm"}`)}`;
  const minPart = minP.raw.includes("/") ? `every ${minP.raw.split("/")[1]} minutes` : `at minute ${listPhrase(minP.values, String)}`;
  return hourEvery ? `${minPart} of every hour` : `${minPart}, during ${listPhrase(hourP.values, (h) => `${((h + 11) % 12) + 1} ${h < 12 ? "am" : "pm"}`)}`;
}

function explain(parsed) {
  const [minP, hourP, domP, monthP, dowP] = parsed;
  let out = timePhrase(minP, hourP);
  const domEvery = isEvery(domP), dowEvery = isEvery(dowP);

  if (!dowEvery) out += `, on ${listPhrase(dowP.values, (d) => DAYS[d])}`;
  if (!domEvery) out += `${dowEvery ? ", on" : " and on"} the ${listPhrase(domP.values, ordinal)} of the month`;
  if (!isEvery(monthP)) out += `, in ${listPhrase(monthP.values, (m) => MONTHS[m - 1])}`;
  return out.charAt(0).toUpperCase() + out.slice(1) + ".";
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ---- next run times ----
// Walk forward minute by minute from now. Cron's day rule: if BOTH day-of-month
// and day-of-week are restricted, a match on EITHER counts.
function nextRuns(parsed, count = 5) {
  const [minP, hourP, domP, monthP, dowP] = parsed;
  const mins = new Set(minP.values), hours = new Set(hourP.values);
  const doms = new Set(domP.values), months = new Set(monthP.values), dows = new Set(dowP.values);
  const domRestricted = !isEvery(domP), dowRestricted = !isEvery(dowP);

  const out = [];
  const t = new Date();
  t.setSeconds(0, 0);
  t.setMinutes(t.getMinutes() + 1);
  const limit = 366 * 24 * 60; // one year of minutes
  for (let i = 0; i < limit && out.length < count; i++) {
    const okDom = doms.has(t.getDate());
    const okDow = dows.has(t.getDay());
    const dayOk = domRestricted && dowRestricted ? okDom || okDow : okDom && okDow;
    if (mins.has(t.getMinutes()) && hours.has(t.getHours()) && months.has(t.getMonth() + 1) && dayOk) {
      out.push(new Date(t));
    }
    t.setMinutes(t.getMinutes() + 1);
  }
  return out;
}

const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

// One-line plain reading of a single field's value set.
function fieldSummary(p, info) {
  const raw = p.raw, noun = info.label.toLowerCase();
  if (raw === "*") return `every ${noun}`;
  if (raw.includes("/")) return `every ${raw.split("/")[1]} (${p.values.length} value${p.values.length === 1 ? "" : "s"})`;
  if (p.field.name === "month") return listPhrase(p.values, (m) => MONTHS[m - 1]);
  if (p.field.name === "dow") return listPhrase(p.values, (d) => DAYS[d]);
  if (raw.includes("-")) return `${p.values[0]} through ${p.values[p.values.length - 1]}`;
  return listPhrase(p.values, String);
}

function renderFields(parsed) {
  fieldsBody.innerHTML = parsed.map((p, i) => {
    const info = FIELD_INFO[i];
    return `<tr>
      <td>${i + 1}</td>
      <td>${info.label} <span class="muted xs">${info.range}</span></td>
      <td class="mono">${esc(p.raw)}</td>
      <td>${esc(fieldSummary(p, info))}</td>
    </tr>`;
  }).join("");
}

function run() {
  const expr = input.value.trim();
  errEl.textContent = "";
  input.classList.remove("input--invalid");
  if (!expr) { textEl.textContent = "—"; runsEl.innerHTML = ""; fieldsBody.innerHTML = ""; return; }
  let parsed;
  try {
    parsed = parse(expr);
  } catch (e) {
    input.classList.add("input--invalid");
    errEl.textContent = e.message;
    textEl.textContent = "—";
    runsEl.innerHTML = "";
    fieldsBody.innerHTML = "";
    return;
  }
  textEl.textContent = explain(parsed);
  renderFields(parsed);
  const runs = nextRuns(parsed);
  runsEl.innerHTML = runs.length
    ? runs.map((d) => `<div class="result-row"><span class="mono val">${fmt.format(d)}</span></div>`).join("")
    : `<p class="muted small">No run times in the next year.</p>`;
}

document.getElementById("ce-examples").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cron]");
  if (!btn) return;
  input.value = btn.dataset.cron;
  run();
});
input.addEventListener("input", run);
run();
