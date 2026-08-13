// Base64 encode / decode — UTF-8 safe, optional URL-safe alphabet, plus file mode.
import { initDropzone, humanBytes, toast } from "/js/ui.js";

const plain = document.getElementById("b64-plain");
const encoded = document.getElementById("b64-encoded");
const error = document.getElementById("b64-error");
const urlSafe = document.getElementById("b64-urlsafe");

const toB64 = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};
const fromB64 = (b64) => {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};
const applyUrlSafe = (s) => (urlSafe.checked ? s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : s);
const undoUrlSafe = (s) => {
  let v = s.replace(/-/g, "+").replace(/_/g, "/").trim();
  while (v.length % 4) v += "=";
  return v;
};

let guard = false;
plain.addEventListener("input", () => {
  if (guard) return;
  guard = true;
  error.textContent = "";
  encoded.classList.remove("textarea--invalid");
  encoded.value = plain.value ? applyUrlSafe(toB64(plain.value)) : "";
  guard = false;
});
encoded.addEventListener("input", () => {
  if (guard) return;
  guard = true;
  try {
    plain.value = encoded.value ? fromB64(undoUrlSafe(encoded.value)) : "";
    error.textContent = "";
    encoded.classList.remove("textarea--invalid");
  } catch {
    error.textContent = "That is not valid Base64.";
    encoded.classList.add("textarea--invalid");
  }
  guard = false;
});
urlSafe.addEventListener("change", () => plain.dispatchEvent(new Event("input")));

// File mode
initDropzone(document.getElementById("b64-drop"), (files) => {
  const f = files[0];
  if (f.size > 8 * 1024 * 1024) return toast("Pick a file under 8 MB.", "error");
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById("b64-file-info").textContent = `${f.name} · ${humanBytes(f.size)}`;
    document.getElementById("b64-file-wrap").classList.remove("hidden");
    document.getElementById("b64-file-out").value = String(reader.result).split(",")[1] || "";
  };
  reader.onerror = () => toast("Could not read that file.", "error");
  reader.readAsDataURL(f);
});
