// Typing speed test — WPM and accuracy over a chosen time. Fully client-side.
const textEl = document.getElementById("ty-text");
const inputEl = document.getElementById("ty-input");
const wpmEl = document.getElementById("ty-wpm");
const accEl = document.getElementById("ty-acc");
const timeEl = document.getElementById("ty-time");
const durEl = document.getElementById("ty-dur");
const statusEl = document.getElementById("ty-status");

const BANK = "the of and to a in that it is was for on are as with his they at be this from I have or by one had not but what all were we when your can said there use an each which she do how their if will up other about out many then them these so some her would make like him into time has look two more write go see number no way could people my than first water been call who oil its now find long down day did get come made may part over new sound take only little work know place year live me back give most very after thing our just name good sentence man think say great where help through much before line right too mean old any same tell boy follow came want show also around form three small set put end does another well large must big even such because turn here why ask went men read need land different home us move try kind hand picture again change off play spell air away animal house point page letter mother answer found study still learn should America world".split(" ");

let target, started, done, timer, timeLeft, correct, typed;

function makeText(n = 60) {
  const words = [];
  for (let i = 0; i < n; i++) words.push(BANK[Math.floor(Math.random() * BANK.length)]);
  return words.join(" ");
}

function render() {
  const val = inputEl.value;
  let html = "";
  for (let i = 0; i < target.length; i++) {
    let cls = "";
    if (i < val.length) cls = val[i] === target[i] ? "ok" : "bad";
    else if (i === val.length) cls = "cur";
    // A real space (not &nbsp;) so the passage wraps instead of overflowing.
    // pre-wrap on the container keeps the space visible and breakable.
    html += `<span class="${cls}">${target[i]}</span>`;
  }
  textEl.innerHTML = html;
}

function stats() {
  const val = inputEl.value;
  typed = val.length;
  correct = 0;
  for (let i = 0; i < val.length; i++) if (val[i] === target[i]) correct++;
  const minutes = (Number(durEl.value) - timeLeft) / 60 || (1 / 60);
  const wpm = Math.max(0, Math.round((correct / 5) / minutes));
  wpmEl.textContent = wpm;
  accEl.textContent = typed ? `${Math.round((correct / typed) * 100)}%` : "100%";
}

function tick() {
  timeLeft--;
  timeEl.textContent = timeLeft;
  stats();
  if (timeLeft <= 0) finish();
}

// A plain read on the result: how the WPM compares to common benchmarks.
function verdict(wpm, acc) {
  let rank, note;
  if (wpm < 25) { rank = "Getting started"; note = "The average office worker types about 40 WPM. Practice is what moves this number."; }
  else if (wpm < 40) { rank = "Below average"; note = "The typical office typist is around 40 WPM, so this is close to it."; }
  else if (wpm < 55) { rank = "About average"; note = "Roughly the speed of a typical office worker, 40 to 55 WPM."; }
  else if (wpm < 70) { rank = "Above average"; note = "Faster than most office workers, who average 40 to 80 WPM."; }
  else if (wpm < 90) { rank = "Fast"; note = "Data entry and writing jobs usually ask for 70 to 100 WPM, which this clears."; }
  else if (wpm < 110) { rank = "Very fast"; note = "Above the 40 to 80 WPM range most professionals type at."; }
  else { rank = "Exceptional"; note = "Only a small share of typists hold a pace above 110 WPM."; }
  const a = parseInt(acc, 10);
  if (a === 100) note += " You also made no corrections.";
  else if (a < 90) note += ` Your accuracy was ${acc}. Slowing down slightly often raises the net speed, since mistakes cost more time than they save.`;
  return { rank, note };
}

function finish() {
  done = true;
  clearInterval(timer);
  inputEl.blur();
  inputEl.disabled = true;
  textEl.classList.add("done");
  stats();
  const v = verdict(Number(wpmEl.textContent), accEl.textContent);
  statusEl.innerHTML = `${v.rank}. ${wpmEl.textContent} WPM at ${accEl.textContent}.<span class="verdict-sub">${v.note}</span>`;
}

inputEl.addEventListener("input", () => {
  if (done) return;
  if (!started) {
    started = true;
    timeLeft = Number(durEl.value);
    statusEl.textContent = "Keep going…";
    timer = setInterval(tick, 1000);
  }
  // Stop accepting input past the passage length.
  if (inputEl.value.length > target.length) inputEl.value = inputEl.value.slice(0, target.length);
  render();
  stats();
  if (inputEl.value.length === target.length) finish();
});

textEl.addEventListener("click", () => inputEl.focus());

function reset() {
  clearInterval(timer);
  target = makeText();
  started = false; done = false;
  timeLeft = Number(durEl.value);
  inputEl.value = ""; inputEl.disabled = false;
  textEl.classList.remove("done");
  timeEl.textContent = timeLeft;
  wpmEl.textContent = "0";
  accEl.textContent = "100%";
  statusEl.textContent = "Tap the passage and start typing.";
  render();
}

durEl.addEventListener("change", reset);
document.getElementById("ty-new").addEventListener("click", () => { reset(); inputEl.focus(); });
reset();
