// Favourites. A list of tool ids in localStorage, nothing else: no account, no
// sync, no request. Every star on the page reads from the same list, the
// Favourites chip counts it, and /favourites/ is rendered from it.
import { loadTools, cardHTML, applySpans } from "/js/card.js";

const KEY = "nobyte_favs";

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

let favs = read();

function write() {
  try { localStorage.setItem(KEY, JSON.stringify(favs)); } catch {}
}

const isFav = (id) => favs.includes(id);

function toggle(id) {
  favs = isFav(id) ? favs.filter((x) => x !== id) : favs.concat(id);
  write();
  sync();
}

/** Repaint everything the list drives, then tell the page it changed (the home
 *  grid re-filters itself if the Favourites chip is the active one). */
function sync() {
  paintStars();
  paintCounts();
  renderPage();
  document.dispatchEvent(new CustomEvent("favourites:changed", { detail: { count: favs.length } }));
}

/* ---------- the star buttons ---------- */
function paintStars(scope = document) {
  scope.querySelectorAll("[data-fav]").forEach((btn) => {
    const on = isFav(btn.dataset.fav);
    const name = btn.dataset.favName || "this tool";
    const label = btn.querySelector("[data-fav-label]");
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", String(on));
    btn.title = on ? "In favourites" : "Add to favourites";
    // A labelled button names itself; a bare star borrows the tool's name.
    if (label) label.textContent = on ? "Favourited" : "Favourite";
    else btn.setAttribute("aria-label", on ? `Remove ${name} from favourites` : `Add ${name} to favourites`);
    // The card carries the state as an attribute so the home-page filter can
    // pick out favourites without knowing anything about this module.
    const card = btn.closest(".tool-card");
    if (card) card.toggleAttribute("data-fav-on", on);
  });
}

function paintCounts() {
  document.querySelectorAll("[data-fav-count]").forEach((el) => (el.textContent = favs.length));
}

// Delegated, so a star on a card rendered later (search results, this page)
// works without rewiring.
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-fav]");
  if (!btn) return;
  e.preventDefault();
  toggle(btn.dataset.fav);
  // The star sits on top of the tile's stretched link; keep it from opening.
  e.stopPropagation();
});

/* ---------- the /favourites/ page ---------- */
const grid = document.querySelector("[data-fav-grid]");
const empty = document.querySelector("[data-fav-empty]");

async function renderPage() {
  if (!grid) return;
  if (empty) empty.hidden = favs.length > 0;
  if (!favs.length) {
    grid.innerHTML = "";
    return;
  }
  const tools = await loadTools();
  // Ids the registry no longer has (a renamed or retired tool) drop out here
  // and are pruned from storage, so the list cannot rot.
  const list = favs.map((id) => tools.find((t) => t.id === id)).filter(Boolean);
  if (list.length !== favs.length) {
    favs = list.map((t) => t.id);
    write();
    paintCounts();
    if (empty) empty.hidden = favs.length > 0;
  }
  grid.innerHTML = list.map(cardHTML).join("");
  applySpans([...grid.querySelectorAll(".tool-card")]);
  paintStars(grid);
}

// Cards rendered after load (the /tools/ search results) announce themselves.
document.addEventListener("cards:rendered", (e) => paintStars(e.detail?.scope || document));

// Another tab changed the list.
addEventListener("storage", (e) => {
  if (e.key && e.key !== KEY) return;
  favs = read();
  sync();
});

sync();
