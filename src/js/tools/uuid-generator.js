// UUID generator — crypto.randomUUID with a small fallback.
const out = document.getElementById("uu-out");
const countEl = document.getElementById("uu-count");
const upper = document.getElementById("uu-upper");
const nodash = document.getElementById("uu-nodash");

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function generate() {
  const n = Math.min(100, Math.max(1, parseInt(countEl.value) || 1));
  countEl.value = n;
  const list = Array.from({ length: n }, () => {
    let v = uuid();
    if (nodash.checked) v = v.replace(/-/g, "");
    if (upper.checked) v = v.toUpperCase();
    return v;
  });
  out.value = list.join("\n");
}

document.getElementById("uu-gen").addEventListener("click", generate);
[countEl, upper, nodash].forEach((el) => el.addEventListener("input", generate));
generate();
