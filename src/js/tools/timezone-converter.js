// Time zone converter — a wall-clock time in one zone, shown in several others.
// All zone data comes from the browser's Intl implementation.
const dateEl = document.getElementById("tz-date");
const timeEl = document.getElementById("tz-time");
const fromEl = document.getElementById("tz-from");
const resultsEl = document.getElementById("tz-results");

const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const ZONES = (typeof Intl.supportedValuesOf === "function")
  ? Intl.supportedValuesOf("timeZone").slice()
  : ["America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", localZone];
// Intl accepts "UTC" even when supportedValuesOf lists only "Etc/UTC"; keep the
// common name available and first, and make sure the local zone is present.
if (!ZONES.includes("UTC")) ZONES.unshift("UTC");
if (!ZONES.includes(localZone)) ZONES.push(localZone);

const optionList = ZONES.map((z) => `<option value="${z}">${z.replace(/_/g, " ")}</option>`).join("");

// Offset (ms) between a zone and UTC at a given instant, via formatToParts.
function zoneOffset(tz, date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const p = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUTC - date.getTime();
}

// UTC instant for a wall-clock time interpreted in `tz` (DST-aware).
function zonedToInstant(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let off = zoneOffset(tz, new Date(guess));
  let utc = guess - off;
  const off2 = zoneOffset(tz, new Date(utc)); // refine across a DST boundary
  if (off2 !== off) utc = guess - off2;
  return new Date(utc);
}

const outFmt = (tz) => new Intl.DateTimeFormat(undefined, {
  timeZone: tz, weekday: "short", year: "numeric", month: "short", day: "numeric",
  hour: "2-digit", minute: "2-digit",
});
const dayStamp = (tz, date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

function currentInstant() {
  if (!dateEl.value || !timeEl.value) return null;
  const [y, mo, d] = dateEl.value.split("-").map(Number);
  const [h, mi] = timeEl.value.split(":").map(Number);
  return zonedToInstant(y, mo, d, h, mi, fromEl.value);
}

function update() {
  const instant = currentInstant();
  const srcDay = instant ? dayStamp(fromEl.value, instant) : null;
  resultsEl.querySelectorAll("[data-row]").forEach((row) => {
    const tz = row.querySelector("[data-tz-target]").value;
    const out = row.querySelector("[data-tz-out]");
    if (!instant) { out.textContent = "—"; return; }
    let label = outFmt(tz).format(instant);
    const diff = dayStamp(tz, instant) !== srcDay;
    out.innerHTML = `${label}${diff ? ' <span class="tz-daydiff">different day</span>' : ""}`;
  });
}

function addRow(tz) {
  const row = document.createElement("div");
  row.className = "result-row tz-row";
  row.dataset.row = "";
  row.innerHTML = `
    <select class="select select--sm" data-tz-target aria-label="Target time zone">${optionList}</select>
    <span class="tz-row__out"><span class="mono val" data-tz-out>—</span>
    <button class="icon-btn icon-btn--sm" type="button" data-tz-remove aria-label="Remove zone"><svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#x"></use></svg></button></span>`;
  row.querySelector("[data-tz-target]").value = tz;
  row.querySelector("[data-tz-target]").addEventListener("change", update);
  row.querySelector("[data-tz-remove]").addEventListener("click", () => { row.remove(); });
  resultsEl.appendChild(row);
  update();
}

document.getElementById("tz-add").addEventListener("click", () => {
  const used = new Set([...resultsEl.querySelectorAll("[data-tz-target]")].map((s) => s.value));
  const next = ZONES.find((z) => !used.has(z)) || "UTC";
  addRow(next);
});
[dateEl, timeEl, fromEl].forEach((el) => el.addEventListener("input", update));

/* ---- defaults ---- */
fromEl.innerHTML = optionList;
fromEl.value = localZone;
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
dateEl.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
timeEl.value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

const defaults = ["UTC", "America/New_York", "Europe/London", "Asia/Kolkata", "Asia/Tokyo"].filter((z) => z !== localZone && ZONES.includes(z));
defaults.slice(0, 4).forEach(addRow);
update();
