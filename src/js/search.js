// Client-side tool search. Powers the /tools/ page filter (?q=) and live filtering.
// The header form submits to /tools/?q=… (progressive enhancement: works without JS).
import { loadTools, cardHTML, applySpans, escapeHtml } from "/js/card.js";

function matches(tool, q) {
  const hay = (tool.name + " " + tool.description + " " + (tool.keywords || []).join(" ")).toLowerCase();
  return hay.includes(q);
}

// Sort comparators shared by both pages. "popular" keeps the curated order
// (tools.json is already popularity-sorted), so it is applied as a no-op there.
const byName = (a, b) => a.name.localeCompare(b.name);

async function initToolsPage() {
  const grid = document.querySelector("[data-search-results]");
  if (!grid) return;
  const tools = await loadTools();
  const input = document.querySelector("[data-search-page-input]");
  const countEl = document.querySelector("[data-search-count]");
  const sortEl = document.querySelector("[data-sort]");
  const params = new URLSearchParams(location.search);
  let rendered = false;

  const render = () => {
    const query = (input ? input.value : "").trim().toLowerCase();
    let list = query ? tools.filter((t) => matches(t, query)) : tools.slice();
    if (sortEl && sortEl.value === "name") list = list.sort(byName);
    // Filtering is keyboard-driven, so results must appear instantly.
    // Mark the grid static after the first render to switch the stagger off.
    grid.innerHTML = list.length ? list.map(cardHTML).join("") : `<p class="muted">No tools match "${escapeHtml(query)}".</p>`;
    applySpans([...grid.querySelectorAll(".tool-card")]);
    if (rendered) grid.setAttribute("data-static", "");
    rendered = true;
    // favourites.js paints the stars on whatever is in the DOM at load; these
    // cards are new, so tell it to paint them too.
    document.dispatchEvent(new CustomEvent("cards:rendered", { detail: { scope: grid } }));
    if (countEl) countEl.textContent = `${list.length} ${list.length === 1 ? "tool" : "tools"}`;
  };

  const initialQ = params.get("q") || "";
  if (input) {
    input.value = initialQ;
    input.addEventListener("input", render);
  }
  if (sortEl) sortEl.addEventListener("change", render);
  render();
}

/* ---------- home page category filter ----------
   The chips are plain links to /category/x/ (works without JS).
   With JS, clicking one filters the grid in place instead. */
function initHomeFilter() {
  const bar = document.querySelector("[data-cat-filter]");
  const grid = document.querySelector("[data-filter-grid]");
  if (!bar || !grid) return;

  const chips = [...bar.querySelectorAll(".cat-chip")];
  const featured = document.querySelector("[data-featured-block]");
  const heading = document.querySelector("[data-filter-heading]");
  const countEl = document.querySelector("[data-filter-count]");
  const sortEl = document.querySelector("[data-sort]");
  const favHint = document.querySelector("[data-fav-hint]");
  const defaultHeading = heading ? heading.textContent : "";
  // chip label text (first text node), used for the section heading
  const nameOf = (chip) => (chip.childNodes[0]?.textContent || "").trim();

  // Original (curated popularity) DOM order, so "Most popular" can restore it.
  const originalOrder = [...grid.querySelectorAll(".tool-card")];
  let currentCat = "all";

  const sortGrid = () => {
    const cards = [...grid.querySelectorAll(".tool-card")];
    const ordered = sortEl && sortEl.value === "name"
      ? cards.sort((a, b) => a.dataset.name.localeCompare(b.dataset.name))
      : originalOrder;
    ordered.forEach((c) => grid.appendChild(c)); // reappend in the chosen order
  };

  const apply = (cat) => {
    currentCat = cat;
    chips.forEach((chip) => {
      const on = (chip.dataset.cat || "all") === cat;
      chip.classList.toggle("is-active", on);
      chip.setAttribute("aria-pressed", String(on));
    });

    const all = cat === "all";
    // Favourites is a chip like any other, but the list it filters by lives in
    // localStorage; favourites.js marks each starred card with data-fav-on.
    const fav = cat === "favourites";
    if (featured) featured.hidden = !all;

    let shown = 0;
    const visible = [];
    grid.querySelectorAll(".tool-card").forEach((card) => {
      const show = all || (fav ? card.hasAttribute("data-fav-on") : card.dataset.cat === cat);
      card.hidden = !show;
      // filtering is a direct action, so results must appear instantly
      if (show) { card.classList.add("is-in"); visible.push(card); shown++; }
    });
    applySpans(visible);

    if (heading) {
      const active = chips.find((c) => (c.dataset.cat || "all") === cat);
      heading.textContent = all ? defaultHeading : fav ? "Your favourites" : `${nameOf(active)} tools`;
    }
    if (countEl) countEl.textContent = all ? "" : `${shown} ${shown === 1 ? "tool" : "tools"}`;
    // The how-to only makes sense on an empty favourites view.
    if (favHint) favHint.hidden = !(fav && shown === 0);
  };

  bar.addEventListener("click", (e) => {
    const chip = e.target.closest(".cat-chip");
    if (!chip || !bar.contains(chip)) return;
    e.preventDefault();
    apply(chip.dataset.cat || "all");
  });

  if (sortEl) sortEl.addEventListener("change", () => { sortGrid(); apply(currentCat); });

  // Starring a tool while the Favourites chip is showing changes what belongs
  // in the grid, so re-run the filter.
  document.addEventListener("favourites:changed", () => {
    if (currentCat === "favourites") apply(currentCat);
  });
}

initToolsPage();
initHomeFilter();
