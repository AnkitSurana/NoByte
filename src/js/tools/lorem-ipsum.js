// Lorem ipsum generator — paragraphs, sentences, or words.
const WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(" ");
const CLASSIC = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

const out = document.getElementById("li-out");
const countEl = document.getElementById("li-count");
const unitEl = document.getElementById("li-unit");
const classicEl = document.getElementById("li-classic");

const rand = (n) => Math.floor(Math.random() * n);
const word = () => WORDS[rand(WORDS.length)];

function sentence() {
  const len = 8 + rand(10);
  const words = Array.from({ length: len }, word);
  words[0] = words[0][0].toUpperCase() + words[0].slice(1);
  // occasional comma
  if (len > 10) words[Math.floor(len / 2)] += ",";
  return words.join(" ") + ".";
}
function paragraph() {
  return Array.from({ length: 3 + rand(3) }, sentence).join(" ");
}

function generate() {
  const n = Math.min(50, Math.max(1, parseInt(countEl.value) || 1));
  countEl.value = n;
  const unit = unitEl.value;
  let parts = [];
  if (unit === "words") {
    const words = Array.from({ length: n }, word);
    words[0] = words[0][0].toUpperCase() + words[0].slice(1);
    parts = [words.join(" ") + "."];
  } else if (unit === "sentences") {
    parts = [Array.from({ length: n }, sentence).join(" ")];
  } else {
    parts = Array.from({ length: n }, paragraph);
  }
  if (classicEl.checked && parts.length) {
    parts[0] = unit === "words" ? CLASSIC : CLASSIC + " " + parts[0];
  }
  out.value = parts.join("\n\n");
}
document.getElementById("li-gen").addEventListener("click", generate);
[countEl, unitEl, classicEl].forEach((el) => el.addEventListener("input", generate));
generate();
