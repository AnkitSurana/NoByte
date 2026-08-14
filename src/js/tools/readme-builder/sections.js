// Section definitions for the README builder.
// Each section: { id, label, icon, fields[], toMarkdown(values) }.
// Field types: text, textarea, lines (one item per line -> list), select, badges.
// Adding a new section is data-only — no changes to the builder needed.

const lines = (v) => (v || "").split("\n").map((s) => s.trim()).filter(Boolean);

export const SECTIONS = [
  {
    id: "title",
    label: "Title & badges",
    icon: "type",
    fields: [
      { name: "name", label: "Project name", type: "text", placeholder: "My Project" },
      { name: "tagline", label: "Tagline", type: "text", placeholder: "One line describing the project" },
      { name: "repo", label: "GitHub owner/repo (for badges)", type: "text", placeholder: "owner/repo" },
      { name: "badges", label: "Badges", type: "badges", options: ["license", "stars", "issues", "build", "version"] },
    ],
    toMarkdown: (v) => {
      let out = `# ${v.name || "Project name"}\n`;
      if (v.tagline) out += `\n> ${v.tagline}\n`;
      const picked = v.badges || [];
      if (v.repo && picked.length) {
        const [owner, repo] = v.repo.split("/");
        const b = [];
        if (picked.includes("license")) b.push(`![License](https://img.shields.io/github/license/${owner}/${repo})`);
        if (picked.includes("stars")) b.push(`![Stars](https://img.shields.io/github/stars/${owner}/${repo})`);
        if (picked.includes("issues")) b.push(`![Issues](https://img.shields.io/github/issues/${owner}/${repo})`);
        if (picked.includes("build")) b.push(`![Build](https://img.shields.io/github/actions/workflow/status/${owner}/${repo}/ci.yml)`);
        if (picked.includes("version")) b.push(`![Version](https://img.shields.io/github/v/release/${owner}/${repo})`);
        if (b.length) out += `\n${b.join(" ")}\n`;
      }
      return out;
    },
  },
  {
    id: "description",
    label: "Description",
    icon: "file-text",
    fields: [{ name: "text", label: "Description", type: "textarea", placeholder: "What the project does and who it is for." }],
    toMarkdown: (v) => (v.text ? `## Overview\n\n${v.text}\n` : ""),
  },
  {
    id: "toc",
    label: "Table of contents",
    icon: "align-left",
    fields: [{ name: "items", label: "Entries (one per line)", type: "lines", placeholder: "Installation\nUsage\nContributing" }],
    toMarkdown: (v) => {
      const items = lines(v.items);
      if (!items.length) return "";
      return `## Table of contents\n\n${items.map((i) => `- [${i}](#${i.toLowerCase().replace(/[^a-z0-9]+/g, "-")})`).join("\n")}\n`;
    },
  },
  {
    id: "features",
    label: "Features",
    icon: "lightbulb",
    fields: [{ name: "items", label: "Features (one per line)", type: "lines", placeholder: "Fast\nZero config\nWorks offline" }],
    toMarkdown: (v) => {
      const items = lines(v.items);
      return items.length ? `## Features\n\n${items.map((i) => `- ${i}`).join("\n")}\n` : "";
    },
  },
  {
    id: "screenshots",
    label: "Screenshots",
    icon: "image",
    fields: [
      { name: "alt", label: "Alt text", type: "text", placeholder: "App screenshot" },
      { name: "url", label: "Image URL", type: "text", placeholder: "https://…/screenshot.png" },
    ],
    toMarkdown: (v) => (v.url ? `## Screenshots\n\n![${v.alt || "Screenshot"}](${v.url})\n` : ""),
  },
  {
    id: "techstack",
    label: "Tech stack",
    icon: "network",
    fields: [{ name: "items", label: "Technologies (one per line)", type: "lines", placeholder: "React\nNode.js\nPostgreSQL" }],
    toMarkdown: (v) => {
      const items = lines(v.items);
      return items.length ? `## Tech stack\n\n${items.map((i) => `- ${i}`).join("\n")}\n` : "";
    },
  },
  {
    id: "installation",
    label: "Installation",
    icon: "download",
    fields: [
      { name: "manager", label: "Package manager", type: "select", options: ["npm", "yarn", "pnpm", "pip", "cargo", "go", "other"] },
      { name: "command", label: "Install command", type: "text", placeholder: "install my-project" },
    ],
    toMarkdown: (v) => {
      if (!v.command) return "";
      const mgr = v.manager && v.manager !== "other" ? `${v.manager} ` : "";
      return `## Installation\n\n\`\`\`bash\n${mgr}${v.command}\n\`\`\`\n`;
    },
  },
  {
    id: "usage",
    label: "Usage",
    icon: "book",
    fields: [
      { name: "lang", label: "Code language", type: "text", placeholder: "js" },
      { name: "code", label: "Example", type: "textarea", placeholder: "import project from 'my-project'" },
    ],
    toMarkdown: (v) => (v.code ? `## Usage\n\n\`\`\`${v.lang || ""}\n${v.code}\n\`\`\`\n` : ""),
  },
  {
    id: "api",
    label: "API reference",
    icon: "braces",
    fields: [{ name: "text", label: "API details (Markdown)", type: "textarea", placeholder: "### `doThing(options)`\n\nReturns…" }],
    toMarkdown: (v) => (v.text ? `## API reference\n\n${v.text}\n` : ""),
  },
  {
    id: "env",
    label: "Environment variables",
    icon: "key",
    fields: [{ name: "items", label: "VARIABLE = description (one per line)", type: "lines", placeholder: "API_KEY = your API key\nPORT = server port" }],
    toMarkdown: (v) => {
      const items = lines(v.items);
      if (!items.length) return "";
      const rows = items.map((i) => {
        const [k, ...rest] = i.split("=");
        return `| \`${(k || "").trim()}\` | ${rest.join("=").trim()} |`;
      });
      return `## Environment variables\n\n| Variable | Description |\n| --- | --- |\n${rows.join("\n")}\n`;
    },
  },
  {
    id: "roadmap",
    label: "Roadmap",
    icon: "trending-up",
    fields: [{ name: "items", label: "Items (one per line)", type: "lines", placeholder: "Dark mode\nPlugin API" }],
    toMarkdown: (v) => {
      const items = lines(v.items);
      return items.length ? `## Roadmap\n\n${items.map((i) => `- [ ] ${i}`).join("\n")}\n` : "";
    },
  },
  {
    id: "contributing",
    label: "Contributing",
    icon: "git-compare",
    fields: [{ name: "text", label: "Contributing notes", type: "textarea", placeholder: "Pull requests are welcome. For major changes, open an issue first." }],
    toMarkdown: (v) => `## Contributing\n\n${v.text || "Pull requests are welcome. For major changes, open an issue first to discuss what you would like to change."}\n`,
  },
  {
    id: "tests",
    label: "Tests",
    icon: "check",
    fields: [{ name: "command", label: "Test command", type: "text", placeholder: "npm test" }],
    toMarkdown: (v) => (v.command ? `## Running tests\n\n\`\`\`bash\n${v.command}\n\`\`\`\n` : ""),
  },
  {
    id: "license",
    label: "License",
    icon: "shield",
    fields: [
      { name: "spdx", label: "License", type: "select", options: ["MIT", "Apache-2.0", "GPL-3.0", "BSD-3-Clause", "MPL-2.0", "Unlicense", "Other"] },
      { name: "holder", label: "Copyright holder", type: "text", placeholder: "Your name" },
    ],
    toMarkdown: (v) => {
      const name = v.spdx || "MIT";
      const holder = v.holder ? ` © ${new Date().getFullYear()} ${v.holder}` : "";
      return `## License\n\n${name}${holder}. See the LICENSE file for details.\n`;
    },
  },
  {
    id: "acknowledgements",
    label: "Acknowledgements",
    icon: "star",
    fields: [{ name: "items", label: "Credits (one per line)", type: "lines", placeholder: "shields.io\nA helpful tutorial" }],
    toMarkdown: (v) => {
      const items = lines(v.items);
      return items.length ? `## Acknowledgements\n\n${items.map((i) => `- ${i}`).join("\n")}\n` : "";
    },
  },
  {
    id: "author",
    label: "Author",
    icon: "fingerprint",
    fields: [
      { name: "name", label: "Name", type: "text", placeholder: "Your name" },
      { name: "link", label: "Link (site or profile)", type: "text", placeholder: "https://github.com/you" },
    ],
    toMarkdown: (v) => {
      if (!v.name) return "";
      return `## Author\n\n${v.link ? `[${v.name}](${v.link})` : v.name}\n`;
    },
  },
  {
    id: "table",
    label: "Table",
    icon: "table",
    fields: [
      { name: "heading", label: "Heading (optional)", type: "text", placeholder: "Options" },
      { name: "headers", label: "Column headers (comma-separated)", type: "text", placeholder: "Name, Type, Default" },
      { name: "rows", label: "Rows (one per line, cells comma-separated)", type: "lines", placeholder: "size, number, 10\ncolor, string, red" },
    ],
    toMarkdown: (v) => {
      const split = (s) => s.split(s.includes("|") ? "|" : ",").map((c) => c.trim());
      const heads = split(v.headers || "").filter(Boolean);
      if (!heads.length) return "";
      const row = (cells) => `| ${cells.join(" | ")} |`;
      const body = lines(v.rows).map((r) => {
        const cells = split(r);
        return row(heads.map((_, i) => cells[i] ?? ""));
      });
      let out = v.heading ? `## ${v.heading}\n\n` : "";
      out += `${row(heads)}\n${row(heads.map(() => "---"))}`;
      return out + (body.length ? `\n${body.join("\n")}` : "") + "\n";
    },
  },
  {
    id: "custom",
    label: "Custom section",
    icon: "plus",
    fields: [
      { name: "heading", label: "Heading", type: "text", placeholder: "Section title" },
      { name: "body", label: "Content (Markdown)", type: "textarea", placeholder: "Anything you like." },
    ],
    toMarkdown: (v) => {
      if (!v.heading && !v.body) return "";
      return `## ${v.heading || "Section"}\n\n${v.body || ""}\n`;
    },
  },
];

export const SECTION_BY_ID = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

// Map a heading string back to a known section id (for re-parsing raw markdown).
export const HEADING_TO_SECTION = {
  overview: "description",
  description: "description",
  "table of contents": "toc",
  features: "features",
  screenshots: "screenshots",
  "tech stack": "techstack",
  installation: "installation",
  usage: "usage",
  "api reference": "api",
  "environment variables": "env",
  roadmap: "roadmap",
  contributing: "contributing",
  "running tests": "tests",
  tests: "tests",
  license: "license",
  acknowledgements: "acknowledgements",
  author: "author",
  options: "table",
};

export const TEMPLATES = {
  minimal: ["title", "description", "installation", "usage", "license"],
  oss: ["title", "description", "features", "toc", "installation", "usage", "contributing", "license"],
  library: ["title", "description", "installation", "usage", "api", "techstack", "tests", "license"],
};
