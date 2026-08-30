// Unicode inspector: break text into characters and show the details of each.
import { debounce, copyText, toast } from "/js/ui.js";

const $ = (id) => document.getElementById(id);
const input = $("uc-in"), tbody = document.querySelector("#uc-table tbody"), summary = $("uc-summary");
const encoder = new TextEncoder();
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

function display(ch) {
  const cp = ch.codePointAt(0);
  // Show a visible placeholder for spaces, newlines, and other control characters.
  if (cp === 32) return "space";
  if (cp === 9) return "tab";
  if (cp === 10) return "newline";
  if (cp === 13) return "return";
  if (cp < 32 || (cp >= 127 && cp <= 160)) return "control";
  return esc(ch);
}

function render() {
  const chars = [...input.value];
  if (!chars.length) { tbody.innerHTML = ""; summary.textContent = ""; return; }
  tbody.innerHTML = chars.map((ch) => {
    const cp = ch.codePointAt(0);
    const hex = cp.toString(16).toUpperCase().padStart(4, "0");
    const bytes = encoder.encode(ch).length;
    return `<tr data-cp="U+${hex}" title="Copy code point">
      <td class="mono">${display(ch)}</td>
      <td class="mono">U+${hex}</td>
      <td class="mono">${cp}</td>
      <td class="mono">&amp;#x${hex};</td>
      <td class="mono">${bytes}</td>
    </tr>`;
  }).join("");
  const codeUnits = input.value.length;
  summary.textContent = `${chars.length} character${chars.length === 1 ? "" : "s"}, ${codeUnits} UTF-16 code unit${codeUnits === 1 ? "" : "s"}, ${encoder.encode(input.value).length} UTF-8 bytes`;
}

const run = debounce(render, 80);
input.addEventListener("input", run);
$("uc-example").addEventListener("click", () => { input.value = "Hi! café é € 🚀"; render(); });

// Click a row to copy its code point.
tbody.addEventListener("click", (e) => {
  const row = e.target.closest("tr[data-cp]");
  if (!row) return;
  copyText(row.dataset.cp);
  toast(`Copied ${row.dataset.cp}`);
});

render();
