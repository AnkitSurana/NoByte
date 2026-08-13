// Number base converter — BigInt based so large values keep full precision.
import { parseInBase as parseIn } from "/js/lib/bases.js";

const fields = [...document.querySelectorAll("[data-base]")];
const customBase = document.getElementById("nb-custom-base");
const customField = document.getElementById("nb-custom");
const error = document.getElementById("nb-error");

function humanBytes(n) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = Number(n), u = 0;
  while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
  return `${u === 0 ? v : v.toFixed(1)} ${units[u]}`;
}

function update(value, sourceEl) {
  fields.forEach((el) => {
    if (el === sourceEl) return;
    el.value = value === null ? "" : value.toString(Number(el.dataset.base));
  });
  const cb = Math.min(36, Math.max(2, parseInt(customBase.value) || 36));
  if (customField !== sourceEl) customField.value = value === null ? "" : value.toString(cb);

  const set = (id, v) => (document.getElementById(id).textContent = v);
  if (value === null) { ["nb-bits", "nb-grouped", "nb-bytes"].forEach((i) => set(i, "—")); return; }
  const bin = value.toString(2);
  set("nb-bits", bin.length);
  set("nb-grouped", bin.padStart(Math.ceil(bin.length / 4) * 4, "0").replace(/(.{4})(?=.)/g, "$1 "));
  set("nb-bytes", humanBytes(value));
}

function wire(el, getBase) {
  el.addEventListener("input", () => {
    error.textContent = "";
    fields.concat(customField).forEach((f) => f.classList.remove("input--invalid"));
    try {
      const v = parseIn(el.value, getBase());
      update(v, el);
    } catch (e) {
      error.textContent = e.message;
      el.classList.add("input--invalid");
    }
  });
}
fields.forEach((el) => wire(el, () => Number(el.dataset.base)));
wire(customField, () => Math.min(36, Math.max(2, parseInt(customBase.value) || 36)));
customBase.addEventListener("input", () => {
  const dec = document.getElementById("nb-dec").value;
  try { update(parseIn(dec, 10), null); } catch {}
});

document.getElementById("nb-dec").value = "255";
update(255n, document.getElementById("nb-dec"));
