// Audio extractor — pull the audio track out of a video file, entirely in the
// browser via ffmpeg.wasm. The file is decoded on-device; nothing is uploaded.
// The UMD build exposes window.FFmpegWASM (loaded by a plain <script> in the page).
import { initDropzone, download, humanBytes, toast } from "/js/ui.js";

const VENDOR = "/assets/vendor/ffmpeg";
const $ = (id) => document.getElementById(id);

const drop = $("ax-drop");
const info = $("ax-info");
const controls = $("ax-controls");
const previewWrap = $("ax-preview");
const video = $("ax-video");
const trimUI = $("ax-trim");
const track = $("ax-track");
const range = $("ax-range");
const h0 = $("ax-h0");
const h1 = $("ax-h1");
const startInput = $("ax-start");
const endInput = $("ax-end");
const playSelBtn = $("ax-play-sel");
const selLabel = $("ax-sel");
const formatSel = $("ax-format");
const bitrateSel = $("ax-bitrate");
const bitrateWrap = $("ax-bitrate-wrap");
const formatNote = $("ax-format-note");
const extractBtn = $("ax-extract");
const progressWrap = $("ax-progress-wrap");
const progressEl = $("ax-progress");
const bar = $("ax-bar");
const stage = $("ax-stage");
const pct = $("ax-pct");
const cancelBtn = $("ax-cancel");
const result = $("ax-result");
const outNameEl = $("ax-out-name");
const outMeta = $("ax-out-meta");
const downloadBtn = $("ax-download");
const againBtn = $("ax-again");

const FORMATS = {
  mp3:  { ext: "mp3",  mime: "audio/mpeg", lossy: true,  codec: ["-c:a", "libmp3lame"], note: "MP3 plays on anything." },
  m4a:  { ext: "m4a",  mime: "audio/mp4",  lossy: true,  codec: ["-c:a", "aac"],        note: "AAC gives better quality than MP3 at the same size." },
  wav:  { ext: "wav",  mime: "audio/wav",  lossy: false, codec: ["-c:a", "pcm_s16le"],  note: "Uncompressed PCM. Lossless, but large." },
  flac: { ext: "flac", mime: "audio/flac", lossy: false, codec: ["-c:a", "flac"],       note: "Lossless and compressed. Smaller than WAV, identical audio." },
};

let ffmpeg = null;
let engineReady = false;
let sourceFile = null;
let previewURL = null;
let durationSec = 0;
let durationInited = false;   // trim is initialised once per file, not on every durationchange
let trimStart = 0;
let trimEnd = 0;
let stopAt = null;      // for "Play selection"
let busy = false;
let cancelled = false;
let outBlob = null;
let outFilename = "audio";

const baseName = (name) => name.replace(/\.[^./\\]+$/, "") || "audio";
const srcExt = (name) => { const m = /\.([^./\\]+)$/.exec(name); return m ? m[1].toLowerCase() : "mp4"; };

function formatTime(s) {
  s = Math.round(s || 0);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

// Sub-second precision for the trim readout, so the number matches the exact
// frame/position — m:ss.SS (or h:mm:ss.SS). Whole-second rounding here was making
// a 1.50s trim read as "0:02".
function formatTimePrecise(s) {
  s = Math.max(0, s || 0);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  const secStr = sec.toFixed(2).padStart(5, "0"); // 2.5 -> "02.50"
  return h ? `${h}:${pad(m)}:${secStr}` : `${m}:${secStr}`;
}

// Parse "m:ss", "h:mm:ss", or plain seconds → seconds. null = empty, NaN = invalid.
function parseTime(str) {
  str = (str || "").trim();
  if (!str) return null;
  if (/^\d+(\.\d+)?$/.test(str)) return parseFloat(str);
  let m = /^(\d+):([0-5]?\d)(\.\d+)?$/.exec(str);
  if (m) return +m[1] * 60 + +m[2] + (m[3] ? +m[3] : 0);
  m = /^(\d+):([0-5]?\d):([0-5]?\d)(\.\d+)?$/.exec(str);
  if (m) return +m[1] * 3600 + +m[2] * 60 + +m[3] + (m[4] ? +m[4] : 0);
  return NaN;
}

/* ---------- trim state ---------- */
// With a known duration the visual handles are the source of truth. Without one
// (rare — unreadable container) we fall back to the typed inputs.
function getTrim() {
  if (!durationSec) {
    const s = parseTime(startInput.value), e = parseTime(endInput.value);
    const invalid = Number.isNaN(s) || Number.isNaN(e) || (s != null && e != null && e <= s);
    return { start: (s == null || Number.isNaN(s)) ? null : s, end: (e == null || Number.isNaN(e)) ? null : e, invalid };
  }
  return {
    start: trimStart > 0.05 ? trimStart : null,
    end: trimEnd < durationSec - 0.05 ? trimEnd : null,
    invalid: trimEnd <= trimStart,
  };
}
function effectiveDuration() {
  if (durationSec) return Math.max(0, trimEnd - trimStart);
  const { start, end } = getTrim();
  return end != null ? Math.max(0, end - (start || 0)) : 0;
}

function renderTrim() {
  if (!durationSec) return;
  const a = trimStart / durationSec, b = trimEnd / durationSec;
  h0.style.left = a * 100 + "%";
  h1.style.left = b * 100 + "%";
  range.style.left = a * 100 + "%";
  range.style.right = (1 - b) * 100 + "%";
  startInput.value = formatTimePrecise(trimStart);
  endInput.value = formatTimePrecise(trimEnd);
  [h0, h1].forEach((h, i) => {
    h.setAttribute("aria-valuemax", String(Math.round(durationSec)));
    h.setAttribute("aria-valuenow", String(Math.round(i ? trimEnd : trimStart)));
    h.setAttribute("aria-valuetext", formatTime(i ? trimEnd : trimStart));
  });
  const trimmed = trimStart > 0.05 || trimEnd < durationSec - 0.05;
  selLabel.textContent = trimmed
    ? `${formatTimePrecise(trimStart)} to ${formatTimePrecise(trimEnd)} · ${formatTimePrecise(trimEnd - trimStart)}`
    : "Full clip";
}

// Drag a handle; clamp against the other, and scrub the video to that frame.
function wireHandle(handle, isStart) {
  const setFromClientX = (clientX) => {
    const rect = track.getBoundingClientRect();
    let t = ((clientX - rect.left) / rect.width) * durationSec;
    t = Math.max(0, Math.min(durationSec, t));
    if (isStart) trimStart = Math.min(t, trimEnd - 0.1);
    else trimEnd = Math.max(t, trimStart + 0.1);
    if (video.readyState) { try { video.currentTime = isStart ? trimStart : trimEnd; } catch (e) {} }
    renderTrim();
  };
  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const move = (ev) => setFromClientX(ev.clientX);
    const up = () => { handle.releasePointerCapture(e.pointerId); handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  });
  handle.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 5 : 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? step : -step;
      if (isStart) trimStart = Math.max(0, Math.min(trimStart + d, trimEnd - 0.1));
      else trimEnd = Math.min(durationSec, Math.max(trimEnd + d, trimStart + 0.1));
      if (video.readyState) { try { video.currentTime = isStart ? trimStart : trimEnd; } catch (err) {} }
      renderTrim();
    }
  });
}
wireHandle(h0, true);
wireHandle(h1, false);

// Typed inputs update the same state (source of truth when duration known).
function onTimeInput() {
  if (!durationSec) return;
  const s = parseTime(startInput.value), e = parseTime(endInput.value);
  if (s != null && !Number.isNaN(s)) trimStart = Math.max(0, Math.min(s, trimEnd - 0.1));
  if (e != null && !Number.isNaN(e)) trimEnd = Math.min(durationSec, Math.max(e, trimStart + 0.1));
  renderTrim();
}
startInput.addEventListener("change", onTimeInput);
endInput.addEventListener("change", onTimeInput);

playSelBtn.addEventListener("click", () => {
  if (!durationSec) return;
  try { video.currentTime = trimStart; } catch (e) {}
  stopAt = trimEnd;
  video.play();
});
video.addEventListener("timeupdate", () => {
  if (stopAt != null && video.currentTime >= stopAt) { video.pause(); stopAt = null; }
});
video.addEventListener("play", () => { if (video.currentTime < trimStart - 0.2 || video.currentTime > trimEnd + 0.2) stopAt = null; });

/* ---------- format UI ---------- */
function updateFormatUI() {
  const f = FORMATS[formatSel.value];
  bitrateWrap.style.display = f && f.lossy ? "" : "none";
  formatNote.textContent = f ? f.note : "";
}
formatSel.addEventListener("change", updateFormatUI);

/* ---------- file selection ---------- */
initDropzone(drop, (files) => {
  const f = files[0];
  if (!f) return;
  sourceFile = f;
  outBlob = null;
  result.classList.add("hidden");
  progressWrap.classList.add("hidden");
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = URL.createObjectURL(f);
  durationSec = 0;
  durationInited = false;
  video.src = previewURL;
  info.textContent = `${f.name} · ${humanBytes(f.size)}`;
  controls.classList.remove("hidden");
  previewWrap.classList.remove("hidden");
  updateFormatUI();
});

function onDurationKnown() {
  durationSec = isFinite(video.duration) ? video.duration : 0;
  video.classList.toggle("ax-video--audio", video.videoWidth === 0);
  if (durationSec > 0) {
    if (!durationInited) { trimStart = 0; trimEnd = durationSec; durationInited = true; } // init once
    trimUI.classList.remove("hidden");
    renderTrim();
  } else {
    trimUI.classList.add("hidden"); // unknown duration → typed inputs only, hidden bar
  }
  const dur = durationSec ? ` · ${formatTime(durationSec)}` : "";
  info.textContent = `${sourceFile.name} · ${humanBytes(sourceFile.size)}${dur}`;
}

video.addEventListener("loadedmetadata", () => {
  // Some WebM/MediaRecorder files report duration:Infinity until seeked — force it.
  if (video.duration === Infinity || Number.isNaN(video.duration)) {
    const fix = () => {
      if (video.duration === Infinity) return;
      video.removeEventListener("durationchange", fix);
      try { video.currentTime = 0; } catch (e) {}
      onDurationKnown();
    };
    video.addEventListener("durationchange", fix);
    try { video.currentTime = 1e101; } catch (e) { onDurationKnown(); }
  } else {
    onDurationKnown();
  }
});

/* ---------- ffmpeg args ---------- */
// -vn drops video; -map a:0 takes the first audio track. -ss AFTER -i is output
// (decode) seeking — sample-accurate, so the cut lands exactly where the handle is
// (input seeking before -i is faster but snaps to a frame, which drifts the start).
// -t (duration) keeps the end unambiguous.
function buildArgs(fmt, inName, outName) {
  const { start, end } = getTrim();
  const post = [];
  if (start != null) post.push("-ss", String(start));
  if (start != null && end != null) post.push("-t", String(Math.max(0, end - start)));
  else if (end != null) post.push("-t", String(end));
  const args = ["-i", inName, ...post, "-vn", "-map", "a:0", ...fmt.codec];
  if (fmt.lossy) args.push("-b:a", bitrateSel.value + "k");
  args.push(outName);
  return args;
}

/* ---------- engine (lazy) ---------- */
async function ensureEngine() {
  if (engineReady && ffmpeg) return ffmpeg;
  if (!window.FFmpegWASM) throw new Error("engine-missing");
  const { FFmpeg } = window.FFmpegWASM;
  ffmpeg = new FFmpeg();
  ffmpeg.on("progress", ({ progress }) => { if (busy) setProgress(progress); });
  setStage("Loading engine (one-time ~32 MB)…");
  setIndeterminate(true);
  // Don't pass classWorkerURL: that forces a module worker whose UMD fallback can't
  // import an external core. Omitting it loads 814.ffmpeg.js as a classic worker via
  // webpack's publicPath (auto-detected from the vendored script's own URL), where
  // importScripts() loads the UMD core. coreURL/wasmURL must be fully-qualified.
  const abs = (p) => new URL(p, location.href).href;
  await ffmpeg.load({
    coreURL: abs(`${VENDOR}/ffmpeg-core.js`),
    wasmURL: abs(`${VENDOR}/ffmpeg-core.wasm`),
  });
  engineReady = true;
  return ffmpeg;
}

/* ---------- progress UI ---------- */
function setIndeterminate(on) {
  progressEl.setAttribute("data-indeterminate", String(on));
  if (on) { pct.textContent = ""; progressEl.removeAttribute("aria-valuenow"); bar.style.width = ""; }
}
function setProgress(p) {
  setIndeterminate(false);
  const v = Math.round(Math.max(0, Math.min(1, p || 0)) * 100);
  bar.style.width = v + "%";
  pct.textContent = v + "%";
  progressEl.setAttribute("aria-valuenow", String(v));
}
const setStage = (text) => { stage.textContent = text; };

/* ---------- extract ---------- */
extractBtn.addEventListener("click", async () => {
  if (!sourceFile || busy) return;
  const fmt = FORMATS[formatSel.value];
  if (getTrim().invalid) return toast("Check the trim times. The end must be after the start.", "error");
  busy = true; cancelled = false; outBlob = null;
  extractBtn.setAttribute("data-loading", "true");
  extractBtn.disabled = true;
  formatSel.disabled = true;
  result.classList.add("hidden");
  progressWrap.classList.remove("hidden");
  setIndeterminate(true);
  setStage("Preparing…");

  const inName = "input." + srcExt(sourceFile.name);
  const outFile = "output." + fmt.ext;
  try {
    await ensureEngine();
    if (cancelled) return;
    setStage("Reading video…");
    setIndeterminate(true);
    const data = new Uint8Array(await sourceFile.arrayBuffer());
    await ffmpeg.writeFile(inName, data);
    if (cancelled) return;
    setStage("Extracting audio…");
    setProgress(0);
    await ffmpeg.exec(buildArgs(fmt, inName, outFile));
    if (cancelled) return;
    setStage("Finalizing…");
    const out = await ffmpeg.readFile(outFile);
    if (!out || !out.length) throw new Error("empty-output");
    outBlob = new Blob([out], { type: fmt.mime });
    outFilename = baseName(sourceFile.name) + "." + fmt.ext;
    ffmpeg.deleteFile(inName).catch(() => {});
    ffmpeg.deleteFile(outFile).catch(() => {});
    showResult(fmt);
  } catch (e) {
    if (cancelled) return;
    console.error("[audio-extractor]", e);
    progressWrap.classList.add("hidden");
    if (e && e.message === "engine-missing") {
      toast("Couldn't load the audio engine. Check your connection and reload the page.", "error");
    } else {
      toast("Couldn't extract audio from this file. It may have no audio track, or an unsupported codec.", "error");
    }
  } finally {
    busy = false;
    extractBtn.removeAttribute("data-loading");
    extractBtn.disabled = false;
    formatSel.disabled = false;
  }
});

/* ---------- cancel ---------- */
cancelBtn.addEventListener("click", () => {
  if (!busy) return;
  cancelled = true;
  try { ffmpeg && ffmpeg.terminate(); } catch (e) {}
  ffmpeg = null; engineReady = false; // terminated worker can't be reused; reloads from cache
  busy = false;
  progressWrap.classList.add("hidden");
  extractBtn.removeAttribute("data-loading");
  extractBtn.disabled = false;
  formatSel.disabled = false;
  toast("Extraction cancelled.", "info");
});

/* ---------- result ---------- */
function showResult(fmt) {
  progressWrap.classList.add("hidden");
  outNameEl.textContent = outFilename;
  const dur = effectiveDuration();
  const parts = [fmt.ext.toUpperCase()];
  if (fmt.lossy) parts.push(bitrateSel.value + " kbps");
  parts.push(humanBytes(outBlob.size));
  if (dur) parts.push(formatTime(dur));
  outMeta.textContent = parts.join(" · ");
  result.classList.remove("hidden");
}
downloadBtn.addEventListener("click", () => { if (outBlob) download(outFilename, outBlob, outBlob.type); });
againBtn.addEventListener("click", () => {
  result.classList.add("hidden");
  drop.scrollIntoView({ behavior: "smooth", block: "center" });
});

addEventListener("pagehide", () => { if (previewURL) URL.revokeObjectURL(previewURL); }, { once: true });
updateFormatUI();
