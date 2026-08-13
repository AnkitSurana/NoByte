// BMI calculator — metric and imperial, WHO categories.
let mode = "metric";
const ids = ["bmi-cm","bmi-kg","bmi-ft","bmi-in","bmi-lb"];

function calc() {
  let bmi = NaN;
  if (mode === "metric") {
    const cm = parseFloat(document.getElementById("bmi-cm").value);
    const kg = parseFloat(document.getElementById("bmi-kg").value);
    if (cm > 0 && kg > 0) bmi = kg / Math.pow(cm / 100, 2);
  } else {
    const ft = parseFloat(document.getElementById("bmi-ft").value) || 0;
    const inch = parseFloat(document.getElementById("bmi-in").value) || 0;
    const lb = parseFloat(document.getElementById("bmi-lb").value);
    const totalIn = ft * 12 + inch;
    if (totalIn > 0 && lb > 0) bmi = (lb / (totalIn * totalIn)) * 703;
  }
  const valueEl = document.getElementById("bmi-value");
  const catEl = document.getElementById("bmi-category");
  if (!Number.isFinite(bmi)) { valueEl.textContent = "—"; catEl.textContent = "—"; catEl.className = "badge badge--muted"; return; }
  valueEl.textContent = bmi.toFixed(1);
  let label, cls;
  if (bmi < 18.5) { label = "Underweight"; cls = "badge--muted"; }
  else if (bmi < 25) { label = "Healthy weight"; cls = "badge--ok"; }
  else if (bmi < 30) { label = "Overweight"; cls = "badge--muted"; }
  else { label = "Obesity"; cls = "badge--danger"; }
  catEl.textContent = label;
  catEl.className = `badge ${cls}`;
}
ids.forEach((id) => document.getElementById(id).addEventListener("input", calc));
document.getElementById("b-t-metric").addEventListener("click", () => { mode = "metric"; calc(); });
document.getElementById("b-t-imperial").addEventListener("click", () => { mode = "imperial"; calc(); });
calc();
