// Blog index: category chips + text search, filtering the cards in place.
// Progressive enhancement — with JS off, every post is shown and reachable.
function initBlog() {
  const list = document.querySelector("[data-blog-list]");
  if (!list) return;
  const bar = document.querySelector("[data-blog-filter]");
  const search = document.querySelector("[data-blog-search]");
  const empty = document.querySelector("[data-blog-empty]");
  const cards = [...list.querySelectorAll(".post-card")];
  const chips = bar ? [...bar.querySelectorAll(".cat-chip")] : [];
  let cat = "all";

  const apply = () => {
    const q = (search ? search.value : "").trim().toLowerCase();
    let shown = 0;
    for (const card of cards) {
      const inCat = cat === "all" || card.dataset.cats.split(" ").includes(cat);
      const inText = !q || card.dataset.text.includes(q);
      const show = inCat && inText;
      card.hidden = !show;
      if (show) shown++;
    }
    if (empty) empty.hidden = shown > 0;
  };

  bar?.addEventListener("click", (e) => {
    const chip = e.target.closest(".cat-chip");
    if (!chip || !bar.contains(chip)) return;
    cat = chip.dataset.cat || "all";
    for (const c of chips) {
      const on = c === chip;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-pressed", String(on));
    }
    apply();
  });
  search?.addEventListener("input", apply);
  apply();
}

initBlog();
