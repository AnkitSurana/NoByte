// README builder — drag-and-drop section cards + raw Markdown, live preview.
import { SECTIONS, SECTION_BY_ID, HEADING_TO_SECTION, TEMPLATES } from "/js/tools/readme-builder/sections.js";
import { download, debounce } from "/js/ui.js";

const STORAGE = "readme_builder_v1";
let uid = 1;

const state = { mode: "builder", cards: [], raw: "" };

const el = {
  palette: document.getElementById("rb-palette"),
  doc: document.getElementById("rb-doc"),
  empty: document.getElementById("rb-empty"),
  raw: document.getElementById("rb-raw"),
  preview: document.getElementById("rb-preview"),
  template: document.getElementById("rb-template"),
};

/* ---------- markdown assembly ---------- */
function builderMarkdown() {
  return state.cards
    .map((c) => SECTION_BY_ID[c.defId].toMarkdown(c.values))
    .filter(Boolean)
    .join("\n")
    .trim() + "\n";
}
function currentMarkdown() {
  return state.mode === "raw" ? state.raw : builderMarkdown();
}

/* ---------- preview ---------- */
marked.setOptions({ gfm: true, breaks: false });
const renderPreview = debounce(() => {
  const html = DOMPurify.sanitize(marked.parse(currentMarkdown() || "*Nothing yet.*"));
  el.preview.innerHTML = html;
}, 150);

/* ---------- persistence ---------- */
const persist = debounce(() => {
  try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch {}
}, 200);
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || "null");
    if (saved && Array.isArray(saved.cards)) {
      state.mode = saved.mode || "builder";
      state.cards = saved.cards;
      state.raw = saved.raw || "";
      uid = Math.max(1, ...state.cards.map((c) => c.uid || 0)) + 1;
      return true;
    }
  } catch {}
  return false;
}

/* ---------- palette ---------- */
function renderPalette() {
  el.palette.innerHTML = "";
  SECTIONS.forEach((def) => {
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = `<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#${def.icon}"></use></svg> ${def.label}`;
    b.addEventListener("click", () => addCard(def.id));
    el.palette.appendChild(b);
  });
}

/* ---------- cards ---------- */
function addCard(defId, values = {}) {
  state.cards.push({ uid: uid++, defId, collapsed: false, values });
  renderDoc();
  afterChange();
}

function fieldControl(card, field) {
  const val = card.values[field.name] ?? "";
  const id = `f-${card.uid}-${field.name}`;
  if (field.type === "textarea" || field.type === "lines") {
    return `<div class="field"><label for="${id}">${field.label}</label><textarea class="textarea mono" id="${id}" data-field="${field.name}" placeholder="${field.placeholder || ""}" style="min-height:80px;">${escapeHtml(val)}</textarea></div>`;
  }
  if (field.type === "select") {
    const opts = field.options.map((o) => `<option ${o === val ? "selected" : ""}>${o}</option>`).join("");
    return `<div class="field"><label for="${id}">${field.label}</label><select class="select" id="${id}" data-field="${field.name}">${opts}</select></div>`;
  }
  if (field.type === "badges") {
    const picked = Array.isArray(val) ? val : [];
    const boxes = field.options.map((o) => `<label><input type="checkbox" data-badge="${o}" ${picked.includes(o) ? "checked" : ""}/> ${o}</label>`).join("");
    return `<div class="field"><label>${field.label}</label><div class="rb-badges" data-field="${field.name}">${boxes}</div></div>`;
  }
  return `<div class="field"><label for="${id}">${field.label}</label><input class="input" id="${id}" data-field="${field.name}" value="${escapeHtml(val)}" placeholder="${field.placeholder || ""}" /></div>`;
}

function renderDoc() {
  el.doc.innerHTML = "";
  state.cards.forEach((card) => {
    const def = SECTION_BY_ID[card.defId];
    const node = document.createElement("div");
    node.className = "rb-card" + (card.collapsed ? " collapsed" : "");
    node.dataset.uid = card.uid;
    node.innerHTML = `
      <div class="rb-card__head">
        <span class="rb-card__handle" aria-label="Drag to reorder"><svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#grip-vertical"></use></svg></span>
        <span class="rb-card__title">${def.label}</span>
        <button class="icon-btn icon-btn--sm" data-collapse aria-label="Collapse"><svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#chevron-down"></use></svg></button>
        <button class="icon-btn icon-btn--sm" data-delete aria-label="Remove section"><svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#trash"></use></svg></button>
      </div>
      <div class="rb-card__body">${def.fields.map((f) => fieldControl(card, f)).join("")}</div>`;

    node.querySelector("[data-delete]").addEventListener("click", () => {
      state.cards = state.cards.filter((c) => c.uid !== card.uid);
      renderDoc();
      afterChange();
    });
    node.querySelector("[data-collapse]").addEventListener("click", () => {
      card.collapsed = !card.collapsed;
      node.classList.toggle("collapsed", card.collapsed);
      persist();
    });
    node.querySelectorAll("[data-field]").forEach((input) => {
      const name = input.dataset.field;
      if (input.classList.contains("rb-badges")) {
        input.querySelectorAll("[data-badge]").forEach((box) => {
          box.addEventListener("change", () => {
            card.values[name] = [...input.querySelectorAll("[data-badge]:checked")].map((b) => b.dataset.badge);
            afterChange();
          });
        });
      } else {
        input.addEventListener("input", () => { card.values[name] = input.value; afterChange(); });
      }
    });
    el.doc.appendChild(node);
  });
  el.empty.style.display = state.cards.length ? "none" : "";
}

/* ---------- raw mode ---------- */
function syncRawFromBuilder() {
  state.raw = builderMarkdown();
  el.raw.value = state.raw;
}
el.raw.addEventListener("input", () => {
  state.raw = el.raw.value;
  afterChange();
});

/* toolbar */
document.getElementById("rb-toolbar").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-md]");
  if (!btn) return;
  wrapSelection(btn.dataset.md);
});
function wrapSelection(kind) {
  const t = el.raw;
  const s = t.selectionStart, en = t.selectionEnd;
  const sel = t.value.slice(s, en);
  const map = {
    bold: [`**`, `**`, "bold text"],
    italic: [`*`, `*`, "italic text"],
    code: ["`", "`", "code"],
    h2: ["## ", "", "Heading"],
    ul: ["- ", "", "List item"],
    link: ["[", "](https://)", "text"],
    fence: ["```\n", "\n```", "code"],
    table: ["| Column | Column |\n| --- | --- |\n| Cell | Cell |", "", ""],
  };
  const [pre, post, placeholder] = map[kind];
  const body = sel || placeholder;
  const insert = kind === "table" ? pre : pre + body + post;
  t.value = t.value.slice(0, s) + insert + t.value.slice(en);
  t.focus();
  t.selectionStart = s + pre.length;
  t.selectionEnd = s + pre.length + body.length;
  state.raw = t.value;
  afterChange();
}

/* re-parse raw -> cards */
document.getElementById("rb-reparse").addEventListener("click", () => {
  state.cards = parseMarkdown(state.raw);
  uid = Math.max(1, ...state.cards.map((c) => c.uid || 0)) + 1;
  switchMode("builder");
  renderDoc();
  afterChange();
});

function parseMarkdown(md) {
  const cards = [];
  const push = (defId, values) => cards.push({ uid: uid++, defId, collapsed: false, values });
  const blocks = md.split(/\n(?=## )/);
  // Leading block (title / description before first ##)
  const lead = blocks[0].startsWith("## ") ? "" : blocks.shift();
  if (lead) {
    const titleMatch = lead.match(/^#\s+(.+)$/m);
    const tagMatch = lead.match(/^>\s+(.+)$/m);
    if (titleMatch) push("title", { name: titleMatch[1].trim(), tagline: tagMatch ? tagMatch[1].trim() : "", badges: [] });
    const prose = lead.replace(/^#\s+.+$/m, "").replace(/^>\s+.+$/m, "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim();
    if (prose) push("description", { text: prose });
  }
  for (const block of blocks) {
    const m = block.match(/^##\s+(.+)\n?([\s\S]*)$/);
    if (!m) continue;
    const heading = m[1].trim();
    const body = m[2].trim();
    const defId = HEADING_TO_SECTION[heading.toLowerCase()];
    if (!defId) { push("custom", { heading, body }); continue; }
    const def = SECTION_BY_ID[defId];
    const linesField = def.fields.find((f) => f.type === "lines");
    const fence = body.match(/```(\w*)\n([\s\S]*?)```/);
    if (defId === "installation" || defId === "tests") {
      const cmd = fence ? fence[2].trim().replace(/^(npm|yarn|pnpm|pip|cargo|go)\s+/, "") : body;
      push(defId, defId === "installation" ? { manager: fence && /^npm/.test(fence[2]) ? "npm" : "npm", command: cmd } : { command: cmd });
    } else if (defId === "usage") {
      push("usage", { lang: fence ? fence[1] : "", code: fence ? fence[2].trim() : body });
    } else if (linesField) {
      push(defId, { [linesField.name]: body.replace(/^[-*]\s?\[?[ x]?\]?\s?/gm, "").trim() });
    } else {
      const textField = def.fields.find((f) => f.type === "textarea");
      if (textField) push(defId, { [textField.name]: body });
      else push("custom", { heading, body });
    }
  }
  return cards;
}

/* ---------- mode switching ---------- */
function switchMode(mode) {
  if (mode === "raw" && state.mode === "builder") syncRawFromBuilder();
  state.mode = mode;
  // reflect on tabs
  const builderTab = document.getElementById("rb-t-builder");
  const rawTab = document.getElementById("rb-t-raw");
  const on = mode === "builder";
  builderTab.setAttribute("aria-selected", String(on));
  rawTab.setAttribute("aria-selected", String(!on));
  document.getElementById("rb-p-builder").hidden = !on;
  document.getElementById("rb-p-raw").hidden = on;
  persist();
}
document.getElementById("rb-t-builder").addEventListener("click", () => switchMode("builder"));
document.getElementById("rb-t-raw").addEventListener("click", () => switchMode("raw"));

/* ---------- templates / clear / export ---------- */
el.template.addEventListener("change", () => {
  const t = TEMPLATES[el.template.value];
  if (!t) return;
  state.cards = t.map((defId) => ({ uid: uid++, defId, collapsed: false, values: {} }));
  el.template.value = "";
  switchMode("builder");
  renderDoc();
  afterChange();
});
document.getElementById("rb-clear").addEventListener("click", () => {
  state.cards = [];
  state.raw = "";
  el.raw.value = "";
  switchMode("builder");
  renderDoc();
  afterChange();
});
document.getElementById("rb-copy").addEventListener("click", (e) => {
  navigator.clipboard.writeText(currentMarkdown()).then(() => {
    const btn = e.currentTarget;
    btn.setAttribute("data-copied", "true");
    setTimeout(() => btn.removeAttribute("data-copied"), 1500);
  });
});
document.getElementById("rb-download").addEventListener("click", () => {
  download("README.md", currentMarkdown(), "text/markdown");
});

/* ---------- divider drag ---------- */
(() => {
  const split = document.getElementById("rb-split");
  const divider = document.getElementById("rb-divider");
  let dragging = false;
  const move = (clientX) => {
    const rect = split.getBoundingClientRect();
    let pct = ((clientX - rect.left) / rect.width) * 100;
    pct = Math.max(25, Math.min(75, pct));
    split.style.gridTemplateColumns = `${pct}% 6px ${100 - pct}%`;
  };
  divider.addEventListener("pointerdown", (e) => { dragging = true; divider.setPointerCapture(e.pointerId); });
  divider.addEventListener("pointermove", (e) => { if (dragging) move(e.clientX); });
  divider.addEventListener("pointerup", (e) => { dragging = false; divider.releasePointerCapture(e.pointerId); });
})();

/* ---------- sortable ---------- */
Sortable.create(el.doc, {
  handle: ".rb-card__handle",
  animation: 150,
  ghostClass: "sortable-ghost",
  chosenClass: "sortable-chosen",
  onEnd: () => {
    const order = [...el.doc.children].map((n) => Number(n.dataset.uid));
    state.cards.sort((a, b) => order.indexOf(a.uid) - order.indexOf(b.uid));
    afterChange();
  },
});

/* ---------- lifecycle ---------- */
function afterChange() { persist(); renderPreview(); }

renderPalette();
if (!restore()) {
  state.cards = TEMPLATES.minimal.map((defId) => ({ uid: uid++, defId, collapsed: false, values: {} }));
}
renderDoc();
el.raw.value = state.raw || builderMarkdown();
switchMode(state.mode);
renderPreview();

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
