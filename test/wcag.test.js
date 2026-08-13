import test from "node:test";
import assert from "node:assert/strict";
import { luminance, contrast, contrastRatio } from "../src/js/lib/wcag.js";

const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

test("luminance runs from 0 (black) to 1 (white)", () => {
  assert.ok(near(luminance("#000000"), 0));
  assert.ok(near(luminance("#ffffff"), 1));
});

test("black on white is 21:1, the WCAG maximum", () => {
  assert.ok(near(contrastRatio("#000000", "#ffffff"), 21));
});

test("contrast is symmetric and self-contrast is 1:1", () => {
  assert.ok(near(contrastRatio("#123456", "#abcdef"), contrastRatio("#abcdef", "#123456")));
  assert.ok(near(contrastRatio("#777777", "#777777"), 1));
});

test("3-digit and 6-digit hex, with or without #, agree", () => {
  assert.ok(near(luminance("#fff"), luminance("ffffff")));
  assert.ok(near(luminance("#abc"), luminance("#aabbcc")));
  assert.ok(near(luminance("abc"), luminance("#abc")));
});

test("contrast(luminance, luminance) matches contrastRatio(hex, hex)", () => {
  const a = "#3366cc", b = "#eeeeee";
  assert.ok(near(contrast(luminance(a), luminance(b)), contrastRatio(a, b)));
});

test("#767676 on white sits right at the AA 4.5:1 threshold", () => {
  const r = contrastRatio("#767676", "#ffffff");
  assert.ok(r > 4.5 && r < 4.6, `expected ~4.54, got ${r}`);
});
