# Contributing to NoByte

Thanks for wanting to contribute! NoByte's whole point is staying small, fast, and dependency-free, so contributions are held to that bar.

## Ground rules

- **Zero runtime dependencies.** Nothing gets pulled in via npm at build or runtime. Third-party browser libraries (pdf-lib, pdf.js, marked, etc.) are vendored and pinned under `src/assets/vendor`, never loaded from a CDN.
- - **Pure core, DOM shell.** Non-trivial logic belongs in `src/js/lib/`, written so it can be unit tested with Node's built-in test runner. Each `src/js/tools/<id>.js` file should stay a thin wrapper that reads the DOM and calls into `lib/`.
  - - **Honest scope.** If a tool can't be done truthfully in a browser (a real speed test, a live currency feed), it doesn't belong. See the README's "Honest scope" section for the reasoning.
    - - **The registry is the source of truth.** `src/data/tools.json` drives the homepage, the all-tools page, category pages, search, the sitemap, and per-tool JSON-LD. Don't hand-wire a tool into multiple places.
     
      - ## Getting started
     
      - ```
        git clone https://github.com/AnkitSurana/NoByte.git
        cd NoByte
        npm start
        ```

        Node 18+ is required. There is nothing to `npm install`.

        - `npm start` builds the site and serves it at http://127.0.0.1:4321
        - - `npm run build` builds the site into `dist/`
          - - `npm run watch` rebuilds on change
            - - `npm test` runs the unit tests
             
              - ## Adding a new tool
             
              - 1. Add an entry to `src/data/tools.json`.
                2. 2. Create `src/pages/tools/<id>/index.html` with a front-matter comment and `{{tool-hero:<id>}}`.
                   3. 3. Create `src/js/tools/<id>.js`.
                     
                      4. That's it — the tool then appears automatically on the homepage, the all-tools grid, its category page, search, and the sitemap. No other wiring is needed.
                     
                      5. ## Before opening a pull request
                     
                      6. - Run `npm test` — all tests must pass.
                         - - Run `npm run build` to confirm the site builds cleanly.
                           - - Keep the PR scoped to one tool or one fix; smaller PRs are easier to review.
                             - - Match the existing style: plain HTML, CSS, and JS, no framework, no build tooling beyond `build.mjs`.
                               - - Fill out the pull request template.
                                
                                 - ## Reporting bugs and requesting features
                                
                                 - Please use the issue templates. For a security vulnerability, don't open a public issue — see [SECURITY.md](./SECURITY.md) instead.
                                
                                 - ## Code of conduct
                                
                                 - This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). Please be kind.
                                
                                 - ## License
                                
                                 - By contributing, you agree that your contributions will be licensed under the project's MIT License.
                                 - 
