// Regex tester — live highlighting and capture groups.
import { debounce } from "/js/ui.js";

const pattern = document.getElementById("re-pattern");
const flags = document.getElementById("re-flags");
const text = document.getElementById("re-text");
const error = document.getElementById("re-error");
const highlight = document.getElementById("re-highlight");
const countEl = document.getElementById("re-count");
const groupsWrap = document.getElementById("re-groups-wrap");
const groupsTable = document.getElementById("re-groups");

const escapeHtml = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const run = debounce(() => {
  const p = pattern.value;
  error.textContent = "";
  pattern.classList.remove("input--invalid");
  groupsWrap.classList.add("hidden");
  if (!p) { highlight.innerHTML = escapeHtml(text.value); countEl.textContent = "0"; return; }

  let re;
  try {
    let f = flags.value.replace(/[^gimsuy]/g, "");
    if (!f.includes("g")) f += "g";
    re = new RegExp(p, f);
  } catch (e) {
    error.textContent = e.message;
    pattern.classList.add("input--invalid");
    return;
  }

  const source = text.value;
  let out = "";
  let last = 0;
  let count = 0;
  const groupRows = [];
  let m;
  let guard = 0;
  while ((m = re.exec(source)) !== null && guard++ < 5000) {
    if (m[0] === "") { re.lastIndex++; continue; }
    out += escapeHtml(source.slice(last, m.index));
    out += `<mark>${escapeHtml(m[0])}</mark>`;
    last = m.index + m[0].length;
    count++;
    if (m.length > 1) groupRows.push([count, m.slice(1).map((g) => (g === undefined ? "(no match)" : g))]);
  }
  out += escapeHtml(source.slice(last));
  highlight.innerHTML = out || "<span class='muted'>No text</span>";
  countEl.textContent = String(count);

  if (groupRows.length) {
    groupsWrap.classList.remove("hidden");
    const max = Math.max(...groupRows.map((r) => r[1].length));
    const head = `<tr><th>#</th>${Array.from({ length: max }, (_, i) => `<th>Group ${i + 1}</th>`).join("")}</tr>`;
    groupsTable.innerHTML = head + groupRows.map(([n, gs]) => `<tr><td>${n}</td>${gs.map((g) => `<td>${escapeHtml(g)}</td>`).join("")}</tr>`).join("");
  }
}, 200);

[pattern, flags, text].forEach((el) => el.addEventListener("input", run));
document.getElementById("re-common").addEventListener("change", (e) => {
  if (e.target.value) { pattern.value = e.target.value; run(); }
});
pattern.value = "[\\w.+-]+@[\\w-]+\\.[\\w.]+";
run();
