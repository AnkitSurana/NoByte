// Currency converter — one amount into several currencies at once, using the
// European Central Bank's daily reference rates via Frankfurter
// (frankfurter.dev). The row UI mirrors the time zone converter's.
//
// Honest scope: these rates are fixed once a business day, so this is a daily
// reference rather than a live tick-by-tick feed — and the page says so. Every
// result is stamped with the rate's as-of date. Fetched rates are cached in
// localStorage, so conversions keep working offline. Only the base currency
// code is sent when refreshing rates; the amount never leaves the browser.
import { withPending } from "/js/ui.js";

const API = "https://api.frankfurter.dev/v1/latest?from=USD";
const CACHE_KEY = "nobyte.currency.v1";
const PREFS_KEY = "nobyte.currency.prefs";

// The currencies the ECB reference rates cover, as served by frankfurter.dev.
// Hard-coded so the dropdowns render before the first fetch (and offline).
const CURRENCIES = {
  AUD: "Australian Dollar",
  BRL: "Brazilian Real",
  CAD: "Canadian Dollar",
  CHF: "Swiss Franc",
  CNY: "Chinese Renminbi Yuan",
  CZK: "Czech Koruna",
  DKK: "Danish Krone",
  EUR: "Euro",
  GBP: "British Pound",
  HKD: "Hong Kong Dollar",
  HUF: "Hungarian Forint",
  IDR: "Indonesian Rupiah",
  ILS: "Israeli New Shekel",
  INR: "Indian Rupee",
  ISK: "Icelandic Krona",
  JPY: "Japanese Yen",
  KRW: "South Korean Won",
  MXN: "Mexican Peso",
  MYR: "Malaysian Ringgit",
  NOK: "Norwegian Krone",
  NZD: "New Zealand Dollar",
  PHP: "Philippine Peso",
  PLN: "Polish Zloty",
  RON: "Romanian Leu",
  SEK: "Swedish Krona",
  SGD: "Singapore Dollar",
  THB: "Thai Baht",
  TRY: "Turkish Lira",
  USD: "US Dollar",
  ZAR: "South African Rand",
};

const codes = Object.keys(CURRENCIES);
const optionList = codes.map((c) => `<option value="${c}">${c} — ${CURRENCIES[c]}</option>`).join("");

const amountEl = document.getElementById("ccx-amount");
const fromEl = document.getElementById("ccx-from");
const resultsEl = document.getElementById("ccx-results");
const addBtn = document.getElementById("ccx-add");
const refreshBtn = document.getElementById("ccx-refresh");
const statusEl = document.getElementById("ccx-status");
const errorEl = document.getElementById("ccx-error");

let rates = null; // units of each currency per 1 USD, from the API

const readJSON = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private browsing or a full store — caching is best-effort */
  }
};

const validRates = (data) => data && data.date && data.rates && typeof data.rates === "object";

async function fetchRates() {
  const res = await fetch(API);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!validRates(data)) throw new Error("Unrecognised rates payload");
  data.rates[data.base] = 1; // the API lists every rate except the base's own
  return data;
}

function setRates(date, r, persist = true) {
  rates = r;
  if (persist) writeJSON(CACHE_KEY, { date, rates: r, fetchedAt: Date.now() });
}

const dmy = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—");
const ageLabel = (ms) => {
  const h = Math.round(ms / 36e5);
  if (h < 1) return "just now";
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
};

function convert(amount, from, to) {
  if (!rates || !from || !to || rates[from] == null || rates[to] == null) return NaN;
  return (amount / rates[from]) * rates[to];
}

function render() {
  const amount = parseFloat(amountEl.value);
  const hasAmount = Number.isFinite(amount);
  const from = fromEl.value;
  resultsEl.querySelectorAll("[data-row]").forEach((row) => {
    const to = row.querySelector("[data-ccx-target]").value;
    const out = row.querySelector("[data-ccx-out]");
    if (!rates || !hasAmount) { out.textContent = "—"; return; }
    const r = convert(amount, from, to);
    out.textContent = `${fmt(r)} ${to}`;
  });
}

function savePrefs() {
  const targets = [...resultsEl.querySelectorAll("[data-ccx-target]")].map((s) => s.value);
  writeJSON(PREFS_KEY, { from: fromEl.value, amount: amountEl.value, targets });
}

function addRow(code) {
  const row = document.createElement("div");
  row.className = "result-row ccx-row";
  row.dataset.row = "";
  row.innerHTML = `
    <select class="select select--sm" data-ccx-target aria-label="Target currency">${optionList}</select>
    <span class="ccx-row__out"><span class="mono val" data-ccx-out>—</span>
    <button class="icon-btn icon-btn--sm" type="button" data-ccx-remove aria-label="Remove currency"><svg class="icon" aria-hidden="true"><use href="#x"></use></svg></button></span>`;
  row.querySelector("[data-ccx-target]").value = code;
  row.querySelector("[data-ccx-target]").addEventListener("change", () => { savePrefs(); render(); });
  row.querySelector("[data-ccx-remove]").addEventListener("click", () => { row.remove(); savePrefs(); });
  resultsEl.appendChild(row);
  render();
}

async function refresh(spinner) {
  errorEl.textContent = "";
  const go = async () => {
    try {
      const data = await fetchRates();
      setRates(data.date, data.rates);
      statusEl.textContent = `Rates as of ${dmy(data.date)} — fetched just now.`;
    } catch {
      if (rates) {
        errorEl.textContent =
          "Couldn't reach frankfurter.dev, so the cached rates above are shown. Press “Refresh rates” to try again when you're online.";
      } else {
        statusEl.textContent = "";
        errorEl.textContent =
          "Couldn't fetch today's rates. Check your connection, then press “Refresh rates” to try again.";
      }
    } finally {
      render();
    }
  };
  if (spinner) await withPending(refreshBtn, go);
  else await go();
}

/* ---------- wiring ---------- */
fromEl.innerHTML = optionList;

addBtn.addEventListener("click", () => {
  const used = new Set([...resultsEl.querySelectorAll("[data-ccx-target]")].map((s) => s.value));
  const next = codes.find((c) => !used.has(c));
  if (next) addRow(next);
});
refreshBtn.addEventListener("click", () => refresh(true));
[amountEl, fromEl].forEach((el) =>
  el.addEventListener(el === amountEl ? "input" : "change", () => {
    savePrefs();
    render();
  })
);

/* ---------- defaults ---------- */
const prefs = readJSON(PREFS_KEY) || {};
fromEl.value = codes.includes(prefs.from) ? prefs.from : "USD";
if (prefs.amount !== undefined && Number.isFinite(Number(prefs.amount))) amountEl.value = prefs.amount;

const defaultTargets = ["EUR", "GBP", "JPY", "INR", "AUD"].filter((c) => c !== fromEl.value);
const savedTargets = (Array.isArray(prefs.targets) ? prefs.targets : [])
  .filter((c) => codes.includes(c) && c !== fromEl.value);
(savedTargets.length ? savedTargets.slice(0, 6) : defaultTargets.slice(0, 4)).forEach(addRow);

/* Cached rates render immediately (works offline), then a fresh copy is fetched
   in the background and replaces the cache. */
const cached = readJSON(CACHE_KEY);
if (validRates(cached)) {
  setRates(cached.date, cached.rates, false); // keep the original fetch time
  statusEl.textContent = `Rates as of ${dmy(cached.date)} — fetched ${ageLabel(Date.now() - (Number(cached.fetchedAt) || 0))} and cached on this device.`;
}
refresh(false);