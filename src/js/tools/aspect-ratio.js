// Aspect ratio calculator — keep width/height locked to a ratio.
const preset = document.getElementById("ar-preset");
const customWrap = document.getElementById("ar-custom-wrap");
const rw = document.getElementById("ar-rw");
const rh = document.getElementById("ar-rh");
const w = document.getElementById("ar-w");
const h = document.getElementById("ar-h");

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function currentRatio() {
  if (preset.value === "custom") return [Math.max(1, +rw.value || 1), Math.max(1, +rh.value || 1)];
  const [a, b] = preset.value.split(":").map(Number);
  return [a, b];
}

function render() {
  const [a, b] = currentRatio();
  const width = Math.max(1, +w.value || 1);
  const height = Math.max(1, +h.value || 1);
  document.getElementById("ar-result").textContent = `${width} × ${height}`;
  const g = gcd(width, height) || 1;
  document.getElementById("ar-simplified").textContent = `ratio ${a}:${b} · simplifies to ${width / g}:${height / g}`;
  // visual box
  const box = document.getElementById("ar-visual");
  const maxW = 260;
  const vw = Math.min(maxW, 260);
  box.style.width = vw + "px";
  box.style.height = Math.round((vw * b) / a) + "px";
}

function fromWidth() {
  const [a, b] = currentRatio();
  h.value = Math.round(((+w.value || 0) * b) / a);
  render();
}
function fromHeight() {
  const [a, b] = currentRatio();
  w.value = Math.round(((+h.value || 0) * a) / b);
  render();
}

w.addEventListener("input", fromWidth);
h.addEventListener("input", fromHeight);
preset.addEventListener("change", () => {
  customWrap.classList.toggle("hidden", preset.value !== "custom");
  fromWidth();
});
[rw, rh].forEach((el) => el.addEventListener("input", fromWidth));
fromWidth();
