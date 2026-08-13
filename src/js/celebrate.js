/* Winning should feel like something. Two pieces, shared by every game so a win
 * reads the same across the site while each game picks its own words:
 *   burst()  — a party popper of paper bits over an element
 *   stamp()  — dims the board and lands a word across it
 * Both bow out under prefers-reduced-motion, which leaves the stamp in place
 * without the flight: the message is the point, the movement is decoration.
 */
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Palette straight from the theme, so a burst matches light and dark. */
function colours() {
  const s = getComputedStyle(document.documentElement);
  return ["--hl", "--ok", "--bad", "--c-dev", "--ink"]
    .map((v) => s.getPropertyValue(v).trim())
    .filter(Boolean);
}

/** Paper bits fired up out of `el`. Cleans up after itself. */
export function burst(el, { n = 54, spread = 2.2, from = 0.7 } = {}) {
  if (reduced || !el) return;
  const canvas = document.createElement("canvas");
  canvas.className = "celebrate-fx";
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  el.appendChild(canvas);
  const rect = el.getBoundingClientRect();
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = (canvas.width = rect.width * dpr);
  const h = (canvas.height = rect.height * dpr);
  const g = canvas.getContext("2d");
  const cols = colours();
  const bits = Array.from({ length: n }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * spread;
    const v = (9 + Math.random() * 11) * dpr;
    return {
      x: w / 2, y: h * from, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      s: (4 + Math.random() * 6) * dpr, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.5,
      c: cols[(Math.random() * cols.length) | 0], life: 1,
    };
  });
  let start = null;
  (function frame(t) {
    if (!start) start = t;
    g.clearRect(0, 0, w, h);
    for (const b of bits) {
      b.vy += 0.42 * dpr; b.x += b.vx; b.y += b.vy; b.rot += b.vr; b.life -= 0.009;
      g.save();
      g.translate(b.x, b.y);
      g.rotate(b.rot);
      g.globalAlpha = Math.max(0, b.life);
      g.fillStyle = b.c;
      g.fillRect(-b.s, -b.s * 0.6, b.s * 2, b.s * 1.2);
      g.restore();
    }
    if (t - start < 1200) requestAnimationFrame(frame);
    else canvas.remove();
  })();
}

/** Dim `el` and land a word across it. Returns a promise that settles when the
 *  overlay has gone, so a game can hold its own turn until then. */
export function stamp(el, { text, sub = "", tone = "good", hold = 1150 } = {}) {
  if (!el) return Promise.resolve();
  const wrap = document.createElement("div");
  wrap.className = `celebrate${reduced ? " is-still" : ""}`;
  wrap.innerHTML =
    `<span class="celebrate__veil"></span>` +
    `<span class="celebrate__box"><b class="celebrate__word celebrate__word--${tone}">${text}</b>` +
    (sub ? `<span class="celebrate__sub">${sub}</span>` : "") +
    `</span>`;
  // The board itself is the frame, never its container: anchoring to a parent
  // is what puts the word next to the board instead of in the middle of it.
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  el.appendChild(wrap);
  return new Promise((done) => {
    setTimeout(() => {
      wrap.classList.add("is-out");
      setTimeout(() => { wrap.remove(); done(); }, 180);
    }, hold);
  });
}

/** The pair together: the usual way a game says you won. */
export function celebrate(el, opts = {}) {
  burst(el, opts.burst);
  return stamp(el, opts);
}
