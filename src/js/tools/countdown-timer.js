// Countdown timer — live count down to a target date and time (local clock).
const labelEl = document.getElementById("cd-label");
const dateEl = document.getElementById("cd-date");
const timeEl = document.getElementById("cd-time");
const captionEl = document.getElementById("cd-caption");
const noteEl = document.getElementById("cd-note");
const out = { d: document.getElementById("cd-d"), h: document.getElementById("cd-h"), m: document.getElementById("cd-m"), s: document.getElementById("cd-s") };

function target() {
  if (!dateEl.value || !timeEl.value) return null;
  const [y, mo, d] = dateEl.value.split("-").map(Number);
  const [h, mi] = timeEl.value.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0).getTime(); // local time
}

const set = (el, n) => { const v = String(n); if (el.textContent !== v) el.textContent = v; };

function tick() {
  const t = target();
  const label = labelEl.value.trim();
  if (t === null) {
    captionEl.textContent = "Time remaining";
    noteEl.textContent = "Choose a target date and time.";
    ["d", "h", "m", "s"].forEach((k) => set(out[k], 0));
    return;
  }
  let diff = t - Date.now();
  const past = diff < 0;
  diff = Math.abs(diff);

  const sec = Math.floor(diff / 1000);
  set(out.d, Math.floor(sec / 86400));
  set(out.h, Math.floor((sec % 86400) / 3600));
  set(out.m, Math.floor((sec % 3600) / 60));
  set(out.s, sec % 60);

  captionEl.textContent = past ? "Time since" : "Time remaining";
  noteEl.innerHTML = past
    ? `<span class="badge badge--muted">${label ? escapeHtml(label) + " has" : "Target"} passed</span>`
    : (label ? `Counting down to ${escapeHtml(label)}.` : "");
}

const escapeHtml = (s = "") => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

[labelEl, dateEl, timeEl].forEach((el) => el.addEventListener("input", tick));

// Default: one week from now at 09:00.
const soon = new Date(Date.now() + 7 * 86400000);
const pad = (n) => String(n).padStart(2, "0");
dateEl.value = `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}`;
timeEl.value = "09:00";

tick();
setInterval(tick, 1000);
