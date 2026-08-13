// Text diff — vendored jsdiff, word/line/char granularity.
import { debounce } from "/js/ui.js";

const a = document.getElementById("td-a");
const b = document.getElementById("td-b");
const mode = document.getElementById("td-mode");
const result = document.getElementById("td-result");
const addedEl = document.getElementById("td-added");
const removedEl = document.getElementById("td-removed");

const escapeHtml = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const run = debounce(() => {
  const fn = { words: Diff.diffWords, lines: Diff.diffLines, chars: Diff.diffChars }[mode.value];
  const parts = fn(a.value, b.value);
  let added = 0, removed = 0;
  const html = parts.map((p) => {
    const text = escapeHtml(p.value);
    if (p.added) { added += p.count || 1; return `<ins>${text}</ins>`; }
    if (p.removed) { removed += p.count || 1; return `<del>${text}</del>`; }
    return text;
  }).join("");
  result.innerHTML = html || "<span class='muted'>No differences.</span>";
  addedEl.textContent = `+${added}`;
  removedEl.textContent = `-${removed}`;
}, 200);

[a, b, mode].forEach((el) => el.addEventListener("input", run));
run();
