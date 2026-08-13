// JWT decoder — base64url decode of header and payload. No signature verification.
const input = document.getElementById("jwt-input");
const error = document.getElementById("jwt-error");
const headerEl = document.getElementById("jwt-header");
const payloadEl = document.getElementById("jwt-payload");
const claimsEl = document.getElementById("jwt-claims");
const expBadge = document.getElementById("jwt-exp-badge");

const EXAMPLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlhdCI6MTcxNjIzOTAyMiwiZXhwIjoxNzE2MjQyNjIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

function b64urlDecode(part) {
  let s = part.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const fmtTime = (secs) => new Date(secs * 1000).toLocaleString();

function decode() {
  const token = input.value.trim();
  claimsEl.innerHTML = "";
  expBadge.innerHTML = "";
  if (!token) { error.textContent = ""; headerEl.textContent = "—"; payloadEl.textContent = "—"; input.classList.remove("textarea--invalid"); return; }
  const parts = token.split(".");
  if (parts.length < 2) {
    error.textContent = "A JWT has three parts separated by dots.";
    input.classList.add("textarea--invalid");
    return;
  }
  try {
    const header = JSON.parse(b64urlDecode(parts[0]));
    const payload = JSON.parse(b64urlDecode(parts[1]));
    error.textContent = "";
    input.classList.remove("textarea--invalid");
    headerEl.textContent = JSON.stringify(header, null, 2);
    payloadEl.textContent = JSON.stringify(payload, null, 2);

    const rows = [];
    if (payload.iat) rows.push(["Issued at", fmtTime(payload.iat)]);
    if (payload.nbf) rows.push(["Not before", fmtTime(payload.nbf)]);
    if (payload.exp) rows.push(["Expires", fmtTime(payload.exp)]);
    if (payload.iss) rows.push(["Issuer", payload.iss]);
    if (payload.sub) rows.push(["Subject", payload.sub]);
    claimsEl.innerHTML = rows.map(([k, v]) => `<div class="result-row"><span class="label">${k}</span><span class="val">${v}</span></div>`).join("");

    if (payload.exp) {
      const expired = payload.exp * 1000 < Date.now();
      expBadge.innerHTML = `<span class="badge ${expired ? "badge--danger" : "badge--ok"}">${expired ? "Expired" : "Not expired"}</span>`;
    }
  } catch {
    error.textContent = "Could not decode that token.";
    input.classList.add("textarea--invalid");
    headerEl.textContent = "—";
    payloadEl.textContent = "—";
  }
}

input.addEventListener("input", decode);
document.getElementById("jwt-example").addEventListener("click", () => { input.value = EXAMPLE; decode(); });
