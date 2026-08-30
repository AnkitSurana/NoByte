// Markdown preview: render Markdown to sanitised HTML, live, in the browser.
// marked (parser) and DOMPurify (sanitiser) are loaded as globals by the page.
import { debounce } from "/js/ui.js";

const $ = (id) => document.getElementById(id);
const input = $("md-in"), preview = $("md-preview"), htmlOut = $("md-html");

const EXAMPLE = `# Markdown preview

Type **Markdown** on the left and watch it render here.

## What it handles

- Bullet lists
- [Links](https://nobyte.in)
- \`inline code\` and code blocks
- **bold**, *italic*, ~~strikethrough~~

> A blockquote, for good measure.

\`\`\`js
console.log("Rendered in your browser.");
\`\`\`

| Tool | Runs where |
| ---- | ---------- |
| This one | Your device |
`;

function render() {
  const parsed = (marked.parse ? marked.parse(input.value, { gfm: true, breaks: true }) : marked(input.value));
  const clean = DOMPurify.sanitize(parsed);
  preview.innerHTML = clean;
  htmlOut.value = clean;
}

const run = debounce(render, 120);
input.addEventListener("input", run);
$("md-example").addEventListener("click", () => { input.value = EXAMPLE; render(); });

// Start with the example so the preview shows rendered output on load.
input.value = EXAMPLE;
render();
