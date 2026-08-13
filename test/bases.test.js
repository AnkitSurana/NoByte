import test from "node:test";
import assert from "node:assert/strict";
import { parseInBase, DIGITS } from "../src/js/lib/bases.js";

test("empty or whitespace input is null", () => {
  assert.equal(parseInBase("   ", 10), null);
  assert.equal(parseInBase("", 16), null);
});

test("parses the same value across common bases", () => {
  assert.equal(parseInBase("255", 10), 255n);
  assert.equal(parseInBase("ff", 16), 255n);
  assert.equal(parseInBase("11111111", 2), 255n);
  assert.equal(parseInBase("377", 8), 255n);
  assert.equal(parseInBase("z", 36), 35n);
});

test("ignores 0x / 0b / 0o prefixes and is case-insensitive", () => {
  assert.equal(parseInBase("0xFF", 16), 255n);
  assert.equal(parseInBase("0b1010", 2), 10n);
  assert.equal(parseInBase("0o17", 8), 15n);
  assert.equal(parseInBase("DeadBeef", 16), 0xdeadbeefn);
});

test("keeps full precision past Number's safe-integer range", () => {
  assert.equal(parseInBase("ffffffffffffffff", 16), (1n << 64n) - 1n);
});

test("rejects digits that are not valid for the base", () => {
  assert.throws(() => parseInBase("2", 2), /not valid in base 2/);
  assert.throws(() => parseInBase("g", 16), /not valid in base 16/);
});

test("the digit alphabet covers up to base 36", () => {
  assert.equal(DIGITS.length, 36);
});
