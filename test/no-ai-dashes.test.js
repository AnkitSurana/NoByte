import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

// Guards the house style: user-facing copy uses plain ASCII punctuation, never
// the em-dash, en-dash, or Unicode minus that mark machine-written text. Code
// comments are exempt (they are stripped before the check), so header comments
// like "// Loan calculator - amortization" stay readable.
const DASHES = /[–—−]/; // en-dash, em-dash, minus sign

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
}

const context = (s, i) => JSON.stringify(s.slice(Math.max(0, i - 40), i + 40));

function stripHtml(s) {
  return s
    .replace(/<!--[\s\S]*?-->/g, "")          // HTML comments, including the meta line
    .replace(/<style[\s\S]*?<\/style>/gi, "") // scoped CSS (its /* */ comments live here)
    .replace(/<script[\s\S]*?<\/script>/gi, "");
}

function stripJs(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, "")                        // block comments
    .split("\n").map((l) => l.replace(/(?<!:)\/\/.*$/, "")).join("\n"); // line comments, keeping http://
}

test("no em/en/minus dashes in user-facing HTML", () => {
  for (const f of walk("src/pages", [".html"])) {
    const body = stripHtml(readFileSync(f, "utf8"));
    const i = body.search(DASHES);
    assert.equal(i, -1, `${relative(".", f)} has a non-ASCII dash near ${context(body, i)}`);
  }
});

test("no em/en/minus dashes in user-facing JS strings", () => {
  for (const f of walk("src/js", [".js"])) {
    const body = stripJs(readFileSync(f, "utf8"));
    const i = body.search(DASHES);
    assert.equal(i, -1, `${relative(".", f)} has a non-ASCII dash near ${context(body, i)}`);
  }
});
