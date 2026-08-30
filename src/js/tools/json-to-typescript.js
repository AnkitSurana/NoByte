// JSON to TypeScript interfaces. Infers nested objects, arrays, unions, and
// optional fields, all in the browser.
import { debounce } from "/js/ui.js";

const $ = (id) => document.getElementById(id);
const input = $("jt-in"), output = $("jt-out"), rootInput = $("jt-root"), status = $("jt-status");

const pascal = (name) => {
  const s = String(name).replace(/(^|[^A-Za-z0-9]+)([A-Za-z0-9])/g, (_, __, c) => c.toUpperCase()).replace(/[^A-Za-z0-9]/g, "");
  return /^[A-Za-z]/.test(s) ? s : "Root";
};
const validKey = (k) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k);

let interfaces, usedNames;

function uniqueName(base) {
  let name = base || "Root", n = 1;
  while (usedNames.has(name)) name = `${base}${++n}`;
  usedNames.add(name);
  return name;
}

// Merge a set of objects into one interface, marking a key optional when it is
// absent from some of them, and unioning the types seen for each key.
function inferObject(objs, name) {
  const iname = uniqueName(pascal(name));
  const keyVals = {};
  objs.forEach((o) => { for (const k of Object.keys(o)) (keyVals[k] ||= []).push(o[k]); });
  const total = objs.length;
  const lines = Object.entries(keyVals).map(([k, vals]) => {
    const t = inferValues(vals, k);
    const opt = vals.length < total ? "?" : "";
    const key = validKey(k) ? k : JSON.stringify(k);
    return `  ${key}${opt}: ${t};`;
  });
  interfaces.set(iname, lines.join("\n"));
  return iname;
}

function inferArray(items, name) {
  if (items.length === 0) return "unknown[]";
  const singular = /s$/.test(name) ? name.replace(/s$/, "") : "Item";
  const t = inferValues(items, singular);
  return (t.includes(" | ") ? `(${t})` : t) + "[]";
}

// Union of the types across a list of sample values for one field.
function inferValues(vals, name) {
  const prims = new Set(), objs = [], arrs = [];
  for (const v of vals) {
    if (v === null) prims.add("null");
    else if (Array.isArray(v)) arrs.push(v);
    else if (typeof v === "object") objs.push(v);
    else prims.add(typeof v);
  }
  const types = new Set(prims);
  if (objs.length) types.add(inferObject(objs, name));
  if (arrs.length) types.add(inferArray([].concat(...arrs), name));
  return types.size ? [...types].join(" | ") : "unknown";
}

function generate() {
  const raw = input.value.trim();
  if (!raw) { output.value = ""; status.textContent = ""; return; }
  let data;
  try { data = JSON.parse(raw); }
  catch (e) { output.value = ""; status.textContent = `Not valid JSON: ${e.message}`; return; }
  status.textContent = "";

  interfaces = new Map(); usedNames = new Set();
  const rootName = pascal(rootInput.value || "Root");
  let root;
  if (Array.isArray(data)) root = inferArray(data, rootName);
  else if (data && typeof data === "object") root = inferObject([data], rootName);
  else root = inferValues([data], rootName);

  const blocks = [...interfaces.entries()].reverse().map(([n, body]) => `export interface ${n} {\n${body}\n}`);
  let text = blocks.join("\n\n");
  if (!interfaces.has(root)) text = `export type ${rootName} = ${root};` + (text ? "\n\n" + text : "");
  output.value = text;
}

const run = debounce(generate, 120);
input.addEventListener("input", run);
rootInput.addEventListener("input", run);

document.getElementById("jt-example").addEventListener("click", () => {
  input.value = JSON.stringify({
    id: 1, name: "Ada Lovelace", active: true, roles: ["admin", "editor"],
    profile: { age: 36, city: "London" },
    posts: [{ title: "Notes", views: 12 }, { title: "Draft" }],
  }, null, 2);
  generate();
});

generate();

