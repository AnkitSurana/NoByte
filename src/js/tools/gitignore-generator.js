// .gitignore generator. Curated, accurate templates, combined on the client.
import { download } from "/js/ui.js";

// Order here is the order chips appear and sections are written.
const TEMPLATES = {
  // Languages
  Node: `node_modules/\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n.pnpm-debug.log*\ndist/\nbuild/\ncoverage/\n.cache/\n.parcel-cache/\n.eslintcache`,
  Python: `__pycache__/\n*.py[cod]\n*$py.class\n.venv/\nvenv/\nenv/\n*.egg-info/\n.eggs/\nbuild/\ndist/\n.pytest_cache/\n.mypy_cache/\n.ruff_cache/\n.coverage\nhtmlcov/`,
  Java: `*.class\ntarget/\nbuild/\n.gradle/\n*.jar\n*.war\n*.ear\nhs_err_pid*\nreplay_pid*`,
  Kotlin: `*.class\n.gradle/\nbuild/\n*.jar\nlocal.properties\n.kotlin/`,
  Go: `# Binaries\n*.exe\n*.dll\n*.so\n*.dylib\n# Test and coverage\n*.test\n*.out\ncoverage.out\n# Build output\nbin/`,
  Rust: `/target/\n**/*.rs.bk\n*.pdb`,
  C: `*.o\n*.obj\n*.a\n*.lib\n*.so\n*.dylib\n*.dll\n*.exe\n*.out`,
  "C++": `*.o\n*.obj\n*.so\n*.dylib\n*.dll\n*.exe\n*.out\n*.a\n*.la\ncmake-build-*/\nCMakeCache.txt\nCMakeFiles/`,
  "C#/.NET": `bin/\nobj/\n*.user\n*.suo\n.vs/\n[Dd]ebug/\n[Rr]elease/`,
  Swift: `.build/\nDerivedData/\n.swiftpm/\nPackage.resolved\n*.xcodeproj/xcuserdata/\n*.xcworkspace/xcuserdata/`,
  PHP: `/vendor/\ncomposer.phar\n.phpunit.result.cache\n*.log`,
  Ruby: `*.gem\n.bundle/\nvendor/bundle\nlog/\ntmp/\n.byebug_history`,
  Elixir: `/_build/\n/deps/\n/cover/\n/doc/\n*.ez\nerl_crash.dump\n.elixir_ls/`,
  R: `.Rhistory\n.Rapp.history\n.RData\n.Ruserdata\n.Rproj.user/`,
  Dart: `.dart_tool/\n.packages\nbuild/\npubspec.lock`,

  // Frameworks and platforms
  React: `# Create React App / Vite output\n/build\n/dist\n.env.local\n.env.development.local\n.env.production.local`,
  "Next.js": `.next/\nout/\n/build\nnext-env.d.ts\n.vercel\n*.tsbuildinfo`,
  Vue: `dist/\ndist-ssr/\n*.local`,
  Angular: `/dist\n/tmp\n/out-tsc\n.angular/\n*.tsbuildinfo`,
  Svelte: `/build\n/.svelte-kit\n/package`,
  Flutter: `.dart_tool/\n.flutter-plugins\n.flutter-plugins-dependencies\n.packages\nbuild/\nios/Pods/\nandroid/.gradle/`,
  Android: `*.apk\n*.aab\n*.ap_\n*.dex\nbin/\ngen/\n.gradle/\nbuild/\nlocal.properties\n*.keystore\n.cxx/`,
  Laravel: `/vendor\n/node_modules\n/public/build\n/public/hot\n/storage/*.key\nHomestead.yaml\nauth.json`,
  Django: `*.log\n*.pot\n*.pyc\n__pycache__/\ndb.sqlite3\ndb.sqlite3-journal\nmedia/\nstaticfiles/\nlocal_settings.py`,
  Rails: `/log/*\n/tmp/*\n/db/*.sqlite3\n/public/assets\n/public/packs\n/node_modules\n/storage/*\nconfig/master.key`,
  WordPress: `wp-config.php\nwp-content/uploads/\nwp-content/cache/\nwp-content/upgrade/\n*.log`,
  "Jupyter Notebook": `.ipynb_checkpoints/\n*/.ipynb_checkpoints/*\nprofile_default/\nipython_config.py`,

  // Game engines
  Unity: `[Ll]ibrary/\n[Tt]emp/\n[Oo]bj/\n[Bb]uild/\n[Bb]uilds/\n[Ll]ogs/\n[Uu]serSettings/\n*.csproj\n*.sln\n*.unitypackage`,
  Godot: `.godot/\n.import/\nexport.cfg\nexport_presets.cfg\n*.translation`,

  // Build and infrastructure
  Docker: `# Local compose overrides\ndocker-compose.override.yml`,
  Terraform: `.terraform/\n*.tfstate\n*.tfstate.*\ncrash.log\ncrash.*.log\n*.tfvars\n*.tfvars.json\noverride.tf\noverride.tf.json`,
  Sass: `.sass-cache/\n*.css.map\n*.sass.map\n*.scss.map`,
  LaTeX: `*.aux\n*.log\n*.out\n*.toc\n*.synctex.gz\n*.fdb_latexmk\n*.fls\n*.bbl\n*.blg`,

  // Secrets
  "Environment & secrets": `.env\n.env.*\n!.env.example\n*.pem\n*.key\nsecrets.*`,

  // Editors
  "VS Code": `.vscode/*\n!.vscode/settings.json\n!.vscode/extensions.json`,
  JetBrains: `.idea/\n*.iml\n*.iws\nout/`,
  Vim: `*.swp\n*.swo\n*~\nSession.vim\n.netrwhist`,
  "Sublime Text": `*.sublime-workspace\n*.sublime-project`,

  // Operating systems
  macOS: `.DS_Store\n.AppleDouble\n.LSOverride\n._*\n.Spotlight-V100\n.Trashes`,
  Windows: `Thumbs.db\nehthumbs.db\nDesktop.ini\n$RECYCLE.BIN/\n*.lnk`,
  Linux: `*~\n.directory\n.Trash-*`,
};

const chipsWrap = document.getElementById("gi-chips");
const out = document.getElementById("gi-out");
const count = document.getElementById("gi-count");
const selected = new Set();

Object.keys(TEMPLATES).forEach((name) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip";
  b.setAttribute("aria-pressed", "false");
  b.textContent = name;
  b.addEventListener("click", () => {
    const on = b.getAttribute("aria-pressed") === "true";
    b.setAttribute("aria-pressed", String(!on));
    if (on) selected.delete(name); else selected.add(name);
    render();
  });
  chipsWrap.appendChild(b);
});

function render() {
  const blocks = Object.keys(TEMPLATES)
    .filter((name) => selected.has(name))
    .map((name) => `# ---- ${name} ----\n${TEMPLATES[name]}`);
  out.value = blocks.join("\n\n");
  count.textContent = selected.size ? `.gitignore (${selected.size} selected)` : ".gitignore";
}

document.getElementById("gi-download").addEventListener("click", () => {
  if (!out.value) return;
  download(".gitignore", out.value, "text/plain");
});

// Start with Node selected so the output shows an example straight away.
const first = chipsWrap.querySelector("button.chip");
if (first) { first.setAttribute("aria-pressed", "true"); selected.add(first.textContent); }
render();
