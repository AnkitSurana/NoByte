// Read aloud: browser text-to-speech via the SpeechSynthesis API. On-device.
import { toast } from "/js/ui.js";

const $ = (id) => document.getElementById(id);
const text = $("ra-text"), voiceSel = $("ra-voice"), rate = $("ra-rate"), pitch = $("ra-pitch");
const synth = window.speechSynthesis;
let voices = [];

const EXAMPLE = "The quick brown fox jumps over the lazy dog. Your browser can read text aloud without sending a single word to a server.";

if (!synth) {
  toast("This browser does not support speech synthesis.", "error", 6000);
} else {
  const loadVoices = () => {
    voices = synth.getVoices();
    if (!voices.length) return;
    const current = voiceSel.value;
    voiceSel.innerHTML = voices.map((v, i) => `<option value="${i}">${v.name} (${v.lang})${v.default ? " (default)" : ""}</option>`).join("");
    if (current) voiceSel.value = current;
  };
  loadVoices();
  synth.addEventListener("voiceschanged", loadVoices);

  rate.addEventListener("input", () => { $("ra-rate-val").textContent = Number(rate.value).toFixed(1) + "x"; });
  pitch.addEventListener("input", () => { $("ra-pitch-val").textContent = Number(pitch.value).toFixed(1); });

  $("ra-play").addEventListener("click", () => {
    if (synth.paused && synth.speaking) { synth.resume(); return; }
    if (!text.value.trim()) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.value);
    const v = voices[Number(voiceSel.value)];
    if (v) u.voice = v;
    u.rate = Number(rate.value);
    u.pitch = Number(pitch.value);
    synth.speak(u);
  });
  $("ra-pause").addEventListener("click", () => { if (synth.speaking && !synth.paused) synth.pause(); });
  $("ra-stop").addEventListener("click", () => synth.cancel());

  $("ra-example").addEventListener("click", () => { text.value = EXAMPLE; });

  // Start with the example text so the tool is ready to read on load.
  text.value = EXAMPLE;

  // Stop speaking if the user leaves the page.
  addEventListener("pagehide", () => synth.cancel());
}
