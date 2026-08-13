// Timestamp converter — epoch <-> date, with a live clock and timezone list.
const nowEl = document.getElementById("ts-now");
const nowVal = document.getElementById("ts-now-val");
const epochInput = document.getElementById("ts-epoch");
const tzSelect = document.getElementById("ts-tz");
const dateInput = document.getElementById("ts-date");

// Live clock
setInterval(() => {
  const s = Math.floor(Date.now() / 1000);
  nowEl.textContent = s;
  nowVal.value = String(s);
}, 1000);
nowEl.textContent = Math.floor(Date.now() / 1000);
nowVal.value = String(Math.floor(Date.now() / 1000));

// Timezones
const zones = (() => {
  try { return Intl.supportedValuesOf("timeZone"); } catch { return ["UTC"]; }
})();
const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
tzSelect.innerHTML = zones.map((z) => `<option ${z === localZone ? "selected" : ""}>${z}</option>`).join("");

function relative(ms) {
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const units = [["year", 31536e6], ["month", 2592e6], ["day", 864e5], ["hour", 36e5], ["minute", 6e4], ["second", 1000]];
  for (const [name, size] of units) {
    if (abs >= size || name === "second") {
      const v = Math.round(diff / size);
      try { return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(v, name); }
      catch { return `${Math.abs(v)} ${name}s ${diff < 0 ? "ago" : "from now"}`; }
    }
  }
}

function fromEpoch() {
  const raw = epochInput.value.trim();
  const set = (id, v) => (document.getElementById(id).textContent = v);
  if (!raw || Number.isNaN(Number(raw))) { ["ts-local","ts-utc","ts-iso","ts-rel"].forEach((i) => set(i, "—")); return; }
  const n = Number(raw);
  // Heuristic: 13+ digits is milliseconds
  const ms = raw.replace("-", "").length >= 12 ? n : n * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) { ["ts-local","ts-utc","ts-iso","ts-rel"].forEach((i) => set(i, "—")); return; }
  const tz = tzSelect.value;
  set("ts-local", d.toLocaleString(undefined, { timeZone: tz, dateStyle: "medium", timeStyle: "medium" }));
  set("ts-utc", d.toLocaleString(undefined, { timeZone: "UTC", dateStyle: "medium", timeStyle: "medium" }));
  set("ts-iso", d.toISOString());
  set("ts-rel", relative(ms));
  document.getElementById("ts-unit-hint").textContent = raw.replace("-", "").length >= 12 ? "Read as milliseconds." : "Read as seconds.";
}

function fromDate() {
  const v = dateInput.value;
  if (!v) return;
  const ms = new Date(v).getTime();
  document.getElementById("ts-out-s").textContent = Math.floor(ms / 1000);
  document.getElementById("ts-out-ms").textContent = ms;
}

epochInput.addEventListener("input", fromEpoch);
tzSelect.addEventListener("change", fromEpoch);
dateInput.addEventListener("input", fromDate);
epochInput.value = String(Math.floor(Date.now() / 1000));
fromEpoch();
