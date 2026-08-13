// Dictionary — definitions from the free dictionaryapi.dev service.
// The looked-up word leaves the browser; this tool is not fully offline.
import { withPending } from "/js/ui.js";

const form = document.getElementById("dc-form");
const input = document.getElementById("dc-input");
const errorEl = document.getElementById("dc-error");
const resultsEl = document.getElementById("dc-results");
const button = form.querySelector("button");

const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function firstAudio(phonetics = []) {
  const a = phonetics.find((p) => p.audio);
  return a ? a.audio : "";
}
function phoneticText(entry) {
  if (entry.phonetic) return entry.phonetic;
  const p = (entry.phonetics || []).find((x) => x.text);
  return p ? p.text : "";
}

function renderEntry(entry) {
  const audio = firstAudio(entry.phonetics);
  const phon = phoneticText(entry);
  let html = `<div class="dc-entry">
    <div><span class="dc-word">${esc(entry.word)}</span>${phon ? `<span class="dc-phon">${esc(phon)}</span>` : ""}
    ${audio ? `<button class="btn btn--sm dc-audio" type="button" data-audio="${esc(audio)}" aria-label="Play pronunciation">▶ Play</button>` : ""}</div>`;
  for (const m of entry.meanings || []) {
    html += `<div class="dc-pos">${esc(m.partOfSpeech || "")}</div><ol class="dc-defs">`;
    for (const d of (m.definitions || []).slice(0, 6)) {
      html += `<li>${esc(d.definition)}`;
      if (d.example) html += `<div class="dc-ex">“${esc(d.example)}”</div>`;
      if (d.synonyms && d.synonyms.length) html += `<div class="dc-syn">synonyms: ${esc(d.synonyms.slice(0, 6).join(", "))}</div>`;
      html += `</li>`;
    }
    html += `</ol>`;
  }
  return html + `</div>`;
}

async function lookup(word) {
  errorEl.textContent = "";
  resultsEl.innerHTML = "";
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (res.status === 404) { errorEl.textContent = `No definitions found for "${word}".`; return; }
  if (!res.ok) throw new Error("request failed");
  const data = await res.json();
  resultsEl.innerHTML = data.map(renderEntry).join("");
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const word = input.value.trim();
  if (!word) return;
  withPending(button, async () => {
    try {
      await lookup(word);
    } catch {
      errorEl.textContent = "Could not reach the dictionary service. Check your connection and try again.";
    }
  });
});

// Play pronunciation audio on demand.
resultsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-audio]");
  if (btn) new Audio(btn.dataset.audio).play().catch(() => {});
});
