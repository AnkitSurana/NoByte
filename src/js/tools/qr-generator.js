// QR generator — vendored qrcode-generator, rendered to canvas + SVG. All local.
import { download, toast } from "/js/ui.js";
import { luminance, contrast } from "/js/lib/wcag.js";

// The library encodes byte-mode text one UTF-16 code unit at a time, truncated
// to a byte, so anything outside Latin-1 becomes a different character (a
// rupee sign, an emoji, Devanagari) and the code either decodes to nonsense or
// to nothing at all. Every scanner assumes UTF-8, so encode UTF-8.
qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];

const canvas = document.getElementById("qr-canvas");
const ctx = canvas.getContext("2d");
const errorEl = document.getElementById("qr-error");
const warnEl = document.getElementById("qr-warn");
const warnText = warnEl.querySelector("div");
const wrap = document.getElementById("qr-canvas-wrap");

const els = {
  text: document.getElementById("qr-text"),
  ssid: document.getElementById("qr-ssid"),
  pass: document.getElementById("qr-pass"),
  enc: document.getElementById("qr-enc"),
  fg: document.getElementById("qr-fg"),
  bg: document.getElementById("qr-bg"),
  eye: document.getElementById("qr-eye"),
  accent: document.getElementById("qr-accent"),
  style: document.getElementById("qr-style"),
  eyeStyle: document.getElementById("qr-eye-style"),
  frame: document.getElementById("qr-frame"),
  label: document.getElementById("qr-label"),
  brandName: document.getElementById("qr-brand-name"),
  lockup: document.getElementById("qr-lockup"),
  logoSize: document.getElementById("qr-logo-size"),
  nameSize: document.getElementById("qr-name-size"),
  nameFont: document.getElementById("qr-name-font"),
  nameAlign: document.getElementById("qr-name-align"),
  logoAlign: document.getElementById("qr-logo-align"),
};
const logoInput = document.getElementById("qr-logo");
const logoName = document.getElementById("qr-logo-name");
const logoClear = document.getElementById("qr-logo-clear");
const logoThumb = document.getElementById("qr-logo-thumb");
const fieldLabel = document.getElementById("f-label");
const fieldAccent = document.getElementById("f-accent");
const fieldLockup = document.getElementById("f-lockup");
const fieldLogoAlign = document.getElementById("f-logo-align");
const fieldNameAlign = document.getElementById("f-name-align");

let activeType = "text";
let currentModules = null; // { count, dark: boolean[][] }
let brandImg = null;       // the NoByte mark, preloaded
let userImg = null;        // { img, src } for an uploaded logo

/* Branding is opt-in. Until the switch is on, every styling control reads back
 * its plain default, so the drawing is a plain black code however the (hidden)
 * controls happen to be set. Flipping the switch just lets the real values
 * through, so nothing is lost when it is turned off and on again. The NoByte
 * mark and credit line sit outside this: they are on every code. */
const brand = {
  on: false,
  frame:    () => brand.on ? els.frame.value : "none",
  style:    () => brand.on ? els.style.value : "square",
  eyeStyle: () => brand.on ? els.eyeStyle.value : "square",
  fg:       () => brand.on ? els.fg.value : "#0b0c0e",
  eye:      () => brand.on ? els.eye.value : "#0b0c0e",
  bg:       () => brand.on ? els.bg.value : "#ffffff",
  accent:   () => brand.on ? els.accent.value : "#ffd84d",
  name:     () => brand.on ? els.brandName.value.trim() : "",
  logo:     () => brand.on ? userImg : null,
  lockup:   () => brand.on ? els.lockup.value : "split",
  // A multiplier on the logo's height within its band, so a square mark and a
  // wide wordmark can each be brought to the weight their artwork wants.
  logoScale: () => brand.on ? Number(els.logoSize.value) / 100 : 1,
  nameScale: () => brand.on ? Number(els.nameSize.value) / 100 : 1,
  nameFace:  () => (brand.on && FONTS[els.nameFont.value]) || FONTS.display,
  // Where the name and the logo sit. What the value means depends on the shape
  // the brand is being placed in, which is what syncShapeControls() keeps the
  // two selects honest about: an x offset on the flat shapes, an angle on the
  // round ones.
  namePlace: () => brand.on ? els.nameAlign.value : "center",
  logoPlace: () => brand.on ? els.logoAlign.value : "center",
};

/* ---------- payload ---------- */
function escapeWifi(s) {
  return s.replace(/([\\;,:"])/g, "\\$1");
}

function payload() {
  if (activeType === "wifi") {
    const enc = els.enc.value;
    const ssid = escapeWifi(els.ssid.value);
    if (!ssid) return "";
    if (enc === "nopass") return `WIFI:T:nopass;S:${ssid};;`;
    return `WIFI:T:${enc};S:${ssid};P:${escapeWifi(els.pass.value)};;`;
  }
  return els.text.value;
}

/* ---------- geometry ----------
 * Every shape below is described once, in module units, and handed to two
 * renderers: one paints a canvas, the other prints SVG. The preview, the PNG
 * and the SVG are then the same drawing rather than three that drift apart.
 */
const QUIET = 4;
const STROKE = 0.18; // frame outline, in modules
const n = (v) => Math.round(v * 1000) / 1000;

/* Labels are measured here, once, in module units. Two reasons: a long label
 * has to be shrunk to fit rather than spill over the modules it sits on, and
 * the exported SVG can then pin the text to that exact width with textLength,
 * so it lands the same on a machine that has never heard of Outfit. */
const gauge = document.createElement("canvas").getContext("2d");
const DISPLAY = "Outfit, system-ui, sans-serif";
/* The three faces the site already ships, so a chosen font is one that is
 * actually loaded rather than whatever the viewer happens to have. */
const FONTS = {
  display: { family: DISPLAY, weight: 700 },
  text:    { family: "Inter, system-ui, sans-serif", weight: 500 },
  mono:    { family: "'JetBrains Mono', ui-monospace, monospace", weight: 500 },
};
const FONT = (size) => `700 ${size}px ${DISPLAY}`;
/* Measured in the face it will be drawn in: a width taken from one family and
 * applied to another is what makes textLength stretch the glyphs to reach it. */
function textWidth(text, size, face) {
  gauge.font = face ? `${face.weight} 100px ${face.family}` : FONT(100);
  return (gauge.measureText(text).width / 100) * size;
}
/** Largest size at or below `size` that keeps `text` inside `max`. */
function fitSize(text, size, max, face) {
  const w = textWidth(text, size, face);
  return w > max ? (size * max) / w : size;
}

const inFinder = (r, c, count) =>
  (r < 7 && c < 7) || (r < 7 && c >= count - 7) || (r >= count - 7 && c < 7);

/** Rounded rectangle path with a radius per corner: [tl, tr, br, bl]. */
function rectPath(x, y, w, h, [tl, tr, br, bl] = [0, 0, 0, 0]) {
  const arc = (r, ex, ey) => (r ? `A${n(r)} ${n(r)} 0 0 1 ${n(ex)} ${n(ey)}` : `L${n(ex)} ${n(ey)}`);
  return (
    `M${n(x + tl)} ${n(y)}` +
    `L${n(x + w - tr)} ${n(y)}` + arc(tr, x + w, y + tr) +
    `L${n(x + w)} ${n(y + h - br)}` + arc(br, x + w - br, y + h) +
    `L${n(x + bl)} ${n(y + h)}` + arc(bl, x, y + h - bl) +
    `L${n(x)} ${n(y + tl)}` + arc(tl, x + tl, y) + "Z"
  );
}
const sq = (x, y, r) => rectPath(x, y, 1, 1, [r, r, r, r]);

/** A circle as two arcs, so it can share a path with everything else. */
function circlePath(cx, cy, r, sweep = 1) {
  return `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 ${sweep} ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 ${sweep} ${n(cx - r)} ${n(cy)}Z`;
}

/** Every dark module that is not part of a finder square. */
function bodyPath(ox, oy) {
  const { count, dark } = currentModules;
  const style = brand.style();
  const on = (r, c) => r >= 0 && c >= 0 && r < count && c < count && dark[r][c] && !inFinder(r, c, count);
  let d = "";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!dark[r][c] || inFinder(r, c, count)) continue;
      const x = ox + c + QUIET, y = oy + r + QUIET;
      if (style === "dots") d += circlePath(x + 0.5, y + 0.5, 0.42);
      else if (style === "rounded") {
        // A corner is only rounded where nothing joins it, so runs of modules
        // read as one smooth blob instead of a string of beads.
        const up = on(r - 1, c), down = on(r + 1, c), left = on(r, c - 1), right = on(r, c + 1);
        const k = 0.4;
        d += rectPath(x, y, 1, 1, [
          !up && !left ? k : 0, !up && !right ? k : 0,
          !down && !right ? k : 0, !down && !left ? k : 0,
        ]);
      } else d += `M${n(x)} ${n(y)}h1v1h-1Z`;
    }
  }
  return d;
}

/** One module of the current style, for anything that is not the code itself. */
function moduleAt(x, y) {
  const style = brand.style();
  if (style === "dots") return circlePath(x + 0.5, y + 0.5, 0.42);
  if (style === "rounded") return sq(x, y, 0.4);
  return `M${n(x)} ${n(y)}h1v1h-1Z`;
}

// Stable noise: the same cell always decides the same way, so the preview, the
// PNG and the SVG all get the identical pattern.
function noise(x, y) {
  let h = Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** The ring of loose modules that turns a square code into a round one. They
 *  carry no data. What keeps the code readable is where they are allowed to
 *  start: never closer to the matrix than the four-module clear margin the spec
 *  asks for, measured from the matrix itself rather than from the centre, so
 *  the ring can come in close along the flats instead of leaving a wide gap.
 *  Anything in `keepOut` (a label, a logo) is left blank to sit in. */
function decorPath(ox, oy, cx, cy, r1, gap) {
  const cnt = currentModules.count;
  const half = cnt / 2;
  const mcx = ox + QUIET + half, mcy = oy + QUIET + half;
  // Centred on the matrix, not on its top-left module: anchoring the sweep at
  // the corner leaves the far side of the circle outside the range entirely.
  const lo = Math.floor(half - r1) - 2, hi = Math.ceil(half + r1) + 2;
  let d = "";
  for (let i = lo; i <= hi; i++) {
    for (let j = lo; j <= hi; j++) {
      const x = ox + QUIET + i, y = oy + QUIET + j;
      const mx = x + 0.5, my = y + 0.5;
      // Outside the matrix by at least `gap`, and inside the circle.
      const out = Math.max(Math.abs(mx - mcx), Math.abs(my - mcy)) - half;
      if (out < gap) continue;
      if (Math.hypot(mx - cx, my - cy) > r1 - 0.5) continue;
      if (noise(i, j) > 0.46) continue;
      d += moduleAt(x, y);
    }
  }
  return d;
}

/** The three finder squares: a 7x7 ring with a 3x3 centre, holes cut with the
 *  even-odd rule, which Path2D and SVG apply the same way. */
function eyePath(ox, oy) {
  const { count } = currentModules;
  const style = brand.eyeStyle();
  let d = "";
  for (const [c, r] of [[0, 0], [count - 7, 0], [0, count - 7]]) {
    const x = ox + c + QUIET, y = oy + r + QUIET;
    if (style === "circle") {
      d += circlePath(x + 3.5, y + 3.5, 3.5) + circlePath(x + 3.5, y + 3.5, 2.5, 0) + circlePath(x + 3.5, y + 3.5, 1.5);
    } else {
      const k = style === "rounded" ? 2 : 0;
      const ring = (ox2, oy2, s, rad) => rectPath(ox2, oy2, s, s, [rad, rad, rad, rad]);
      d += ring(x, y, 7, k) + ring(x + 1, y + 1, 5, Math.max(0, k - 1)) + ring(x + 2, y + 2, 3, style === "rounded" ? 1.2 : 0);
    }
  }
  return d;
}

/* ---------- the scene ----------
 * A frame is a card the code sits on. The code itself never changes shape: the
 * spec needs a square grid and a clear margin around it, so "a round QR code"
 * means a square code on a round card.
 */
/* pad is the card's own margin, on top of the code's four-module quiet zone.
 * It is small on purpose: the quiet zone already is the white space around the
 * code, so a generous pad on top of it just leaves the card looking empty. */
const FRAMES = {
  none:    { pad: 0,    label: false },
  panel:   { pad: 0.8,  label: false },
  rounded: { pad: 0.8,  label: false },
  round:   { pad: 0,    label: false, round: true },
  ring:    { pad: 0,    label: true,  round: true },
  badge:   { pad: 0.8,  label: true },
};

const light = (hex) => luminance(hex) > 0.4;

/** Does the user's own logo or name need somewhere to go? */
function hasBrand() {
  return Boolean(brand.logo() || brand.name());
}

/* The logo is cut to the shape it is sitting in: a circle on the round shapes,
 * the card's own corner radius on the cards, square on the square ones. */
const LOGO_CUT = { none: 0, panel: 0, rounded: 0.22, round: 0.5, ring: 0.5, badge: 0.22 };
const logoRadius = (size) => size * (LOGO_CUT[brand.frame()] ?? 0);

// Where a badge sits on a round shape's ring, measured from the centre.
const BADGE_ANGLE = { top: -Math.PI / 2, bottom: Math.PI / 2, left: Math.PI, right: 0 };

/** The customer's logo and name, laid out as one centred row and scaled to fit
 *  the space it has been given. Returned in coordinates relative to (0,0), so
 *  the caller can drop it into a strip or into the top of a ring. */
function brandGroup(maxW, maxH, fill, parts = "both") {
  let name = parts === "logo" ? "" : brand.name();
  const gap = maxH * 0.22;
  const logo = parts === "name" ? null : brand.logo();
  let logoW = 0, logoH = 0;
  if (logo) {
    const ratio = logo.img.naturalWidth / logo.img.naturalHeight || 1;
    logoH = maxH * brand.logoScale();
    logoW = logoH * ratio;
  }
  // A wide logo is capped rather than left to eat the whole row, so a banner
  // logo and a name can still sit side by side.
  const logoCap = name ? maxW * 0.42 : maxW;
  if (logoW > logoCap) { logoH *= logoCap / logoW; logoW = logoCap; }

  const face = brand.nameFace();
  let size = name ? maxH * 0.72 * brand.nameScale() : 0;
  let textW = name ? textWidth(name, size, face) : 0;
  let w = logoW + (logoW && textW ? gap : 0) + textW;
  if (w > maxW) {
    // Shrink the row as a whole so the logo and the name stay in proportion,
    // but never past the point of being readable.
    const k = maxW / w;
    const floor = maxH * 0.42;
    if (size * k >= floor) {
      logoW *= k; logoH *= k; size *= k; textW *= k;
    } else {
      size = floor;
      const room = maxW - logoW - (logoW ? gap : 0);
      // One line, always: if the name still will not fit at the smallest size
      // it reads at, it is cut rather than wrapped or spilled.
      if (textWidth(name, size, face) > room) {
        while (name.length > 1 && textWidth(name + "\u2026", size, face) > room) name = name.slice(0, -1);
        name += "\u2026";
      }
      textW = textWidth(name, size, face);
    }
    w = logoW + (logoW && textW ? gap : 0) + textW;
  }
  const items = [];
  let x = -w / 2;
  if (logoW) {
    items.push({ t: "image", x, y: -logoH / 2, w: logoW, h: logoH, img: logo.img, src: logo.src, radius: logoRadius(Math.min(logoW, logoH)) });
    x += logoW + gap;
  }
  if (textW) items.push({ t: "text", x: x + textW / 2, y: 0, size, fit: textW, text: name, fill, font: face.family, weight: face.weight });
  return { items, w, h: Math.max(logoH, size) };
}

const shift = (group, dx, dy) => group.items.map((it) => ({ ...it, x: it.x + dx, y: it.y + dy }));

/** Build the whole drawing in module units. */
function scene() {
  const total = currentModules.count + QUIET * 2;
  const kind = brand.frame();
  const f = FRAMES[kind] || FRAMES.none;
  const bg = brand.bg(), fg = brand.fg(), accent = brand.accent();
  const logo = brand.logo();
  const items = [];
  // Outlines are painted after everything else. A label bar filled up to the
  // card's edge would otherwise cover the inner half of the border and leave a
  // yellow bite out of it.
  const outlines = [];
  let W, H, ox = 0, oy = 0;
  /* On the flat shapes the branding straddles the code rather than sitting in
   * one strip beneath it: the mark goes above, the name below. It frames the
   * code instead of hanging off it, and it stops a wide logo and a long name
   * competing for one row. Each strip only exists if it has something in it, so
   * a code with just a name keeps its old proportions. */
  const lock = brand.lockup();
  const flat = !f.round;
  // "split" is the default lockup: mark above, name below. The other two keep
  // both together on one side, which suits a wordmark that already reads as the
  // name, or a logo that wants to sit with it.
  const above = lock === "above" ? hasBrand() : lock === "split" && Boolean(brand.logo());
  const below = lock === "below" ? hasBrand() : lock === "split" && Boolean(brand.name());
  const logoStrip = flat && above ? total * 0.15 : 0;
  const strip = flat && below ? total * 0.15 : 0;
  const topParts = lock === "split" ? "logo" : "both";
  const bottomParts = lock === "split" ? "name" : "both";
  const onAccent = light(accent) ? "#1D1A16" : bg;
  const name = brand.name();
  // Every download carries a credit line. Light, small, and clear of the code.
  const foot = total * 0.085;

  if (f.round) {
    /* A QR code is a square grid and cannot be anything else, so a round one is
     * built the way the round codes in the wild are: the code sits in the
     * middle and the space out to the circle's edge is packed with loose
     * modules on the same grid. They carry no data. Nothing is cropped. */
    const cnt = currentModules.count;
    const codeR = cnt * 0.708 + 3; // a few modules past the matrix corners
    const labelled = kind === "ring";
    /* On a round shape the brand lives on the ring, so a position is an angle:
     * the name runs along the top or the bottom arc, and the logo is a badge
     * anywhere on the circle. The label is arc text too, and there are only two
     * arcs, so it takes whichever one the name did not: putting the name along
     * the bottom moves "SCAN ME" to the top rather than stacking the two. */
    const nameTop = brand.namePlace() === "top";
    const badgeAt = brand.logoPlace();
    const labelTop = Boolean(name) && !nameTop;
    const arcOf = (top) => (top ? "top" : "bottom");
    const wordy = (side) =>
      (Boolean(name) && side === arcOf(nameTop)) || (labelled && side === arcOf(labelTop));
    // A badge landing on an arc that already carries words sinks inside them,
    // which needs a deeper band than a badge sitting on the ring by itself.
    const stacked = Boolean(logo) && (badgeAt === "top" || badgeAt === "bottom") && wordy(badgeAt);
    /* Words and a badge need more room than the loose modules leave, so they go
     * in a band outside the circle: the accent colour carrying a label on
     * "round with label", the plain background on "round", which has no outline
     * at all and so reads as loose as the plain shape does. */
    const band = labelled || hasBrand() ? codeR * (stacked ? 0.44 : 0.32) : 0;
    const R = codeR + band;
    // The plain circle has no card behind it, so a hairline rim is what gives
    // it an edge. The labelled one already has the accent band for that.
    const rim = labelled ? 0 : 1.1;
    W = R * 2 + rim * 2;
    H = W + foot;
    ox = oy = R + rim - total / 2;
    const cx = R + rim, cy = R + rim;

    if (labelled) items.push({ t: "path", d: circlePath(cx, cy, R), fill: accent });
    items.push({ t: "path", d: circlePath(cx, cy, codeR), fill: bg });
    items.push({ t: "path", d: decorPath(ox, oy, cx, cy, codeR, 1), fill: fg });
    if (rim) outlines.push({ t: "path", d: circlePath(cx, cy, R + rim * 0.55), stroke: fg, width: 0.13, opacity: 0.4 });

    const onBand = labelled ? onAccent : fg;
    const mid = codeR + band / 2;
    const arc = (text, r, maxH, top) =>
      items.push({ t: "arctext", top, cx, cy, r, size: fitSize(text, maxH, r * 2.1), text, fill: onBand });
    /** A round badge sunk into the band at `angle`, the way a profile picture
     *  sits on a scan code. Its backing keeps it clear of anything it overlaps. */
    const badge = (r, lr, angle) => {
      const bx = cx + r * Math.cos(angle), by = cy + r * Math.sin(angle);
      items.push({ t: "path", d: circlePath(bx, by, lr * 1.24), fill: labelled ? accent : bg });
      items.push({ t: "image", x: bx - lr, y: by - lr, w: lr * 2, h: lr * 2, img: logo.img, src: logo.src, radius: lr });
    };
    /* Arc text keeps the same height whether or not the band was deepened to
     * take a badge, so putting the logo on one arc does not resize the words on
     * the other. An arc sharing its side with a badge gives up the inner part of
     * the band and moves out to the rim. */
    const line = codeR * 0.176;
    const shared = (side) => stacked && badgeAt === side;
    const arcR = (side) => (shared(side) ? codeR + band * 0.74 : mid);
    const arcH = (side) => (shared(side) ? line * 0.85 : line);

    if (labelled) {
      const side = arcOf(labelTop);
      arc((els.label.value || "SCAN ME").toUpperCase(), arcR(side), arcH(side), labelTop);
    }
    if (name) {
      const side = arcOf(nameTop);
      arc(name, arcR(side), arcH(side), nameTop);
    }
    if (logo) badge(stacked ? codeR + band * 0.28 : mid, band * (stacked ? 0.2 : 0.34), BADGE_ANGLE[badgeAt]);
  } else {
    const bar = kind === "badge" ? total * 0.18 : 0;
    // The code's own clear margin is not breathing room: without a gap the
    // label bar reads as if it is jammed against the bottom of the code.
    const gap = bar ? total * 0.07 : 0;
    const r = kind === "panel" ? 0 : total * 0.08;
    W = total + f.pad * 2;
    const card = W + logoStrip + strip + gap + bar; // everything above the credit line
    H = card + foot;
    ox = f.pad;
    oy = f.pad + logoStrip; // the code starts below the mark
    const box = [STROKE, STROKE, W - STROKE * 2, card - STROKE * 2];
    if (f.pad) {
      items.push({ t: "path", d: rectPath(...box, [r, r, r, r]), fill: bg });
      outlines.push({ t: "path", d: rectPath(...box, [r, r, r, r]), stroke: fg });
    } else {
      items.push({ t: "path", d: rectPath(0, 0, W, card), fill: bg });
    }
    if (bar) {
      const br = Math.max(0, r - STROKE);
      items.push({ t: "path", d: rectPath(STROKE, card - bar - STROKE, W - STROKE * 2, bar, [0, 0, br, br]), fill: accent });
      const label = (els.label.value || "SCAN ME").toUpperCase();
      const size = fitSize(label, bar * 0.56, W - total * 0.14);
      items.push({ t: "text", x: W / 2, y: card - bar / 2 - STROKE / 2, size, fit: textWidth(label, size), text: label, fill: onAccent });
    }
    /* Both strips are aligned the same way. Which control drives which depends
     * on the lockup: "split" puts the logo in the top strip and the name in the
     * bottom one, so each takes its own position, while the other two lockups
     * are a single row of both and take the one position between them. */
    const strips = W * 0.82;
    const alignX = (grp, a) =>
      a === "left" ? W / 2 - strips / 2 + grp.w / 2 : a === "right" ? W / 2 + strips / 2 - grp.w / 2 : W / 2;
    // The mark, in the band above the code.
    if (logoStrip) {
      const grp = brandGroup(strips, logoStrip * 0.66, fg, topParts);
      items.push(...shift(grp, alignX(grp, lock === "split" ? brand.logoPlace() : brand.namePlace()), f.pad + logoStrip / 2));
    }
    // The name sits high in the room below the code rather than centred in it.
    // The code already carries four blank modules of quiet zone along its
    // bottom edge, so centring in what is left counts that emptiness twice and
    // leaves the name looking adrift. Nothing moves into the quiet zone, which
    // must stay clear; the name just stops floating below it.
    if (strip) {
      const top = oy + total, bottom = card - bar - STROKE;
      // Aligned inside the same 82% band the group is measured against, so
      // "left" lands on the code's left edge rather than the card's.
      const grp = brandGroup(strips, strip * 0.66, fg, bottomParts);
      items.push(...shift(grp, alignX(grp, brand.namePlace()), top + (bottom - top) * 0.34));
    }
  }

  items.push({ t: "path", d: bodyPath(ox, oy), fill: fg, rule: "evenodd" });
  items.push({ t: "path", d: eyePath(ox, oy), fill: brand.eye(), rule: "evenodd" });

  // The NoByte mark always sits in the middle, on a knocked-out patch with the
  // same rounded corners as the icon itself. Error correction is fixed at H so
  // the modules it covers can be reconstructed.
  if (brandImg) {
    const box = total * 0.17;
    const pad = total * 0.028;
    const cx = ox + total / 2, cy = oy + total / 2;
    const plate = box + pad * 2;
    items.push({ t: "path", d: rectPath(cx - plate / 2, cy - plate / 2, plate, plate, Array(4).fill(plate * 0.3)), fill: bg });
    items.push({ t: "image", x: cx - box / 2, y: cy - box / 2, w: box, h: box, img: brandImg.img, src: brandImg.src, radius: box * 0.24 });
  }

  // The credit line. Quiet enough to stay out of the way of whoever's code this
  // is, plain enough to read at a glance, and always outside the code itself.
  const credit = "Generated using nobyte.in";
  // Set in the text face at its lightest, not the display face: Outfit ships
  // only 500 and 700, so anything thinner asked of it is synthesised and comes
  // back looking smeared rather than light.
  const size = fitSize(credit, foot * 0.34, W * 0.6);
  // No textLength here: it is measured off the Outfit gauge, and pinning Inter
  // to a width taken from another face stretches the glyphs to reach it.
  items.push({ t: "text", x: W / 2, y: H - foot * 0.42, size, text: credit, fill: fg, opacity: 0.28, weight: 400, font: "Inter, system-ui, sans-serif" });

  /* Breathing room around the whole drawing. Without it the card's edge is the
   * edge of the file, so the download sits flush against whatever it is placed
   * on and reads as though it were cropped. Returned separately rather than
   * folded into the geometry, because every path here is already a built
   * string: the renderers offset by it instead. */
  const margin = W * 0.05;
  return { W, H, margin, items: items.concat(outlines) };
}

/* ---------- renderers ---------- */
function paint(target, cell) {
  const s = scene();
  target.width = Math.round((s.W + s.margin * 2) * cell);
  target.height = Math.round((s.H + s.margin * 2) * cell);
  const g = target.getContext("2d");
  g.clearRect(0, 0, target.width, target.height);
  g.imageSmoothingEnabled = true;
  // Everything below is drawn in scene coordinates, so the margin is applied
  // once here rather than added to each item.
  g.translate(s.margin * cell, s.margin * cell);
  g.imageSmoothingQuality = "high";
  for (const it of s.items) {
    if (it.t === "path") {
      g.save();
      g.scale(cell, cell);
      const p = new Path2D(it.d);
      if (it.fill) { g.fillStyle = it.fill; g.fill(p, it.rule || "nonzero"); }
      if (it.stroke) {
        g.lineWidth = it.width ?? STROKE * 2;
        g.strokeStyle = it.stroke;
        g.globalAlpha = it.opacity ?? 1;
        g.stroke(p);
      }
      g.restore();
    } else if (it.t === "image") {
      g.save();
      if (it.radius) {
        g.beginPath();
        g.roundRect
          ? g.roundRect(it.x * cell, it.y * cell, it.w * cell, it.h * cell, it.radius * cell)
          : g.rect(it.x * cell, it.y * cell, it.w * cell, it.h * cell);
        g.clip();
      }
      g.drawImage(it.img, it.x * cell, it.y * cell, it.w * cell, it.h * cell);
      g.restore();
    } else if (it.t === "text") {
      g.save();
      g.fillStyle = it.fill;
      g.globalAlpha = it.opacity ?? 1;
      g.font = `${it.weight || 700} ${it.size * cell}px ${it.font || "Outfit, system-ui, sans-serif"}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(it.text, it.x * cell, it.y * cell);
      g.restore();
    } else if (it.t === "arctext") {
      arcText(g, it, cell);
    }
  }
  return target.width;
}

/** Text bent around a round frame, reading left to right. Along the bottom the
 *  glyphs stand on the arc; along the top they hang from it, each rotated so
 *  its own up points away from the centre. */
function arcText(g, it, cell) {
  g.save();
  g.fillStyle = it.fill;
  g.font = `700 ${it.size * cell}px Outfit, system-ui, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const r = it.r * cell, cx = it.cx * cell, cy = it.cy * cell;
  const widths = [...it.text].map((ch) => g.measureText(ch).width);
  const span = widths.reduce((a, w) => a + w, 0) / r;
  const dir = it.top ? 1 : -1; // top runs with the angle, bottom against it
  let angle = (it.top ? -Math.PI / 2 : Math.PI / 2) - (dir * span) / 2;
  for (let i = 0; i < it.text.length; i++) {
    const step = (widths[i] / r) * dir;
    angle += step / 2;
    g.save();
    g.translate(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    g.rotate(angle + (it.top ? Math.PI / 2 : -Math.PI / 2));
    g.fillText(it.text[i], 0, 0);
    g.restore();
    angle += step / 2;
  }
  g.restore();
}

const xmlEsc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function toSvg() {
  if (!currentModules) return "";
  const s = scene();
  const crisp = brand.style() === "square" && brand.eyeStyle() === "square" && brand.frame() === "none";
  let body = "", defs = "", ring = 0, clip = 0;
  for (const it of s.items) {
    if (it.t === "path") {
      const stroke = it.stroke
        ? ` stroke="${it.stroke}" stroke-width="${n(it.width ?? STROKE * 2)}"${it.opacity != null ? ` stroke-opacity="${it.opacity}"` : ""}`
        : "";
      body += `<path d="${it.d}" fill="${it.fill || "none"}" fill-rule="${it.rule || "nonzero"}"${stroke}/>`;
    } else if (it.t === "image") {
      let attr = "";
      if (it.radius) {
        const id = `c${clip++}`;
        defs += `<clipPath id="${id}"><path d="${rectPath(it.x, it.y, it.w, it.h, Array(4).fill(it.radius))}"/></clipPath>`;
        attr = ` clip-path="url(#${id})"`;
      }
      body += `<image href="${it.src}" x="${n(it.x)}" y="${n(it.y)}" width="${n(it.w)}" height="${n(it.h)}"${attr}/>`;
    } else if (it.t === "text") {
      // textLength pins the label to the width it was measured at, so a viewer
      // without Outfit installed still gets it inside its patch.
      const fit = it.fit ? ` textLength="${n(it.fit)}" lengthAdjust="spacingAndGlyphs"` : "";
      const op = it.opacity != null ? ` fill-opacity="${it.opacity}"` : "";
      body += `<text x="${n(it.x)}" y="${n(it.y)}" font-family="${it.font || "Outfit, system-ui, sans-serif"}" font-weight="${it.weight || 700}" font-size="${n(it.size)}" fill="${it.fill}"${op} text-anchor="middle" dominant-baseline="central"${fit}>${xmlEsc(it.text)}</text>`;
    } else if (it.t === "arctext") {
      const id = `ring${ring++}`;
      // sweep 0 runs left to right under the circle, sweep 1 over the top
      defs += `<path id="${id}" fill="none" d="M${n(it.cx - it.r)} ${n(it.cy)}A${n(it.r)} ${n(it.r)} 0 0 ${it.top ? 1 : 0} ${n(it.cx + it.r)} ${n(it.cy)}"/>`;
      body += `<text font-family="Outfit, system-ui, sans-serif" font-weight="700" font-size="${n(it.size)}" fill="${it.fill}" letter-spacing="${n(it.size * 0.06)}"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${xmlEsc(it.text)}</textPath></text>`;
    }
  }
  // The viewBox grows by the margin on all four sides and the drawing is
  // shifted into it, so the vector file carries the same breathing room as the
  // raster one instead of ending at the card's edge.
  const m = s.margin;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${n(s.W + m * 2)} ${n(s.H + m * 2)}"${crisp ? ' shape-rendering="crispEdges"' : ""}>${defs ? `<defs>${defs}</defs>` : ""}<g transform="translate(${n(m)} ${n(m)})">${body}</g></svg>`;
}

/* ---------- build ---------- */
function build() {
  syncControls();
  const data = payload();
  if (!data) {
    errorEl.textContent = activeType === "wifi" ? "Enter a network name." : "Enter text or a URL.";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    currentModules = null;
    return;
  }
  errorEl.textContent = "";
  // The mark in the middle covers modules, and error correction is what buys
  // them back, so the level is not a choice: H, dropping to Q only when the
  // content is too long to fit at H (Q still reconstructs a quarter of a code).
  for (const level of ["H", "Q"]) {
    try {
      const qr = qrcode(0, level); // 0 = auto version
      qr.addData(data);
      qr.make();
      const count = qr.getModuleCount();
      // Materialised up front: the rounded style looks at each module's four
      // neighbours, and calling into the library for every lookup is slow.
      const dark = Array.from({ length: count }, (_, r) =>
        Array.from({ length: count }, (_, c) => qr.isDark(r, c))
      );
      currentModules = { count, dark };
      draw();
      return;
    } catch (e) { /* try the next level down */ }
  }
  errorEl.textContent = "That content is too long for a QR code. Shorten it.";
  currentModules = null;
}

/** Fill the panel it sits in, and paint in whole device pixels per module.
 *  A canvas sized in CSS pixels is half resolution on a phone or a retina
 *  screen, which is what makes a preview look soft: this one is sized in the
 *  screen's real pixels, and each module gets a whole number of them, so no
 *  edge lands mid-pixel and nothing is resampled on the way to the screen. */
function fitPreview(s) {
  const panel = document.getElementById("qr-panel");
  const px = (el, side) => parseFloat(getComputedStyle(el)[side]) || 0;
  const room = panel.clientWidth - px(panel, "paddingLeft") - px(panel, "paddingRight") - px(wrap, "paddingLeft") - px(wrap, "paddingRight");
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const wide = Math.max(200, Math.min(560, room));
  // Fit width and height separately rather than by the larger side, so a tall
  // shape like the labelled card still uses the full width of the panel.
  const tall = Math.max(240, Math.min(620, window.innerHeight - 260));
  const cell = Math.max(1, Math.floor(Math.min(wide / s.W, tall / s.H) * dpr));
  return { cell, dpr };
}

function draw() {
  if (!currentModules) return;
  const s = scene();
  const { cell, dpr } = fitPreview(s);
  paint(canvas, cell);
  canvas.style.width = `${(s.W * cell) / dpr}px`;
  canvas.style.height = `${(s.H * cell) / dpr}px`;
  wrap.style.background = els.bg.value;
  checkColors();
}

let resizeTimer;
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => currentModules && draw(), 120);
});

/* Placement means two different things, because the two families of shape hold
 * the brand in two different coordinate systems. On the flat shapes it sits in
 * horizontal strips above and below the code, so a position is an x offset and
 * left/centre/right is the whole of it. On the round ones it sits on the ring,
 * as arc text and a badge, so a position is an angle: top and bottom are the
 * two arcs, and "left" is not something the geometry can honour. Rather than
 * leave a select offering both vocabularies and quietly ignoring half of them,
 * each shape is handed the options it can actually draw. */
const PLACEMENT = {
  flat: {
    logo: [["center", "Centre"], ["left", "Left"], ["right", "Right"]],
    name: [["center", "Centre"], ["left", "Left"], ["right", "Right"]],
  },
  round: {
    logo: [["top", "Top"], ["bottom", "Bottom"], ["left", "Left"], ["right", "Right"]],
    name: [["top", "Top arc"], ["bottom", "Bottom arc"]],
  },
};

/* Every shape remembers its own placement, so flipping between two of them to
 * compare does not overwrite what was set on the last one. Seeded with the
 * arrangement each reads best in: on the ring the bottom arc is where a label
 * belongs, so a name there goes along the top and pushes the label down. */
const placement = {
  none:    { logo: "center", name: "center" },
  panel:   { logo: "center", name: "center" },
  rounded: { logo: "center", name: "center" },
  badge:   { logo: "center", name: "center" },
  round:   { logo: "top", name: "bottom" },
  ring:    { logo: "top", name: "top" },
};

function options(select, list, value) {
  select.replaceChildren(...list.map(([v, text]) => new Option(text, v)));
  select.value = value;
}

let held = els.frame.value; // the shape whose placement the two selects hold

/** Repopulate the placement selects for the shape in use, carrying each shape's
 *  own choice in and out, and label them in that shape's terms. */
function syncShapeControls() {
  const kind = els.frame.value;
  const round = Boolean((FRAMES[kind] || FRAMES.none).round);
  const mine = placement[kind] || placement.none;
  const was = placement[held];
  if (was) { was.logo = els.logoAlign.value; was.name = els.nameAlign.value; }
  if (kind !== held) {
    const set = PLACEMENT[round ? "round" : "flat"];
    options(els.logoAlign, set.logo, mine.logo);
    options(els.nameAlign, set.name, mine.name);
    held = kind;
  }
  // "Split" is the only flat lockup that keeps the logo and the name in strips
  // of their own; the other two are one row of both, positioned together.
  const split = els.lockup.value === "split";
  fieldLockup.hidden = round;
  fieldLogoAlign.hidden = !userImg || (!round && !split);
  fieldLogoAlign.querySelector("label").textContent = round ? "Logo badge at" : "Logo position";
  fieldNameAlign.querySelector("label").textContent =
    round ? "Name on" : !split && userImg ? "Brand position" : "Name position";
}

/** Show only the controls that apply to the shape in use, and keep the logo
 *  thumbnail cut to the same shape the logo will take in the code. */
function syncControls() {
  const f = FRAMES[els.frame.value] || FRAMES.none;
  fieldLabel.hidden = !f.label;
  fieldAccent.hidden = !f.label;
  logoClear.hidden = !userImg;
  logoThumb.hidden = !userImg;
  if (userImg) {
    logoThumb.style.backgroundImage = `url("${userImg.src}")`;
    logoThumb.style.borderRadius = `${(LOGO_CUT[els.frame.value] ?? 0) * 100}%`;
  }
  syncShapeControls();
}


/* A phone camera is far stricter than a decoding library: it expects a dark
 * code on a light background with enough contrast to threshold cleanly.
 * Light-on-dark still looks like a QR code and still decodes in software,
 * which is why it is worth saying so here. */
function checkColors() {
  const bg = luminance(brand.bg());
  const fg = luminance(brand.fg());
  const eye = luminance(brand.eye());
  const inverted = "lighter than the background. Most phone cameras only scan a dark code on a light background, so swap the colours.";
  const faint = "Phone cameras may fail to read it: pick a darker colour, or a lighter background.";
  let msg = "";
  if (fg > bg) msg = `The code is ${inverted}`;
  else if (contrast(fg, bg) < 4.5) msg = `Not much contrast between the code and its background. ${faint}`;
  else if (eye > bg) msg = `The corner squares are ${inverted}`;
  else if (contrast(eye, bg) < 4.5) msg = `Not much contrast between the corner squares and the background. ${faint}`;
  warnText.textContent = msg;
  warnEl.hidden = !msg;
}

/* ---------- the centre mark ---------- */
// Redrawn from a data URI rather than a URL: an <image href> pointing at this
// site would leave the exported SVG broken everywhere else.
async function loadBrandMark() {
  try {
    // Rasterised from the vector favicon at 512px, not from the 180px app icon:
    // the mark is redrawn at whatever size the export needs, and a 180px source
    // is already soft in a 1024px PNG.
    const text = await fetch("/assets/favicon.svg").then((r) => r.text());
    // An SVG with only a viewBox has no intrinsic size to draw from, so give
    // this copy one before handing it to the image decoder.
    const sized = text.replace(/<svg\b/, '<svg width="512" height="512"');
    const vector = new Image();
    vector.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(sized);
    await vector.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(vector, 0, 0, 512, 512);
    const src = c.toDataURL("image/png");
    const img = new Image();
    img.src = src;
    await img.decode();
    brandImg = { img, src };
    draw();
  } catch {}
}

/** An uploaded logo is redrawn at 256px before it is kept: a 4MB photo would
 *  otherwise ride inside every exported SVG. */
function takeLogo(file) {
  if (!file) return;
  if (!/^image\//.test(file.type)) return toast("Choose an image file.", "error");
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 256;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const src = c.toDataURL("image/png");
      const out = new Image();
      out.onload = () => { userImg = { img: out, src }; build(); };
      out.src = src;
      logoName.textContent = file.name;
    };
    img.onerror = () => toast("Could not read that image.", "error");
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

/* ---------- wiring ---------- */
Object.values(els).forEach((el) => {
  el.addEventListener("input", build);
  el.addEventListener("change", build); // selects in Safari
});
const readout = (input, out) => {
  const el = document.getElementById(out);
  const show = () => { el.textContent = `${input.value}%`; };
  input.addEventListener("input", show);
  show();
};
readout(els.logoSize, "qr-logo-size-val");
readout(els.nameSize, "qr-name-size-val");
logoInput.addEventListener("change", () => takeLogo(logoInput.files[0]));
logoClear.addEventListener("click", () => {
  userImg = null;
  logoInput.value = "";
  logoName.textContent = "";
  build();
});

document.querySelectorAll('[role="tab"]').forEach((tab) => {
  tab.addEventListener("click", () => {
    activeType = tab.id === "qt-wifi" ? "wifi" : "text";
    build();
  });
});

/* Branding is an add-on to the content, not a content type of its own, so it
 * lives beneath the tabs behind a switch. Flipping it on reveals the controls
 * and lets their values through; off hides them and the code goes plain. */
const brandToggle = document.getElementById("qr-brand-toggle");
const brandBody = document.getElementById("qr-brand-body");
brandToggle.addEventListener("click", () => {
  brand.on = !brand.on;
  brandToggle.setAttribute("aria-checked", String(brand.on));
  brandBody.hidden = !brand.on;
  build();
});

// A whole number of pixels per module keeps every edge crisp, so the file is
// painted fresh at a high resolution rather than scaled up from the preview.
const PNG_LONGEST = 4096;      // aim for a ~4K longest side: sharp even in print
const PNG_AREA_CAP = 16_000_000; // mobile Safari drops a canvas past ~16.7M px
document.getElementById("qr-png").addEventListener("click", () => {
  if (!currentModules) return toast("Nothing to download yet.", "error");
  const s = scene();
  // Take the largest whole pixels-per-module that hits the target long side
  // without blowing the area budget, so the export is as HD as every browser
  // (phones included) can actually produce.
  const byLong = PNG_LONGEST / Math.max(s.W, s.H);
  const byArea = Math.sqrt(PNG_AREA_CAP / (s.W * s.H));
  const cell = Math.max(8, Math.floor(Math.min(byLong, byArea)));
  const out = document.createElement("canvas");
  paint(out, cell);
  out.toBlob((blob) => download("qr-code.png", blob, "image/png"), "image/png");
});
document.getElementById("qr-svg").addEventListener("click", () => {
  const svg = toSvg();
  if (!svg) return toast("Nothing to download yet.", "error");
  download("qr-code.svg", svg, "image/svg+xml");
});

loadBrandMark();
build();
