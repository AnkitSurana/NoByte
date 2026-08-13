// Word counter — live text statistics, all local.
const input = document.getElementById("wc-input");
const stats = document.getElementById("wc-stats");
const set = (name, val) => {
  const el = stats.querySelector(`[data-stat="${name}"]`);
  if (el) el.textContent = val;
};

const EXAMPLE = `The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.

Reading speed is usually measured in words per minute. Most adults read prose at roughly 200 to 250 words per minute, so this tool estimates reading time at 200 wpm.`;

function analyze(text) {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;
  const sentences = trimmed ? (trimmed.match(/[.!?]+(\s|$)/g) || []).length || (trimmed ? 1 : 0) : 0;
  const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter((p) => p.trim()).length : 0;
  const seconds = Math.round((words / 200) * 60);
  const readingTime = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return { words, characters, charactersNoSpaces, sentences, paragraphs, readingTime };
}

function render() {
  const r = analyze(input.value);
  for (const [k, v] of Object.entries(r)) set(k, v);
}

input.addEventListener("input", render);
document.querySelector("[data-example]").addEventListener("click", () => {
  input.value = EXAMPLE;
  input.focus();
  render();
});
document.querySelector("[data-clear]").addEventListener("click", () => {
  input.value = "";
  input.focus();
  render();
});
render();
