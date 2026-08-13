import test from "node:test";
import assert from "node:assert/strict";
import { CELLS, solve, press, isClear } from "../src/js/lib/lights-out.js";

const OFF = () => Array(CELLS).fill(false);
const applyAll = (board, presses) => presses.reduce((b, i) => press(b, i), board);

// Deterministic PRNG (mulberry32) so any failure reproduces exactly.
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// All index subsets of exactly size k, in ascending order.
function* combos(n, k, start = 0, acc = []) {
  if (acc.length === k) { yield acc; return; }
  for (let i = start; i < n; i++) { acc.push(i); yield* combos(n, k, i + 1, acc); acc.pop(); }
}

test("an already-clear board needs zero presses", () => {
  assert.deepEqual(solve(OFF()), []);
});

test("a single lit-up press has itself as the unique minimal solution", () => {
  for (let i = 0; i < CELLS; i++) {
    assert.deepEqual(solve(press(OFF(), i)), [i]);
  }
});

test("press is its own inverse", () => {
  const r = rng(1);
  for (let t = 0; t < 200; t++) {
    let b = OFF();
    for (let k = 0; k < 8; k++) b = press(b, Math.floor(r() * CELLS));
    const i = Math.floor(r() * CELLS);
    assert.deepEqual(applyAll(b, [i, i]), b);
  }
});

test("every returned solution actually clears its board", () => {
  const r = rng(42);
  for (let t = 0; t < 500; t++) {
    let b = OFF();
    const k = 1 + Math.floor(r() * 15);
    for (let p = 0; p < k; p++) b = press(b, Math.floor(r() * CELLS));
    const s = solve(b);
    assert.notEqual(s, null, "a board built from presses is always solvable");
    assert.ok(isClear(applyAll(b, s)), "applying the solution clears the board");
    assert.equal(new Set(s).size, s.length, "no repeated presses");
    for (const i of s) assert.ok(i >= 0 && i < CELLS, "press index in range");
  }
});

test("the solution is minimal, brute-forced for small cases", () => {
  const r = rng(7);
  for (let t = 0; t < 40; t++) {
    let b = OFF();
    const k = 1 + Math.floor(r() * 3); // small builds keep the minimal small
    for (let p = 0; p < k; p++) b = press(b, Math.floor(r() * CELLS));
    if (isClear(b)) continue;
    const len = solve(b).length;
    if (len > 4) continue; // keep the exhaustive check cheap
    for (let size = 0; size < len; size++) {
      for (const sub of combos(CELLS, size)) {
        assert.ok(!isClear(applyAll(b, sub)), `a ${size}-press set beats the claimed minimum ${len}`);
      }
    }
  }
});

test("unsolvable boards are detected and returned as null", () => {
  // The reachable boards are a codim-4 subspace, so most random boards cannot
  // be cleared; the Gaussian 0 = 1 row must report those as null, and any board
  // it does solve must genuinely clear.
  const r = rng(99);
  let sawNull = false, sawSolvable = false;
  for (let t = 0; t < 600 && !(sawNull && sawSolvable); t++) {
    const b = Array.from({ length: CELLS }, () => r() < 0.5);
    const s = solve(b);
    if (s === null) sawNull = true;
    else { sawSolvable = true; assert.ok(isClear(applyAll(b, s))); }
  }
  assert.ok(sawNull, "at least one random board is unsolvable");
  assert.ok(sawSolvable, "at least one random board is solvable");
});
