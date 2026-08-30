// Regex tester — live highlighting and capture groups, with real per-language
// engines. JavaScript runs natively; Python runs its own re engine via Pyodide,
// loaded on demand. Each engine returns { error?, matches:[{start,end,groups}] }.
import { debounce, copyText } from "/js/ui.js";

const pattern = document.getElementById("re-pattern");
const text = document.getElementById("re-text");
const error = document.getElementById("re-error");
const highlight = document.getElementById("re-highlight");
const countEl = document.getElementById("re-count");
const groupsWrap = document.getElementById("re-groups-wrap");
const groupsTable = document.getElementById("re-groups");
const copyBtn = document.getElementById("re-copy");
const langSel = document.getElementById("re-lang");
const engineStatus = document.getElementById("re-engine-status");
const reCommon = document.getElementById("re-common");
const reSnippet = document.getElementById("re-snippet");
const reSnippetLine = document.getElementById("re-snippet-line");
const LANG_LABEL = { js: "JavaScript", python: "Python" };

const flagMenu = document.getElementById("re-flags");
const flagInputs = [...flagMenu.querySelectorAll("input[type=checkbox]")];
const flagsLabel = document.getElementById("re-flags-label");

const getFlags = () => flagInputs.filter((c) => c.checked && !c.disabled).map((c) => c.dataset.flag).join("");
const syncFlagsLabel = () => { flagsLabel.textContent = getFlags() || "none"; };

const escapeHtml = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Example patterns. Common ones are valid in both engines; each language also
// gets a showcase using its own named-group syntax so you can see the difference.
const COMMON_EXAMPLES = [
  ["Email", "[\\w.+-]+@[\\w-]+\\.[\\w.]+", "Contact ada@example.com or grace@navy.mil for details."],
  ["URL", "https?://[^\\s]+", "Visit https://nobyte.in and http://example.com/docs for more."],
  ["IPv4", "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b", "Servers 192.168.0.1, 10.0.0.255 and 8.8.8.8 all responded."],
  ["Date (YYYY-MM-DD)", "\\d{4}-\\d{2}-\\d{2}", "Archived logs from 2026-08-23 to 2026-09-01 on 2026-09-02."],
  ["Hex color", "#[0-9a-fA-F]{3,6}\\b", "Palette: #FFF8EC, #1A1A1A, #7FD1F5 and #f00."],
  ["Phone number", "\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}", "Call (555) 123-4567 or 555.987.6543 today."],
  ["Time (24-hour)", "\\b([01]?\\d|2[0-3]):[0-5]\\d\\b", "Doors 09:30, encore 22:05, close 23:59."],
  ["Hashtag", "#\\w+", "Loving #NoByte and #regex, thanks #devtools."],
  ["Price", "\\$\\d+(?:\\.\\d{2})?", "Items cost $12, $9.99, and $1499.00 total."],
  ["HTML tag", "</?[a-z]+>", "Use <b>, <i>, and </b> to format text."],
  ["Words ending in \"ing\"", "\\b\\w+ing\\b", "Running and jumping beat sitting and waiting."],
];
const LANG_EXAMPLES = {
  js: [["Named groups (JS syntax)", "(?<user>\\w+)@(?<host>[\\w.]+)", "Emails ada@example.com and bob@test.io."]],
  python: [["Named groups (Python syntax)", "(?P<user>\\w+)@(?P<host>[\\w.]+)", "Emails ada@example.com and bob@test.io."]],
};
const EXAMPLE_TEXT = new Map([...COMMON_EXAMPLES, ...LANG_EXAMPLES.js, ...LANG_EXAMPLES.python].map(([, p, t]) => [p, t]));

// A live demo per flag. These use JavaScript syntax, so a demo also switches the
// language back to JavaScript where every flag exists.
const FLAG_DEMOS = {
  g: { flags: ["g"], pattern: "\\w+", text: "one two three" },
  i: { flags: ["g", "i"], pattern: "cat", text: "cat Cat CAT" },
  m: { flags: ["g", "m"], pattern: "^\\w+", text: "red apple\ngreen pear\nblue plum" },
  s: { flags: ["g", "s"], pattern: "start.end", text: "start\nend" },
  u: { flags: ["g", "u"], pattern: "\\p{L}+", text: "café 日本 hello" },
  v: { flags: ["g", "v"], pattern: "[\\p{L}&&\\p{ASCII}]+", text: "café 日本 abc" },
  y: { flags: ["g", "y"], pattern: "\\d", text: "1 2 3" },
  d: { flags: ["g", "d"], pattern: "(\\w+)@(\\w+)", text: "ada@example bob@test" },
};

// Flags each language understands (g means "find every match" in this tool).
const LANG_FLAGS = {
  js: ["g", "i", "m", "s", "u", "v", "y", "d"],
  python: ["g", "i", "m", "s"],
};

// ---------- Engines ----------
const mk = (start, end, groups) => ({ start, end, groups: groups.map((g) => (g === undefined || g === null ? null : String(g))) });

function jsMatch(patternStr, flags, source) {
  let re;
  try { re = new RegExp(patternStr, flags); } catch (e) { return { error: e.message }; }
  const matches = [];
  if (flags.includes("g")) {
    let m, guard = 0;
    while ((m = re.exec(source)) !== null && guard++ < 5000) {
      if (m[0] === "") { re.lastIndex++; continue; }
      matches.push(mk(m.index, m.index + m[0].length, m.slice(1)));
    }
  } else {
    const m = re.exec(source);
    if (m && m[0] !== "") matches.push(mk(m.index, m.index + m[0].length, m.slice(1)));
  }
  return { matches };
}

// Python via Pyodide (CPython compiled to WASM), fetched on demand.
const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/";
let pyodidePromise = null;
function loadPyodide_() {
  if (!pyodidePromise) {
    engineStatus.textContent = "Downloading Python engine…";
    pyodidePromise = import(PYODIDE_URL + "pyodide.mjs")
      .then((mod) => mod.loadPyodide({ indexURL: PYODIDE_URL }))
      .catch((e) => { pyodidePromise = null; throw e; });
  }
  return pyodidePromise;
}
async function pythonMatch(patternStr, flags, source) {
  let py;
  try { py = await loadPyodide_(); } catch { return { error: "Could not load the Python engine." }; }
  engineStatus.textContent = "";
  let flagsInt = 0;
  if (flags.includes("i")) flagsInt |= 2;   // re.I
  if (flags.includes("m")) flagsInt |= 8;   // re.M
  if (flags.includes("s")) flagsInt |= 16;  // re.S
  py.globals.set("_pat", patternStr);
  py.globals.set("_src", source);
  py.globals.set("_flg", flagsInt);
  py.globals.set("_glob", flags.includes("g"));
  let out;
  try {
    out = py.runPython(`
import re, json
try:
    _re = re.compile(_pat, _flg)
    _ms = [m for m in _re.finditer(_src) if m.start() != m.end()]
    if not _glob:
        _ms = _ms[:1]
    _res = json.dumps({"matches": [[m.start(), m.end(), list(m.groups())] for m in _ms]})
except re.error as e:
    _res = json.dumps({"error": str(e)})
_res
`);
  } catch (e) { return { error: "Python could not run that pattern." }; }
  const parsed = JSON.parse(out);
  if (parsed.error) return { error: parsed.error };
  return { matches: parsed.matches.map(([s, e, g]) => mk(s, e, g)) };
}

const ENGINES = { js: jsMatch, python: pythonMatch };

// ---------- Render ----------
function render(matches, source, engineError) {
  groupsWrap.classList.add("hidden");
  if (engineError) {
    error.textContent = engineError;
    pattern.classList.add("input--invalid");
    highlight.innerHTML = escapeHtml(source);
    countEl.textContent = "0";
    return;
  }
  error.textContent = "";
  pattern.classList.remove("input--invalid");
  let out = "";
  let last = 0;
  const groupRows = [];
  matches.forEach((m, i) => {
    out += escapeHtml(source.slice(last, m.start));
    out += `<mark>${escapeHtml(source.slice(m.start, m.end))}</mark>`;
    last = m.end;
    if (m.groups.length) groupRows.push([i + 1, m.groups.map((g) => (g === null ? "(no match)" : g))]);
  });
  out += escapeHtml(source.slice(last));
  highlight.innerHTML = out || "<span class='muted'>No text</span>";
  countEl.textContent = String(matches.length);

  if (groupRows.length) {
    groupsWrap.classList.remove("hidden");
    const max = Math.max(...groupRows.map((r) => r[1].length));
    const head = `<tr><th>#</th>${Array.from({ length: max }, (_, i) => `<th>Group ${i + 1}</th>`).join("")}</tr>`;
    groupsTable.innerHTML = head + groupRows.map(([n, gs]) => `<tr><td>${n}</td>${gs.map((g) => `<td>${escapeHtml(g)}</td>`).join("")}</tr>`).join("");
  }
}

// Live preview of what Copy will produce for the current pattern, flags, and language.
function updateSnippet() {
  if (pattern.value) { reSnippet.textContent = buildSnippet(); reSnippetLine.classList.remove("hidden"); }
  else reSnippetLine.classList.add("hidden");
}

const run = debounce(async () => {
  const p = pattern.value, source = text.value, lang = langSel.value, flags = getFlags();
  updateSnippet();
  if (!p) { render([], source); engineStatus.textContent = ""; return; }
  const result = await (ENGINES[lang] || jsMatch)(p, flags, source);
  // Skip if the inputs changed while an async engine was working (avoids races).
  if (pattern.value !== p || text.value !== source || langSel.value !== lang || getFlags() !== flags) return;
  render(result.matches || [], source, result.error);
  engineStatus.textContent = "via " + (LANG_LABEL[lang] || lang);
}, 200);

// ---------- Copy: a ready-to-paste snippet for the chosen language ----------
// A Python string literal for the pattern: a raw string (r"...") when possible so
// backslashes stay literal, falling back to a normal escaped string when a raw
// string cannot represent it (contains both quote types, or ends in a backslash).
function pyStringLiteral(p) {
  const trailingBackslashes = (p.match(/\\+$/) || [""])[0].length;
  const rawOk = trailingBackslashes % 2 === 0;
  if (rawOk && !p.includes('"')) return `r"${p}"`;
  if (rawOk && !p.includes("'")) return `r'${p}'`;
  return '"' + p.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

function buildSnippet() {
  const p = pattern.value, flags = getFlags(), lang = langSel.value;
  if (lang === "python") {
    const parts = [];
    if (flags.includes("i")) parts.push("re.I");
    if (flags.includes("m")) parts.push("re.M");
    if (flags.includes("s")) parts.push("re.S");
    const fl = parts.length ? ", " + parts.join(" | ") : "";
    return `re.compile(${pyStringLiteral(p)}${fl})`;
  }
  try { const re = new RegExp(p, flags); return "/" + re.source + "/" + re.flags; }
  catch { return "/" + (p || "(?:)") + "/" + flags; }
}

// ---------- Language / flags wiring ----------
function applyLangFlags() {
  const allowed = LANG_FLAGS[langSel.value] || LANG_FLAGS.js;
  flagInputs.forEach((c) => {
    const ok = allowed.includes(c.dataset.flag);
    c.disabled = !ok;
    c.closest(".flag-row").classList.toggle("is-disabled", !ok);
    if (!ok) c.checked = false;
  });
  syncFlagsLabel();
}

[pattern, text].forEach((el) => el.addEventListener("input", run));

flagInputs.forEach((c) => c.addEventListener("change", () => {
  // u and v are mutually exclusive unicode modes; turning one on clears the other.
  if (c.checked && (c.dataset.flag === "u" || c.dataset.flag === "v")) {
    const other = flagInputs.find((x) => x.dataset.flag === (c.dataset.flag === "u" ? "v" : "u"));
    if (other) other.checked = false;
  }
  syncFlagsLabel();
  run();
}));

document.querySelectorAll(".flag-try").forEach((btn) => btn.addEventListener("click", () => {
  const demo = FLAG_DEMOS[btn.dataset.demo];
  if (!demo) return;
  langSel.value = "js"; // demos use JavaScript syntax and flags
  applyLangFlags();
  flagInputs.forEach((c) => { c.checked = demo.flags.includes(c.dataset.flag); });
  pattern.value = demo.pattern;
  text.value = demo.text;
  syncFlagsLabel();
  flagMenu.open = false;
  run();
}));

// Rebuild the example list for the current language (common set + its showcase).
function rebuildExamples() {
  const list = [...COMMON_EXAMPLES, ...(LANG_EXAMPLES[langSel.value] || [])];
  reCommon.innerHTML = '<option value="">Load an example…</option>' +
    list.map(([label, p]) => `<option value="${escapeHtml(p)}">${escapeHtml(label)}</option>`).join("");
}

langSel.addEventListener("change", () => { applyLangFlags(); rebuildExamples(); run(); });

copyBtn.addEventListener("click", () => copyText(buildSnippet(), copyBtn));

reCommon.addEventListener("change", (e) => {
  const p = e.target.value;
  if (!p) return;
  pattern.value = p;
  if (EXAMPLE_TEXT.has(p)) text.value = EXAMPLE_TEXT.get(p);
  run();
});

// Close the flags menu when clicking outside it.
document.addEventListener("click", (e) => {
  if (flagMenu.open && !flagMenu.contains(e.target)) flagMenu.open = false;
});

pattern.value = "[\\w.+-]+@[\\w-]+\\.[\\w.]+";
applyLangFlags();
rebuildExamples();
syncFlagsLabel();
run();
