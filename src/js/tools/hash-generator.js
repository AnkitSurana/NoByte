// Hash generator — SHA-1/256/384/512 via Web Crypto, for text and files.
import { initDropzone, humanBytes, copyText, debounce, toast } from "/js/ui.js";

const ALGOS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];
const results = document.getElementById("hg-results");
const input = document.getElementById("hg-input");

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

function renderRows(values) {
  results.innerHTML = ALGOS.map((a) => `
    <div class="card">
      <div class="row between mb-2"><strong class="small">${a}</strong>
        <button class="btn btn--sm copy-btn" data-algo="${a}"><svg class="icon icon-copy" aria-hidden="true"><use href="#copy"></use></svg><svg class="icon icon-check" aria-hidden="true"><use href="#check"></use></svg></button>
      </div>
      <div class="output-box" data-out="${a}" style="font-size:var(--t-xs);">${values[a] || "—"}</div>
    </div>`).join("");
  results.querySelectorAll("[data-algo]").forEach((btn) => {
    btn.addEventListener("click", () => copyText(values[btn.dataset.algo] || "", btn));
  });
}

async function hashBuffer(buf) {
  const values = {};
  for (const a of ALGOS) values[a] = hex(await crypto.subtle.digest(a, buf));
  return values;
}

const runText = debounce(async () => {
  const text = input.value;
  if (!text) return renderRows({});
  renderRows(await hashBuffer(new TextEncoder().encode(text)));
}, 200);

input.addEventListener("input", runText);

initDropzone(document.getElementById("hg-drop"), async (files) => {
  const f = files[0];
  document.getElementById("hg-file-info").textContent = `${f.name} · ${humanBytes(f.size)} · hashing…`;
  try {
    const values = await hashBuffer(await f.arrayBuffer());
    document.getElementById("hg-file-info").textContent = `${f.name} · ${humanBytes(f.size)}`;
    renderRows(values);
  } catch {
    toast("Could not read that file.", "error");
  }
});

renderRows({});
