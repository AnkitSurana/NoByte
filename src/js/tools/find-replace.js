// Find and replace, one match at a time (like a word processor) or all at once.
// Works on a single editable text box, plain or regex, all in the browser.
import { toast } from "/js/ui.js";

const $ = (id) => document.getElementById(id);
const ta = $("fr-text"), find = $("fr-find"), repl = $("fr-repl"), status = $("fr-status");
const useRegex = $("fr-regex"), ignoreCase = $("fr-ci");

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = () => (useRegex.checked ? find.value : escapeRe(find.value));

function buildRegex(global) {
  return new RegExp(pattern(), (global ? "g" : "") + (ignoreCase.checked ? "i" : ""));
}
function patternOk() {
  if (!find.value) { find.classList.remove("input--invalid"); return null; }
  try { buildRegex(true); find.classList.remove("input--invalid"); return true; }
  catch (e) { find.classList.add("input--invalid"); return false; }
}
function allMatches() {
  if (!find.value || patternOk() === false) return [];
  const re = buildRegex(true), text = ta.value, out = [];
  let m, guard = 0;
  while ((m = re.exec(text)) && guard++ < 1e5) {
    out.push([m.index, m.index + m[0].length]);
    if (m[0].length === 0) re.lastIndex++;
  }
  return out;
}

let current = null; // [start, end] of the match we last selected

function updateStatus() {
  if (!find.value) { status.textContent = ""; return; }
  if (patternOk() === false) { status.textContent = "Invalid regular expression"; return; }
  const n = allMatches().length;
  status.textContent = n ? `${n} match${n > 1 ? "es" : ""}` : "No matches";
}

function select(range, idx, total) {
  current = range;
  ta.focus();
  ta.setSelectionRange(range[0], range[1]);
  status.textContent = `Match ${idx + 1} of ${total}`;
}

function step(dir) {
  const matches = allMatches();
  if (!matches.length) { updateStatus(); return; }
  let idx;
  if (dir < 0) {
    idx = matches.filter(([s]) => s < ta.selectionStart).length - 1;
    if (idx < 0) idx = matches.length - 1; // wrap to end
  } else {
    idx = matches.findIndex(([s]) => s >= ta.selectionEnd);
    if (idx === -1) idx = 0; // wrap to start
  }
  select(matches[idx], idx, matches.length);
}

function replaceCurrent() {
  if (patternOk() === false || !find.value) return;
  const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e);
  let isMatch = false;
  if (sel && current && current[0] === s && current[1] === e) {
    try { isMatch = new RegExp("^(?:" + pattern() + ")$", ignoreCase.checked ? "i" : "").test(sel); } catch (err) { isMatch = false; }
  }
  if (isMatch) {
    const replacement = useRegex.checked ? sel.replace(buildRegex(false), repl.value) : repl.value;
    ta.setRangeText(replacement, s, e, "end");
    current = null;
    step(1);
  } else {
    step(1); // not on a match yet: jump to the next one first
  }
}

function replaceAll() {
  if (patternOk() === false || !find.value) return;
  const re = buildRegex(true);
  const replacement = useRegex.checked ? repl.value : repl.value.replace(/\$/g, "$$$$");
  const count = (ta.value.match(re) || []).length;
  ta.value = ta.value.replace(re, replacement);
  current = null;
  status.textContent = count ? `${count} replaced` : "No matches";
  toast(count ? `Replaced ${count} match${count > 1 ? "es" : ""}` : "No matches", count ? "success" : "info");
}

$("fr-next").addEventListener("click", () => step(1));
$("fr-prev").addEventListener("click", () => step(-1));
$("fr-replace").addEventListener("click", replaceCurrent);
$("fr-all").addEventListener("click", replaceAll);
function loadExample() {
  ta.value = "The quick brown fox jumps over the lazy dog.\nA second fox watches the first fox from the trees.";
  find.value = "fox";
  repl.value = "cat";
  current = null;
  updateStatus();
}
document.getElementById("fr-example").addEventListener("click", loadExample);

[find, ta].forEach((el) => el.addEventListener("input", () => { current = null; updateStatus(); }));
[useRegex, ignoreCase].forEach((el) => el.addEventListener("change", updateStatus));
// A manual click or arrow keypress in the box means the selection is no longer "the current match".
ta.addEventListener("click", () => { current = null; });
ta.addEventListener("keyup", (e) => { if (e.key.startsWith("Arrow")) current = null; });

// Start with the example so the tool shows a match count on load.
loadExample();
