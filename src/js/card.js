// The tool tile, client side. Mirrors toolCard()/popMeter()/spanFor() in
// build.mjs so a card rendered by the search or the favourites shelf is the
// same markup the build prints. Change one, change the other.
let toolsCache = null;

export async function loadTools() {
  if (!toolsCache) toolsCache = fetch("/data/tools.json").then((r) => r.json());
  return toolsCache;
}

export const escapeHtml = (s = "") => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#${name}"></use></svg>`;

function popMeter(p = 0) {
  const segs = Array.from({ length: 5 }, (_, i) => `<i${i < p ? ' class="on"' : ""}></i>`).join("");
  return `<span class="tool-card__pop" role="img" aria-label="Popularity ${p} of 5" title="Popularity: ${p} of 5">${segs}</span>`;
}

// The card is a div, not a link: it carries a star button, and a button cannot
// sit inside an anchor. The title link stretches over the whole tile instead.
export function cardHTML(t) {
  const pop = t.popularity || 0;
  const badge = t.featured ? `<span class="tool-card__badge">Popular</span>` : "";
  const tag = t.gameType ? `<span class="tool-card__tag">${escapeHtml(t.gameType)}</span>` : "";
  const tags = tag || badge ? `<span class="tool-card__tags">${tag}${badge}</span>` : "";
  return `<div class="tool-card is-in" data-cat="${t.category}" data-id="${t.id}" data-pop="${pop}" data-name="${escapeHtml(t.name)}" data-reveal>
    <span class="tool-card__icon">${icon(t.icon)}</span>${tags}
    <a class="tool-card__title" href="${t.path}">${escapeHtml(t.name)}</a>
    <span class="tool-card__desc">${escapeHtml(t.description)}</span>
    <span class="tool-card__foot">
      <span class="tool-card__go">Open ${icon("arrow-right")}</span>
      <span class="tool-card__meta">${popMeter(pop)}<button type="button" class="fav-btn fav-btn--card" data-fav="${t.id}" data-fav-name="${escapeHtml(t.name)}" aria-pressed="false" aria-label="Add ${escapeHtml(t.name)} to favourites">${icon("star")}</button></span>
    </span>
  </div>`;
}

/* Pinboard rhythm — rows of three spans that always sum to 12; a partial last
   row widens to fill. Re-applied to the VISIBLE cards whenever a grid is
   filtered or re-rendered. */
export function applySpans(cards) {
  const total = cards.length, leftover = total % 3, full = total - leftover;
  const spans = new Array(total).fill(4);
  // Each row is the previous row rotated by 1 or 2 places (seeded PRNG), so every
  // column changes width from the row above and nothing stacks into a column.
  // Fixed seed keeps it stable and identical to spansFor() in build.mjs, so there
  // is no re-layout flash. Keep the two in step.
  let seed = 1;
  const rand = () => (seed = (seed * 48271) % 0x7fffffff) / 0x7fffffff;
  let row = [5, 4, 3];
  for (let r = 0; r < full; r += 3) {
    const shift = 1 + Math.floor(rand() * 2);
    row = row.slice(shift).concat(row.slice(0, shift));
    row.forEach((s, k) => (spans[r + k] = s));
  }
  if (leftover === 1) spans[total - 1] = 12;
  else if (leftover === 2) spans[total - 2] = spans[total - 1] = 6;
  cards.forEach((el, i) => {
    el.classList.remove("span-3", "span-4", "span-5", "span-6", "span-12");
    if (spans[i] !== 4) el.classList.add(`span-${spans[i]}`);
  });
}
