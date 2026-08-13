/* Lights Out, solved as linear algebra over GF(2).
 *
 * The board is a length-CELLS array of booleans (true = lit). Pressing a cell
 * flips it and its four orthogonal neighbours; pressing twice is a no-op and
 * order never matters, so the whole puzzle is a system of CELLS equations mod 2:
 * for each cell, the presses that touch it must sum (xor) to its lit state.
 *
 * This module is the pure core. It has no DOM and no dependencies, so it is
 * driven by both the game (src/js/tools/game-lights-out.js) and the tests
 * (test/lights-out.test.js).
 */
export const N = 5;
export const CELLS = N * N;
export const idx = (r, c) => r * N + c;

/* AFFECTS[i] is the bitmask of cells that pressing cell i flips: itself and any
 * orthogonal neighbour that is on the board. Precomputed once. */
const AFFECTS = Array.from({ length: CELLS }, (_, i) => {
  const r = Math.floor(i / N), c = i % N;
  let m = 0;
  for (const [rr, cc] of [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
    if (rr >= 0 && cc >= 0 && rr < N && cc < N) m |= 1 << idx(rr, cc);
  }
  return m;
});

/** A new board with cell `i` and its neighbours flipped. Pure; input untouched. */
export function press(board, i) {
  const next = board.slice();
  const m = AFFECTS[i];
  for (let j = 0; j < CELLS; j++) if ((m >> j) & 1) next[j] = !next[j];
  return next;
}

/** Is every light off? */
export const isClear = (board) => board.every((v) => !v);

/**
 * The shortest set of press indices that clears `board`, or null if the board
 * cannot be cleared at all.
 *
 * Gaussian elimination reduces the system; any all-zero row with a 1 on the
 * right means 0 = 1, i.e. no solution. The 5x5 system has nullity 4, so a
 * solvable board has 2^4 = 16 solutions that differ by the free columns. We try
 * all sixteen and keep the fewest presses, which is what makes a hint a move on
 * a shortest path rather than merely a legal one.
 */
export function solve(board) {
  const rows = AFFECTS.map((m, i) => ({ m, rhs: board[i] ? 1 : 0 }));
  const pivotRow = new Array(CELLS).fill(-1);
  const pivots = [];
  let row = 0;
  for (let col = 0; col < CELLS && row < CELLS; col++) {
    let sel = -1;
    for (let i = row; i < CELLS; i++) if ((rows[i].m >> col) & 1) { sel = i; break; }
    if (sel < 0) continue; // a free column: no equation pins it down
    [rows[row], rows[sel]] = [rows[sel], rows[row]];
    for (let i = 0; i < CELLS; i++) {
      if (i !== row && ((rows[i].m >> col) & 1)) { rows[i].m ^= rows[row].m; rows[i].rhs ^= rows[row].rhs; }
    }
    pivotRow[col] = row;
    pivots.push(col);
    row++;
  }
  // 0 = 1 anywhere means this board cannot be cleared at all.
  for (let i = row; i < CELLS; i++) if (rows[i].m === 0 && rows[i].rhs) return null;

  const freeCols = [];
  for (let c = 0; c < CELLS; c++) if (pivotRow[c] < 0) freeCols.push(c);
  let best = null;
  for (let mask = 0; mask < 1 << freeCols.length; mask++) {
    const x = new Array(CELLS).fill(0);
    freeCols.forEach((c, k) => { x[c] = (mask >> k) & 1; });
    // In reduced form a pivot row touches its own column and free ones only,
    // so one pass back over the pivots settles the rest.
    for (const c of pivots) {
      const r = rows[pivotRow[c]];
      let v = r.rhs;
      for (let j = 0; j < CELLS; j++) if (j !== c && ((r.m >> j) & 1) && x[j]) v ^= 1;
      x[c] = v;
    }
    const presses = [];
    for (let i = 0; i < CELLS; i++) if (x[i]) presses.push(i);
    if (!best || presses.length < best.length) best = presses;
  }
  return best;
}
