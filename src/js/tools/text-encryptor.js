// Text encryptor: one input takes a message or an encrypted block; Lock and
// Unlock act on it, and the result flips into view below. AES-GCM with a
// PBKDF2-derived key, all on-device.
const $ = (id) => document.getElementById(id);
const inp = $("te-in"), pass = $("te-pass"), err = $("te-error");
const card = $("te-card"), outDec = $("te-out-dec"), outEnc = $("te-out-enc");
const encoder = new TextEncoder(), decoder = new TextDecoder();

const EXAMPLE = "Meet me at the old library at 8pm. Bring the map.";
const EXAMPLE_PASS = "correct horse battery staple";

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (str) => Uint8Array.from(atob(str.replace(/\s+/g, "")), (c) => c.charCodeAt(0));

async function deriveKey(passphrase, salt) {
  const base = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

async function encryptText(text, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(text));
  const packed = new Uint8Array(salt.length + iv.length + ct.byteLength);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(new Uint8Array(ct), salt.length + iv.length);
  return toB64(packed);
}

async function decryptText(b64, passphrase) {
  const data = fromB64(b64.trim());
  if (data.length < 29) throw new Error("too short");
  const salt = data.slice(0, 16), iv = data.slice(16, 28), ct = data.slice(28);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return decoder.decode(pt);
}

// A quick test for "this input is one of our encrypted blocks": base64 that
// unpacks to at least a salt + iv + a byte of ciphertext.
function looksEncrypted(s) {
  const t = s.trim();
  if (!/^[A-Za-z0-9+/=\s]+$/.test(t) || t.length < 40) return false;
  try { return fromB64(t).length >= 29; } catch { return false; }
}

// Show a result, flipping the output card to the matching side.
function showResult(kind, text) {
  const locked = kind === "encrypted";
  (locked ? outEnc : outDec).value = text;
  (locked ? $("te-copy-enc") : $("te-copy-dec")).hidden = false;
  card.dataset.face = locked ? "back" : "front";
}

async function lock() {
  err.textContent = "";
  if (!inp.value.trim()) { inp.focus(); return; }
  if (looksEncrypted(inp.value)) { err.textContent = "This already looks encrypted. Press Unlock to read it."; return; }
  if (!pass.value) { err.textContent = "Enter a passphrase first."; return; }
  try { showResult("encrypted", await encryptText(inp.value, pass.value)); }
  catch (e) { console.error(e); err.textContent = "Could not encrypt the message."; }
}

async function unlock() {
  err.textContent = "";
  if (!inp.value.trim()) { inp.focus(); return; }
  if (!looksEncrypted(inp.value)) { err.textContent = "This is not an encrypted block. Press Lock to encrypt it."; return; }
  if (!pass.value) { err.textContent = "Enter the passphrase used to encrypt."; return; }
  try { showResult("decrypted", await decryptText(inp.value, pass.value)); }
  catch (e) { err.textContent = "Could not decrypt. Check the passphrase and that the block is complete."; }
}

$("te-lock").addEventListener("click", lock);
$("te-unlock").addEventListener("click", unlock);

// Eye toggle: reveal or hide the passphrase.
$("te-eye").addEventListener("click", () => {
  const show = pass.type === "password";
  pass.type = show ? "text" : "password";
  const eye = $("te-eye");
  eye.setAttribute("aria-pressed", String(show));
  eye.setAttribute("aria-label", show ? "Hide passphrase" : "Show passphrase");
});

// Load a sample message + passphrase and lock it, so the flow is clear at a glance.
$("te-example").addEventListener("click", () => {
  inp.value = EXAMPLE;
  pass.value = EXAMPLE_PASS;
  err.textContent = "";
  lock();
});
