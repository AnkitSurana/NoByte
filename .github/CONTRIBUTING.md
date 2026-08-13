# Contributing to NoByte

Thanks for wanting to contribute. NoByte's whole point is staying small, fast, and dependency-free, so contributions are held to that bar.

## Ground rules

- **Zero runtime dependencies.** Nothing is pulled in via npm at build or runtime. Third-party browser libraries (pdf-lib, pdf.js, marked, and so on) are vendored and pinned under `src/assets/vendor`, never loaded from a CDN.
- **Pure core, DOM shell.** Non-trivial logic belongs in `src/js/lib/`, written so it can be unit tested with Node's built-in runner. Each `src/js/tools/<id>.js` file stays a thin wrapper that reads the DOM and calls into `lib/`.
- **Honest scope.** If a tool cannot be done truthfully in a browser (a real speed test, a live currency feed), it does not belong. See [Tools that use a third-party service](../README.md#tools-that-use-a-third-party-service) in the README for the reasoning.
- **The registry is the source of truth.** `src/data/tools.json` drives the homepage, the all-tools page, category pages, search, the sitemap, and the per-tool JSON-LD. Don't hand-wire a tool into several places.

## Getting started

Node 18 or newer is required. There is nothing to `npm install`.

```bash
git clone https://github.com/AnkitSurana/NoByte.git
cd NoByte
npm start
```

```bash
npm start         # build, then serve on http://127.0.0.1:4321
npm run build     # build the site into dist/
npm run watch     # rebuild on change
npm test          # run the unit tests
```

## Adding a new tool

1. Add an entry to `src/data/tools.json`.
2. Create `src/pages/tools/<id>/index.html` with a front-matter comment and `{{tool-hero:<id>}}`.
3. Create `src/js/tools/<id>.js`.

The tool then appears automatically on the homepage, the all-tools grid, its category page, in search, and in the sitemap. No other wiring is needed.

## Before opening a pull request

- Run `npm test`; all tests must pass.
- Run `npm run build` to confirm the site builds cleanly.
- Keep the pull request scoped to one tool or one fix. Smaller changes are easier to review.
- Match the existing style: plain HTML, CSS, and JS, no framework, no build tooling beyond `build.mjs`.
- Fill out the [pull request template](./PULL_REQUEST_TEMPLATE.md).

## Reporting bugs and requesting features

Use the issue templates. For a security vulnerability, don't open a public issue; see [SECURITY.md](./SECURITY.md) instead.

## Code of conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). Please be kind.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](../LICENSE).
