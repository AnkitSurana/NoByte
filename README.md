# NoByte

> Free tools that run in your browser. No uploads, no accounts.

## Overview

NoByte is a static site with 63 small tools across six categories: developer utilities, PDF and image tools, calculators, everyday helpers, and 13 browser games. Almost everything runs entirely in the browser and never sends your data anywhere; only the DNS lookup and the dictionary reach a public service.

The site is plain HTML, CSS, and JavaScript. There is no framework, no bundler, and no runtime dependency. The only build step is one dependency-free Node script.

## Architecture and engineering notes

The parts worth reading the source for:

- **Zero dependencies, on purpose.** The builder, the dev server, and the tests all use only the Node standard library (`node:fs`, `node:http`, `node:test`). There is nothing to `npm install`, nothing to audit, and no supply chain. Third-party browser libraries (pdf-lib, pdf.js, marked, and so on) are vendored and pinned under `src/assets/vendor`, never pulled from a CDN at runtime.

- **A registry drives the whole site.** `src/data/tools.json` is the single source of truth. The homepage grid, the all-tools page, each category page, on-site search, the sitemap, and the per-tool JSON-LD are all generated from it, so they can never drift out of sync. Adding a tool is three files and no wiring (see [Adding a tool](#adding-a-tool)).

- **Pure core, DOM shell.** The non-trivial logic lives in dependency-free modules under `src/js/lib/`, and each tool file is a thin wrapper that reads the DOM and calls into them. That split is what makes the interesting parts testable:
  - `lib/lights-out.js` solves Lights Out as linear algebra over GF(2). Each press is an unknown, each cell an equation, everything mod 2. Gaussian elimination reduces the system; an all-zero row against a 1 means the board is unsolvable. The 5x5 system has nullity 4, so a solvable board has 2^4 = 16 solutions, and the solver returns the shortest, which is what makes a hint a move on a shortest path rather than merely a legal one.
  - `lib/wcag.js` is the WCAG 2.x relative-luminance and contrast-ratio math, shared by the contrast checker and the QR generator's scannability warning (one implementation, two callers).
  - `lib/bases.js` parses arbitrary bases with BigInt, so a 64-bit hex value keeps full precision where `Number` would round it off.

- **Cache-safe deploys via content hashing.** Every CSS, JS, and icon reference is stamped with `?v=<hash of that file's bytes>`. A module can import another module, so one stamping pass is not enough: the hash of an importer depends on the hashes of its imports. The builder stamps, re-hashes, and repeats until the set of hashes stops moving (a handful of passes, with a cap to stop a cycle). See [Caching](#caching).

- **A round QR code is still a square code.** The spec requires a square grid with a quiet margin, so the QR generator draws a round code the way real ones are made: the square matrix in the middle, with loose non-data modules packed out to the circle's edge. The PNG export renders at roughly a 4K longest side but clamps by total canvas area, because mobile Safari silently drops a canvas past about 16.7 million pixels.

- **Honest scope.** Tools that cannot be done truthfully in a browser were left out on purpose: a speed test (a browser cannot measure a fast link accurately) and a live currency converter (free rate feeds go stale). The two tools that must reach the network say so and are [listed explicitly](#tools-that-use-a-third-party-service).

## Features

- 63 tools, nearly all of which work offline once the page has loaded
- A Games category with 13 games (2048, Snake, Minesweeper, Sudoku, Connect Four, a Tetris-style stacker, an F1-style reaction test and more), each with local high scores
- No tracking, no analytics, no advertising scripts
- Light and dark themes, with the OS preference respected
- One HTML page per tool, so every page is crawlable and loads fast
- Third-party libraries are vendored and pinned, not loaded from a CDN

## Getting started

Node 18 or newer is required to run the build. There are no npm dependencies to install.

```bash
git clone https://github.com/AnkitSurana/NoByte.git
cd NoByte
npm start
```

`npm start` builds the site and serves it at http://127.0.0.1:4321.

## Scripts

```bash
npm start         # build, then serve on http://127.0.0.1:4321
npm run build     # build the site into dist/
npm run watch     # rebuild on change
npm run serve     # serve dist/ (pass a port: npm run serve -- 8080)
npm test          # run the unit tests (Node's built-in runner)
```

The dev server is `serve.mjs`, a small zero-dependency script. It handles clean URLs and the 404 page, and exits with a clear message if the port is taken.

### Tests

```bash
npm test
```

The tests use Node's built-in test runner (`node --test`), so there is nothing to install. They cover the pure logic in `src/js/lib/`, which is where the parts most worth trusting live:

- the Lights Out solver: solutions actually clear the board, are the shortest (brute-forced against every smaller press-set for the small cases), a single press round-trips, and genuinely unsolvable boards come back as `null`;
- the WCAG contrast math: black on white is exactly 21:1, the ratio is symmetric, 3- and 6-digit hex agree, and `#767676` on white lands on the AA 4.5:1 line;
- the BigInt base parser: round-trips across bases, ignores `0x`/`0b`/`0o` prefixes, keeps precision past 2^53, and rejects out-of-range digits.

The tool files themselves are thin DOM shells over these modules, so the logic can be tested in Node without a browser or a DOM stub.

The output in `dist/` is a static site. Deploy it to any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages). URLs use `folder/index.html`, so no rewrite rules are needed.

### Caching

The build stamps every CSS, JS, and icon reference with `?v=<hash of that file's
contents>`. Edit a file and its URL changes, so a browser cannot reuse the old
copy; leave it alone and the hash holds, so it stays cached. That lets
`public/_headers` cache those assets for a year while keeping HTML on
`must-revalidate`, which is what makes a redeploy show up immediately instead of
whenever a TTL happens to lapse. `_headers` is Cloudflare Pages / Netlify
syntax — on a host that ignores it, set the same two rules yourself.

## Project structure

```
build.mjs              Zero-dependency builder: layout injection, partials,
                       card grids from the registry, sitemap, robots
serve.mjs              Zero-dependency dev server with clean URLs
src/
  layout.html          Base HTML shell (head, meta, OG, theme bootstrap)
  partials/            Header and footer, included once site-wide
  pages/               One folder per route; each page is body content plus
                       a front-matter comment with its title, description, path
  css/                 tokens.css (design tokens) and main.css (components)
  js/                  Shared helpers (ui, theme, motion, search, card,
                       favourites), lib/ (pure, tested logic), and
                       tools/<tool-id>.js, one DOM shell per tool
  data/tools.json      The tool registry, the single source of truth
  assets/              Icon sprite, self-hosted fonts, vendored libraries
public/                Copied to dist/ as-is: _headers (cache rules), robots.txt
test/                  Unit tests for src/js/lib/, run by node --test
```

## Adding a tool

1. Add an entry to `src/data/tools.json`.
2. Create `src/pages/tools/<id>/index.html` with a front-matter comment and `{{tool-hero:<id>}}`.
3. Create `src/js/tools/<id>.js`.

The tool then appears automatically on the homepage, the all-tools grid, its category page, in search, and in the sitemap.

## Tools that use a third-party service

Only these reach the network. Everything else is local:

| Tool | Service | Why |
| --- | --- | --- |
| DNS lookup | Google and Cloudflare DNS-over-HTTPS | A DNS query has to ask a resolver |
| Dictionary | dictionaryapi.dev | Word definitions come from a public dictionary; the looked-up word is sent to it |

Tools that could not be done honestly in a browser were deliberately left out: an internet speed test (a browser cannot measure a fast link accurately) and a live currency converter (free rate feeds update once a day and go stale).

## Vendored libraries

| Library | Used by |
| --- | --- |
| pdf-lib | PDF converter, PDF page tools |
| pdf.js | PDF converter, PDF page tools |
| fflate | PDF to images and PDF split (zip output) |
| qrcode-generator | QR code generator |
| marked, DOMPurify | README builder preview |
| SortableJS | README builder, PDF page tools drag-and-drop |
| jsdiff | Text diff |

## License

MIT. See the [LICENSE](LICENSE) file.
