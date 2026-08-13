/* Arbitrary-base integer parsing, BigInt-backed so large values keep full
 * precision (Number would lose it past 2^53). Pure and dependency-free; used by
 * the number base converter (src/js/tools/number-base-converter.js) and tested
 * in test/bases.test.js.
 */
export const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

/**
 * Parse `str` written in `base` (2 to 36) into a BigInt.
 * Returns null for empty input. Throws if a character is not a valid digit for
 * the base. A leading 0b / 0x / 0o prefix is ignored so pasted literals work.
 */
export function parseInBase(str, base) {
  const s = str.trim().toLowerCase().replace(/^0[bxo]/, "");
  if (!s) return null;
  let v = 0n;
  const b = BigInt(base);
  for (const ch of s) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) throw new Error(`"${ch}" is not valid in base ${base}`);
    v = v * b + BigInt(d);
  }
  return v;
}
