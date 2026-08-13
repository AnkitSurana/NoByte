/* WCAG 2.x relative luminance and contrast ratio.
 *
 * Shared, dependency-free core used by two tools: the contrast checker
 * (src/js/tools/contrast-checker.js) and the QR generator's scannability
 * warning (src/js/tools/qr-generator.js). Tested in test/wcag.test.js.
 */

/** Expand "#abc" or "abc" to "aabbcc"; leave a 6-digit hex as its digits. */
function hex6(hex) {
  let v = hex.trim().replace(/^#/, "");
  if (v.length === 3) v = v.split("").map((c) => c + c).join("");
  return v;
}

/** Relative luminance of an sRGB hex colour, 0 (black) to 1 (white). */
export function luminance(hex) {
  const v = hex6(hex);
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(v.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio (1 to 21) between two already-computed luminances. */
export const contrast = (l1, l2) => {
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};

/** Contrast ratio between two hex colours. */
export const contrastRatio = (a, b) => contrast(luminance(a), luminance(b));
