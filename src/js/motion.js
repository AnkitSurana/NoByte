// Motion layer. Everything here is progressive enhancement — with JS off,
// or reduced motion on, the page is fully usable and nothing stays hidden.
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- scroll reveals ----------
   Elements marked [data-reveal] fade up as they enter the viewport.
   Children of [data-reveal-group] get a staggered delay, capped so a
   long grid never feels like it is still loading. */
function initReveals() {
  const targets = [...document.querySelectorAll("[data-reveal]")];
  if (!targets.length) return;

  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-in"));
    return;
  }

  const pending = new Set(targets);
  const reveal = (el) => {
    el.classList.add("is-in");
    pending.delete(el);
    io.unobserve(el); // reveal once, never re-run
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) reveal(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
  );

  document.querySelectorAll("[data-reveal-group]").forEach((group) => {
    [...group.children].forEach((child, i) => {
      if (child.hasAttribute("data-reveal")) child.style.setProperty("--d", `${Math.min(i, 8) * 55}ms`);
    });
  });

  targets.forEach((el) => io.observe(el));

  // Failsafe: IO callbacks can go quiet (backgrounded/restored tabs, fast
  // scrolls in some engines). Sweep anything the viewport has already
  // passed so nothing is ever stuck invisible.
  const sweep = () => {
    if (!pending.size) return;
    const limit = window.innerHeight * 0.95;
    for (const el of [...pending]) {
      if (el.getBoundingClientRect().top < limit) reveal(el);
    }
  };
  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; sweep(); });
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
  document.addEventListener("visibilitychange", sweep);
  setTimeout(sweep, 600); // covers loading mid-page (e.g. #anchor or restored scroll)
}

/* ---------- count up ----------
   Animates [data-count] from 0 to its final value once it scrolls in. */
function initCounters() {
  const els = document.querySelectorAll("[data-count]");
  if (!els.length) return;
  if (reduced || !("IntersectionObserver" in window)) {
    els.forEach((el) => (el.textContent = el.dataset.count));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      io.unobserve(el);
      const target = Number(el.dataset.count) || 0;
      const start = performance.now();
      const dur = 900;
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        // ease-out cubic so it decelerates into the final number
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.5 });
  els.forEach((el) => io.observe(el));
}

/* ---------- cross-document view transitions ----------
   Opt in where supported; browsers without it just navigate normally. */
function initViewTransitions() {
  if (reduced) return;
  if (!("startViewTransition" in document)) return;
  // Same-origin navigations get a soft crossfade via the CSS below.
  const style = document.createElement("style");
  style.textContent = `
    @view-transition { navigation: auto; }
    ::view-transition-old(root) { animation: vt-out 180ms cubic-bezier(0.16,1,0.3,1) both; }
    ::view-transition-new(root) { animation: vt-in 260ms cubic-bezier(0.16,1,0.3,1) both; }
    @keyframes vt-out { to { opacity: 0; transform: translateY(-6px); } }
    @keyframes vt-in { from { opacity: 0; transform: translateY(8px); } }
  `;
  document.head.appendChild(style);
}

/* ---------- hero stickers follow the pointer ----------
   A gentle parallax: each capsule drifts toward the cursor by a different
   amount. Uses the `translate` property so it stacks with the CSS bob/rotate
   (which live on `transform`). Skipped for reduced motion and touch. */
function initStickerParallax() {
  const stickers = [...document.querySelectorAll(".sticker")];
  if (!stickers.length) return;
  if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
  stickers.forEach((s, i) => (s.dataset.depth = 8 + (i % 5) * 3)); // 8..20px
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
  const loop = () => {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    for (const s of stickers) {
      const d = +s.dataset.depth;
      s.style.translate = `${(cx * d).toFixed(1)}px ${(cy * d).toFixed(1)}px`;
    }
    raf = Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(loop) : null;
  };
  addEventListener("mousemove", (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;   // -1..1
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
}

/* ---------- a quiet hello for anyone who opens the console ---------- */
function initConsoleNote() {
  try {
    console.log("%cNoByte", "font:700 22px/1.5 system-ui,sans-serif;color:#1D1A16;background:#FFD84D;padding:4px 12px;border-radius:8px");
    console.log("%cNothing you do here leaves your browser. Want to check for yourself? It's all open source:\nhttps://github.com/AnkitSurana/NoByte", "color:#7c7666;font:13px/1.6 system-ui,sans-serif");
  } catch (e) {}
}

initReveals();
initCounters();
initViewTransitions();
initStickerParallax();
initConsoleNote();
