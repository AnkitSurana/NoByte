/**
 * NoByte build script — zero dependencies.
 *
 * What it does:
 *  - Reads every .html file under src/pages/ as a "page".
 *  - Each page starts with a front-matter comment:
 *      <!-- meta title="..." description="..." path="/tools/x/" [keywords="..."] [og="..."] -->
 *  - Injects the page body into src/layout.html, resolving <!-- include:name --> partials.
 *  - Expands generated placeholders ({{cards:featured}}, {{cards:all}}, {{cards:category:ID}},
 *    {{categories}}, {{year}}) from src/data/tools.json.
 *  - Copies css/, js/, data/, assets/ into dist/ untouched.
 *  - Writes dist/sitemap.xml and public/robots.txt into dist/.
 *
 * Output is plain HTML/CSS/JS. No framework, no client-side router.
 * Run: node build.mjs   |   node build.mjs --watch
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, rmSync, cpSync, existsSync, watch } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");
const SITE_URL = "https://nobyte.in";

const read = (p) => readFileSync(p, "utf8");
const walk = (dir) => {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
};

/* ---------- asset versioning ----------
 * A browser that has already cached /css/main.css will keep using it until its
 * TTL lapses, which is why a redeploy could still look like the old site. Every
 * reference gets ?v=<hash of the file's bytes> instead: change the file and the
 * URL changes with it, so the old copy can never be reused. Unchanged files keep
 * their hash, so they stay cached.
 */
const assetVersions = new Map();          // "/css/main.css" -> "a1b2c3d4"
const shortHash = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 8);

/** Hash files already written under dist/<dir>, keyed by their public URL. */
function hashDistDir(dir) {
  const from = join(DIST, dir);
  if (!existsSync(from)) return;
  for (const file of walk(from)) {
    const url = "/" + relative(DIST, file).split(/[\\/]/).join("/");
    // fonts and vendored libs are immutable by name and never edited here
    if (url.startsWith("/assets/fonts/") || url.startsWith("/assets/vendor/")) continue;
    assetVersions.set(url, shortHash(readFileSync(file)));
  }
}

/** Stamp ?v=<hash> onto every local css/js/icon/image reference in a built file.
 *  Fonts and vendored libs are absent from assetVersions, so they fall through
 *  untouched — they are already immutable by filename. */
const VERSIONED_EXT = "css|js|mjs|svg|png|jpg|jpeg|webp|ico";
function versionAssets(html) {
  return html.replace(
    new RegExp(
      `(["'(])(/(?:css|js|assets)/[A-Za-z0-9._\\-/]+?\\.(?:${VERSIONED_EXT}))(\\?[^"'#)]*)?(#[^"')]*)?(["')])`,
      "g"
    ),
    (m, open, path, _query, frag = "", close) => {
      const v = assetVersions.get(path);
      return v ? `${open}${path}?v=${v}${frag}${close}` : m;
    }
  );
}

/* ---------- data ---------- */
function loadData() {
  const tools = JSON.parse(read(join(SRC, "data/tools.json")));
  const categories = JSON.parse(read(join(SRC, "data/categories.json")));
  const blogPath = join(SRC, "data/blog.json");
  const blog = existsSync(blogPath) ? JSON.parse(read(blogPath)) : [];
  return { tools, categories, blog };
}

function icon(name, cls = "icon") {
  return `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="/assets/icons.svg#${name}"></use></svg>`;
}

// showTag is off inside category groups, where the heading already says it.
// data-cat drives the tile colour, so colour carries meaning
// Popularity meter: 5 segments, first `p` filled. Curated demand estimate,
// labelled so it never reads as a user-review star rating.
function popMeter(p = 0) {
  const segs = Array.from({ length: 5 }, (_, i) => `<i${i < p ? ' class="on"' : ""}></i>`).join("");
  return `<span class="tool-card__pop" role="img" aria-label="Popularity ${p} of 5" title="Popularity: ${p} of 5">${segs}</span>`;
}

/** Star toggle. A button cannot live inside a link, which is why the card is a
 *  div with a stretched title link (see .tool-card__title::after in main.css).
 *  Favourites are stored in localStorage, so the pressed state is painted by
 *  favourites.js on load rather than baked in here. */
function favButton(t, cls = "fav-btn", label = "") {
  // A labelled button is named by its own text; a bare star needs the tool name
  // spelled out for a screen reader.
  const name = label ? "" : ` aria-label="Add ${esc(t.name)} to favourites"`;
  const text = label ? `<span data-fav-label>${label}</span>` : "";
  return `<button type="button" class="${cls}" data-fav="${t.id}" data-fav-name="${esc(t.name)}" aria-pressed="false"${name}>${icon("star")}${text}</button>`;
}

function toolCard(t, span) {
  const pop = t.popularity || 0;
  const badge = t.featured ? `<span class="tool-card__badge">Popular</span>` : "";
  const tag = t.gameType ? `<span class="tool-card__tag">${esc(t.gameType)}</span>` : "";
  const tags = tag || badge ? `<span class="tool-card__tags">${tag}${badge}</span>` : "";
  return `<div class="tool-card${span ? ` span-${span}` : ""}" data-cat="${t.category}" data-id="${t.id}" data-pop="${pop}" data-name="${esc(t.name)}" data-reveal>
      <span class="tool-card__icon">${icon(t.icon)}</span>${tags}
      <a class="tool-card__title" href="${t.path}">${esc(t.name)}</a>
      <span class="tool-card__desc">${esc(t.description)}</span>
      <span class="tool-card__foot">
        <span class="tool-card__go">Open ${icon("arrow-right")}</span>
        <span class="tool-card__meta">${popMeter(pop)}${favButton(t, "fav-btn fav-btn--card")}</span>
      </span>
    </div>`;
}

// Pinboard rhythm: rows of three spans that always sum to 12.
// A partial last row widens to fill (1 leftover -> 12, 2 -> 6+6).
const SPAN_PATTERN = [5, 3, 4, 4, 5, 3];
function spanFor(i, total) {
  const leftover = total % 3;
  if (leftover === 1 && i === total - 1) return 12;
  if (leftover === 2 && i >= total - 2) return 6;
  return SPAN_PATTERN[i % SPAN_PATTERN.length];
}
function cardGrid(list) {
  return list.map((t, i) => toolCard(t, spanFor(i, list.length))).join("\n");
}

function catChips(categories, tools) {
  const cats = categories.map((c) => {
    const n = tools.filter((t) => t.category === c.id).length;
    return `<a class="cat-chip" data-cat="${c.id}" aria-pressed="false" href="/category/${c.id}/">${esc(c.name)}<span class="cat-chip__n">${n}</span></a>`;
  });
  // Favourites sits with the categories but is a personal list, not a category:
  // its count is filled in by favourites.js from localStorage. It stays a real
  // link to /favourites/, so it still goes somewhere without JS.
  const fav = `<a class="cat-chip" data-cat="favourites" aria-pressed="false" href="/favourites/">Favourites<span class="cat-chip__n" data-fav-count>0</span></a>`;
  return [fav, ...cats].join("\n");
}

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function toolHero(id, tools, categories) {
  const t = tools.find((x) => x.id === id);
  if (!t) throw new Error(`tool-hero: unknown tool "${id}"`);
  const cat = categories.find((c) => c.id === t.category);
  const crumb = cat ? `<a href="/category/${cat.id}/">${esc(cat.name)}</a> / ` : "";
  // data-cat lets CSS treat a game page differently from a tool page: a game
  // needs its board and controls on one phone screen, so its header gets
  // compressed on small viewports in a way a form-based tool does not need.
  return `<div class="container">
  <header class="tool-head" data-cat="${t.category}">
    <nav class="crumbs"><a href="/">Home</a> / ${crumb}<span>${esc(t.name)}</span></nav>
    <div class="tool-head__row">
      <h1>${esc(t.name)}</h1>
      ${favButton(t, "fav-btn fav-btn--head", "Favourite")}
    </div>
    <p class="tool-head__lede">${esc(t.description)}</p>
  </header>
</div>`;
}

/* ---------- blog ----------
 * Posts live in data/blog.json. A post carries one or more categories; the
 * tool categories reuse the site's tile colours (so a developer post gets the
 * developer blue), and "privacy" and "guide" are editorial tags. The index
 * (cards + colour-coded filter chips + search) and every post's date/tag line
 * are generated from the same registry, so they never drift apart. */
const BLOG_CAT_LABEL = {
  developer: "Developer",
  productivity: "Productivity",
  finance: "Finance",
  image: "Image",
  "daily-use": "Daily use",
  games: "Games",
  privacy: "Privacy",
  guide: "Guide",
};
// Chip order; only categories that actually have posts are shown.
const BLOG_CAT_ORDER = ["developer", "productivity", "finance", "image", "daily-use", "games", "privacy", "guide"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function dateLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
function blogTag(cat) {
  return `<span class="post-tag" data-cat="${cat}">${esc(BLOG_CAT_LABEL[cat] || cat)}</span>`;
}
/** Date + category capsules for a post header, keyed by slug. */
function blogMeta(slug, blog) {
  const p = blog.find((x) => x.slug === slug);
  if (!p) throw new Error(`blog-meta: unknown post "${slug}"`);
  return `<p class="post__meta"><time datetime="${p.date}">${dateLabel(p.date)}</time><span class="post-tags">${p.cats.map(blogTag).join("")}</span></p>`;
}
/** The whole index: search box, filter chips, and the card list. */
function blogList(blog) {
  const counts = {};
  blog.forEach((p) => p.cats.forEach((c) => (counts[c] = (counts[c] || 0) + 1)));
  const chip = (cat, label, n, active) =>
    `<button type="button" class="cat-chip${active ? " is-active" : ""}"${cat ? ` data-cat="${cat}"` : ' data-cat="all"'} aria-pressed="${active}">${esc(label)}<span class="cat-chip__n">${n}</span></button>`;
  const chips = [chip("", "All", blog.length, true)]
    .concat(BLOG_CAT_ORDER.filter((c) => counts[c]).map((c) => chip(c, BLOG_CAT_LABEL[c], counts[c], false)))
    .join("\n");
  const cards = blog
    .map((p) => {
      const text = `${p.title} ${p.excerpt} ${p.cats.map((c) => BLOG_CAT_LABEL[c]).join(" ")}`.toLowerCase();
      return `<a class="post-card" data-cats="${p.cats.join(" ")}" data-text="${esc(text)}" href="/blog/${p.slug}/">
        <p class="post-card__meta"><time datetime="${p.date}">${dateLabel(p.date)}</time><span class="post-tags">${p.cats.map(blogTag).join("")}</span></p>
        <h2 class="post-card__title">${esc(p.title)}</h2>
        <p class="post-card__excerpt">${esc(p.excerpt)}</p>
        <span class="post-card__go">Read ${icon("arrow-right")}</span>
      </a>`;
    })
    .join("\n");
  return `<div class="blog-controls">
      <div class="blog-search">${icon("search")}<input type="search" placeholder="Search posts" aria-label="Search posts" autocomplete="off" data-blog-search /></div>
      <div class="cat-bar" data-blog-filter aria-label="Filter posts by category">${chips}</div>
    </div>
    <div class="post-list" data-blog-list>
      ${cards}
    </div>
    <p class="muted blog-empty" data-blog-empty hidden>No posts match.</p>`;
}

/* ---------- front matter ---------- */
function parseMeta(html) {
  const m = html.match(/^\s*<!--\s*meta\s+([\s\S]*?)-->/);
  const meta = {};
  let body = html;
  if (m) {
    const attrRe = /(\w+)="([^"]*)"/g;
    let a;
    while ((a = attrRe.exec(m[1]))) meta[a[1]] = a[2];
    body = html.slice(m[0].length);
  }
  return { meta, body };
}

/* ---------- placeholder expansion ---------- */
function expand(html, { tools, categories, blog }) {
  return html
    .replace(/\{\{cards:featured\}\}/g, () => cardGrid(tools.filter((t) => t.featured)))
    .replace(/\{\{cards:all\}\}/g, () => cardGrid(tools))
    .replace(/\{\{cards:category:([\w-]+)\}\}/g, (_, id) => cardGrid(tools.filter((t) => t.category === id)))
    .replace(/\{\{chips\}\}/g, () => catChips(categories, tools))
    .replace(/\{\{tool-hero:([\w-]+)\}\}/g, (_, id) => toolHero(id, tools, categories))
    .replace(/\{\{blog-index\}\}/g, () => blogList(blog))
    .replace(/\{\{blog-meta:([\w-]+)\}\}/g, (_, slug) => blogMeta(slug, blog))
    .replace(/\{\{count:tools\}\}/g, () => String(tools.length))
    .replace(/\{\{year\}\}/g, () => String(new Date().getFullYear()));
}

/* ---------- partial resolution ---------- */
function resolvePartials(html, partials, depth = 0) {
  if (depth > 5) return html;
  const replaced = html.replace(/<!--\s*include:([\w-]+)\s*-->/g, (_, name) => {
    if (!partials[name]) throw new Error(`Unknown partial: ${name}`);
    return partials[name];
  });
  return /<!--\s*include:/.test(replaced) ? resolvePartials(replaced, partials, depth + 1) : replaced;
}

/* ---------- render one page ---------- */
function renderPage(layout, partials, data, meta, body) {
  const title = meta.title || "NoByte";
  const description = meta.description || "";
  const path = meta.path || "/";
  const canonical = SITE_URL + path;
  const ogImage = meta.og ? SITE_URL + meta.og : SITE_URL + "/assets/og-image.jpg";
  const keywords = meta.keywords || "";
  // noindex="1" is for pages whose content only exists on the visitor's own
  // device (the favourites list), so a crawler would only ever see an empty page.
  const robots = meta.noindex === "1" ? "noindex, follow" : "index, follow";
  // Tool pages carry SoftwareApplication plus a BreadcrumbList that mirrors the
  // Home / Category / Tool trail already shown on the page. All of this lives in
  // <head> as JSON-LD; none of it changes what the page renders.
  let structured = "";
  if (meta.tool === "1") {
    const toolName = title.replace(/ \| NoByte.*/, "");
    const id = path.replace(/^\/tools\//, "").replace(/\/$/, "");
    const t = data.tools.find((x) => x.id === id);
    const cat = t && data.categories.find((c) => c.id === t.category);
    const crumbs = [{ name: "Home", item: SITE_URL + "/" }];
    if (cat) crumbs.push({ name: cat.name, item: `${SITE_URL}/category/${cat.id}/` });
    crumbs.push({ name: t ? t.name : toolName, item: canonical });
    const graph = [
      {
        "@type": "SoftwareApplication",
        name: toolName,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any (web browser)",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description,
        url: canonical,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.name,
          item: c.item,
        })),
      },
    ];
    structured = `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>`;
  }

  // search.js only drives the all-tools grid and the home-page category filter.
  // Shipping it to the other 70-odd pages costs a request and a parse for code
  // that returns immediately, so it goes out only where its hooks exist.
  const needsSearch = /data-search-results|data-search-page-input|data-cat-filter|data-filter-grid/.test(body);
  // The blog list hook is generated by {{blog-index}}, so detect the placeholder
  // in the raw body — expansion runs after this script decision.
  const needsBlog = /\{\{blog-index\}\}/.test(body);
  // Favourites need the script wherever a star can be pressed or counted: any
  // page that prints cards or chips, any tool page (its header carries one),
  // and /favourites/. Detected on the raw body, before the placeholders expand.
  const needsFav = /\{\{cards:|\{\{tool-hero:|data-fav/.test(body);
  const searchScript = [
    needsSearch ? '    <script type="module" src="/js/search.js"></script>' : "",
    needsBlog ? '    <script type="module" src="/js/blog.js"></script>' : "",
    needsFav ? '    <script type="module" src="/js/favourites.js"></script>' : "",
  ].filter(Boolean).join("\n");

  let out = layout
    .replaceAll("{{title}}", esc(title))
    .replaceAll("{{description}}", esc(description))
    .replaceAll("{{keywords}}", esc(keywords))
    .replaceAll("{{robots}}", robots)
    .replaceAll("{{canonical}}", canonical)
    .replaceAll("{{ogImage}}", ogImage)
    .replaceAll("{{structured}}", structured)
    .replaceAll("{{searchScript}}", searchScript)
    .replace("{{content}}", body);

  out = resolvePartials(out, partials, 0);
  out = expand(out, data);
  return out;
}

/* ---------- sitemap ---------- */
function writeSitemap(paths) {
  const urls = paths
    .map((p) => `  <url><loc>${SITE_URL}${p}</loc><changefreq>weekly</changefreq></url>`)
    .join("\n");
  writeFileSync(join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  // robots
  const robotsSrc = join(ROOT, "public/robots.txt");
  const robots = existsSync(robotsSrc) ? read(robotsSrc) : "User-agent: *\nAllow: /\n";
  writeFileSync(join(DIST, "robots.txt"), robots.replace(/Sitemap:.*/g, "").trimEnd() + `\nSitemap: ${SITE_URL}/sitemap.xml\n`);
}

/* ---------- generate category pages from data ---------- */
function categoryPagesFromData(categories) {
  // returns [{relPath, meta, body}] for each category not already backed by a file
  return categories.map((c) => ({
    relPath: `category/${c.id}/index.html`,
    meta: {
      title: `${c.name} tools | NoByte`,
      description: c.description,
      path: `/category/${c.id}/`,
    },
    body: `<section class="section">
  <div class="container">
    <nav class="crumbs"><a href="/">Home</a> / <a href="/tools/">All tools</a> / <span>${esc(c.name)}</span></nav>
    <h1 class="page-title">${esc(c.name)}</h1>
    <p class="page-lead">${esc(c.description)}</p>
    <div class="tool-grid" data-reveal-group>{{cards:category:${c.id}}}</div>
  </div>
</section>`,
  }));
}

/* ---------- build ---------- */
function build() {
  const started = Date.now();
  const data = loadData();
  const layout = read(join(SRC, "layout.html"));
  const partials = {};
  const partialsDir = join(SRC, "partials");
  if (existsSync(partialsDir)) {
    for (const f of readdirSync(partialsDir)) {
      if (f.endsWith(".html")) partials[f.replace(/\.html$/, "")] = read(join(partialsDir, f));
    }
  }

  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  // static asset dirs copied verbatim
  for (const dir of ["css", "js", "data", "assets"]) {
    const from = join(SRC, dir);
    if (existsSync(from)) cpSync(from, join(DIST, dir), { recursive: true });
  }

  /* Version assets in dependency order, so every hash is taken from the exact
     bytes that get served: assets first (nothing references anything), then
     css/js, then the HTML.

     A module can import another module (`import … from "/js/ui.js"`), so one
     stamping pass is not enough: the first pass runs before /js/ui.js has a
     hash, and leaves that import bare. A bare import under the year-long
     immutable cache rule for /js/* means an edit to a shared module never
     reaches a returning visitor. So stamp, re-hash, and repeat until no hash
     moves — three passes in practice, and the cap stops a cycle spinning. */
  assetVersions.clear();
  hashDistDir("assets");
  const stampCssJs = () => {
    for (const dir of ["css", "js"]) {
      const base = join(DIST, dir);
      if (!existsSync(base)) continue;
      for (const file of walk(base)) {
        if (!/\.(css|js|mjs)$/.test(file)) continue;
        const src = read(file);
        const out = versionAssets(src); // replaces any ?v= from an earlier pass
        if (out !== src) writeFileSync(file, out);
      }
    }
    hashDistDir("css");
    hashDistDir("js");
    return JSON.stringify([...assetVersions].sort());
  };
  let prev = "";
  for (let pass = 0; pass < 5; pass++) {
    const now = stampCssJs();
    if (now === prev) break;
    prev = now;
  }

  // public/ files (robots.txt handled separately below, _headers etc. copied as-is)
  const publicDir = join(ROOT, "public");
  if (existsSync(publicDir)) {
    for (const f of readdirSync(publicDir)) {
      if (f === "robots.txt") continue;
      cpSync(join(publicDir, f), join(DIST, f), { recursive: true });
    }
  }

  const sitemapPaths = [];

  // file-backed pages
  const pagesDir = join(SRC, "pages");
  const pageFiles = walk(pagesDir).filter((f) => f.endsWith(".html"));
  const emitted = new Set();

  const emit = (relPath, meta, body) => {
    const outPath = join(DIST, relPath);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, versionAssets(renderPage(layout, partials, data, meta, body)));
    emitted.add(relPath.replace(/\\/g, "/"));
    if (meta.path && meta.path !== "/404" && meta.noindex !== "1") sitemapPaths.push(meta.path);
  };

  // Map a page's URL path to its output file so clean URLs (folder/index.html) work on any static host.
  const outputFor = (p) => {
    if (p === "/404") return "404.html";
    if (p === "/") return "index.html";
    const trimmed = p.replace(/^\//, "").replace(/\/$/, "");
    return `${trimmed}/index.html`;
  };

  for (const file of pageFiles) {
    const rel = relative(pagesDir, file).replace(/\\/g, "/");
    const { meta, body } = parseMeta(read(file));
    if (!meta.path) meta.path = "/" + rel.replace(/index\.html$/, "").replace(/\.html$/, "");
    emit(outputFor(meta.path), meta, body);
  }

  // data-driven category pages (only if not hand-authored)
  for (const cp of categoryPagesFromData(data.categories)) {
    if (!emitted.has(cp.relPath)) emit(cp.relPath, cp.meta, cp.body);
  }

  writeSitemap(sitemapPaths);
  console.log(`built ${emitted.size} pages + sitemap in ${Date.now() - started}ms`);
}

/* ---------- run ---------- */
build();
if (process.argv.includes("--watch")) {
  console.log("watching src/ …");
  let t;
  watch(SRC, { recursive: true }, () => {
    clearTimeout(t);
    t = setTimeout(() => {
      try { build(); } catch (e) { console.error("build error:", e.message); }
    }, 80);
  });
}
