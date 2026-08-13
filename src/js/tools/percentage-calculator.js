// Percentage calculator — three common modes.
const num = (id) => parseFloat(document.getElementById(id).value);
const fmt = (n) => (Number.isFinite(n) ? Number(n.toFixed(4)).toLocaleString() : "—");

function calc() {
  const a = num("p1-x"), b = num("p1-y");
  document.getElementById("p1-out").textContent = Number.isFinite(a) && Number.isFinite(b) ? fmt((a / 100) * b) : "—";

  const c = num("p2-x"), d = num("p2-y");
  document.getElementById("p2-out").textContent = Number.isFinite(c) && Number.isFinite(d) && d !== 0 ? fmt((c / d) * 100) + "%" : "—";

  const e = num("p3-x"), f = num("p3-y");
  const out = document.getElementById("p3-out");
  if (Number.isFinite(e) && Number.isFinite(f) && e !== 0) {
    const change = ((f - e) / Math.abs(e)) * 100;
    out.textContent = `${change >= 0 ? "+" : ""}${fmt(change)}%`;
    out.style.color = change >= 0 ? "var(--ok)" : "var(--bad)";
  } else { out.textContent = "—"; out.style.color = ""; }
}
["p1-x","p1-y","p2-x","p2-y","p3-x","p3-y"].forEach((id) => document.getElementById(id).addEventListener("input", calc));
calc();
