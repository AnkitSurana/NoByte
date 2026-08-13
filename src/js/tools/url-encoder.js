// URL encoder / decoder + URL part inspector.
const plain = document.getElementById("ue-plain");
const encoded = document.getElementById("ue-encoded");
const error = document.getElementById("ue-error");
const component = document.getElementById("ue-component");

let guard = false;
const enc = (s) => (component.checked ? encodeURIComponent(s) : encodeURI(s));
const dec = (s) => (component.checked ? decodeURIComponent(s) : decodeURI(s));

plain.addEventListener("input", () => {
  if (guard) return;
  guard = true; error.textContent = "";
  encoded.value = plain.value ? enc(plain.value) : "";
  guard = false;
});
encoded.addEventListener("input", () => {
  if (guard) return;
  guard = true;
  try { plain.value = encoded.value ? dec(encoded.value) : ""; error.textContent = ""; encoded.classList.remove("textarea--invalid"); }
  catch { error.textContent = "That is not valid percent-encoded text."; encoded.classList.add("textarea--invalid"); }
  guard = false;
});
component.addEventListener("change", () => plain.dispatchEvent(new Event("input")));

// URL inspector
const urlInput = document.getElementById("ue-url");
const partsEl = document.getElementById("ue-parts");
const urlError = document.getElementById("ue-url-error");
const paramsWrap = document.getElementById("ue-params-wrap");
const paramsTable = document.getElementById("ue-params");
const escapeHtml = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

urlInput.addEventListener("input", () => {
  const v = urlInput.value.trim();
  partsEl.innerHTML = ""; paramsWrap.classList.add("hidden"); urlError.textContent = "";
  if (!v) { urlInput.classList.remove("input--invalid"); return; }
  let u;
  try { u = new URL(v); } catch { urlError.textContent = "Enter a full URL including https://"; urlInput.classList.add("input--invalid"); return; }
  urlInput.classList.remove("input--invalid");
  const rows = [["Protocol", u.protocol], ["Host", u.host], ["Hostname", u.hostname], ["Port", u.port || "(default)"], ["Path", u.pathname], ["Hash", u.hash || "(none)"]];
  partsEl.innerHTML = rows.map(([k, val]) => `<div class="result-row"><span class="label">${k}</span><span class="val mono">${escapeHtml(val)}</span></div>`).join("");
  const entries = [...u.searchParams.entries()];
  if (entries.length) {
    paramsWrap.classList.remove("hidden");
    paramsTable.innerHTML = `<tr><th>Key</th><th>Value</th></tr>` + entries.map(([k, val]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(val)}</td></tr>`).join("");
  }
});
