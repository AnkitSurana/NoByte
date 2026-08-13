// Slug generator — title text to a URL-friendly slug, fully client-side.
const input = document.getElementById("sg-input");
const sep = document.getElementById("sg-sep");
const lower = document.getElementById("sg-lower");
const strip = document.getElementById("sg-strip");
const output = document.getElementById("sg-output");
const lenEl = document.getElementById("sg-len");

// A small, common English stop-word list. Kept short on purpose: aggressive
// removal produces slugs that no longer match the title.
const STOP = new Set("a an and are as at be but by for if in into is it no not of on or such that the their then there these they this to was will with".split(" "));

function slugify() {
  const s = sep.value === "_" ? "_" : "-";
  let text = input.value.normalize("NFKD").replace(/[̀-ͯ]/g, ""); // strip accents
  if (lower.checked) text = text.toLowerCase();

  let words = text
    .replace(/[^a-zA-Z0-9\s-]+/g, " ") // drop punctuation and non-Latin
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean);

  if (strip.checked && words.length > 1) {
    const kept = words.filter((w) => !STOP.has(w.toLowerCase()));
    if (kept.length) words = kept; // never strip down to nothing
  }

  const slug = words.join(s);
  output.value = slug;
  lenEl.textContent = slug ? `${slug.length} characters` : "";
}

[input, sep, lower, strip].forEach((el) => el.addEventListener("input", slugify));
slugify();
