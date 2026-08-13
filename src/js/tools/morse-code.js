// Morse code translator — International Morse, text <-> code.
const input = document.getElementById("mc-input");
const output = document.getElementById("mc-output");
const errEl = document.getElementById("mc-error");
let mode = "encode";

const MAP = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
  I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
  Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....",
  6: "-....", 7: "--...", 8: "---..", 9: "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--",
  "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...",
  ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-",
  '"': ".-..-.", "$": "...-..-", "@": ".--.-.",
};
const REVERSE = Object.fromEntries(Object.entries(MAP).map(([k, v]) => [v, k]));

function encode(text) {
  return text.trim().toUpperCase().split(/\s+/).map((word) =>
    [...word].map((ch) => MAP[ch] || "").filter(Boolean).join(" ")
  ).filter(Boolean).join(" / ");
}

function decode(code) {
  // Words are separated by "/", letters by whitespace.
  const bad = new Set();
  const text = code.trim().split(/\s*\/\s*/).map((word) =>
    word.trim().split(/\s+/).map((sym) => {
      if (!sym) return "";
      const ch = REVERSE[sym];
      if (ch === undefined) { bad.add(sym); return ""; }
      return ch;
    }).join("")
  ).join(" ").trim();
  return { text, bad: [...bad] };
}

function run() {
  errEl.textContent = "";
  if (mode === "encode") {
    output.value = encode(input.value);
  } else {
    const { text, bad } = decode(input.value);
    output.value = text;
    if (bad.length) errEl.textContent = `Unrecognised sequence${bad.length > 1 ? "s" : ""}: ${bad.slice(0, 6).join(", ")}`;
  }
}

function setMode(next) {
  mode = next;
  const enc = next === "encode";
  document.getElementById("mc-t-enc").setAttribute("aria-selected", String(enc));
  document.getElementById("mc-t-dec").setAttribute("aria-selected", String(!enc));
  document.getElementById("mc-t-enc").tabIndex = enc ? 0 : -1;
  document.getElementById("mc-t-dec").tabIndex = enc ? -1 : 0;
  document.getElementById("mc-p-enc").hidden = !enc;
  document.getElementById("mc-p-dec").hidden = enc;
  input.placeholder = enc ? "SOS" : "... --- ...";
  document.querySelector('label[for="mc-input"]').textContent = enc ? "Text" : "Morse code";
  document.querySelector('label[for="mc-output"]').textContent = enc ? "Morse code" : "Text";
  run();
}

document.getElementById("mc-t-enc").addEventListener("click", () => setMode("encode"));
document.getElementById("mc-t-dec").addEventListener("click", () => setMode("decode"));
input.addEventListener("input", run);
setMode("encode");
