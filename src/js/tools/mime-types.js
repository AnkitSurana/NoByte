// MIME type lookup, searchable, in the browser.
import { copyText, toast } from "/js/ui.js";

const TYPES = [
  [".aac", "audio/aac"], [".abw", "application/x-abiword"], [".avi", "video/x-msvideo"],
  [".avif", "image/avif"], [".bin", "application/octet-stream"], [".bmp", "image/bmp"],
  [".bz2", "application/x-bzip2"], [".css", "text/css"], [".csv", "text/csv"],
  [".doc", "application/msword"], [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".eot", "application/vnd.ms-fontobject"], [".epub", "application/epub+zip"], [".flac", "audio/flac"],
  [".gif", "image/gif"], [".gz", "application/gzip"], [".htm", "text/html"], [".html", "text/html"],
  [".ico", "image/vnd.microsoft.icon"], [".ics", "text/calendar"], [".jar", "application/java-archive"],
  [".jpeg", "image/jpeg"], [".jpg", "image/jpeg"], [".js", "text/javascript"], [".json", "application/json"],
  [".jsonld", "application/ld+json"], [".m4a", "audio/mp4"], [".md", "text/markdown"], [".mid", "audio/midi"],
  [".mjs", "text/javascript"], [".mkv", "video/x-matroska"], [".mov", "video/quicktime"], [".mp3", "audio/mpeg"],
  [".mp4", "video/mp4"], [".mpeg", "video/mpeg"], [".odp", "application/vnd.oasis.opendocument.presentation"],
  [".ods", "application/vnd.oasis.opendocument.spreadsheet"], [".odt", "application/vnd.oasis.opendocument.text"],
  [".oga", "audio/ogg"], [".ogv", "video/ogg"], [".opus", "audio/opus"], [".otf", "font/otf"],
  [".pdf", "application/pdf"], [".png", "image/png"], [".ppt", "application/vnd.ms-powerpoint"],
  [".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"], [".rar", "application/vnd.rar"],
  [".rtf", "application/rtf"], [".svg", "image/svg+xml"], [".tar", "application/x-tar"], [".tif", "image/tiff"],
  [".tiff", "image/tiff"], [".ts", "video/mp2t"], [".ttf", "font/ttf"], [".txt", "text/plain"],
  [".wasm", "application/wasm"], [".wav", "audio/wav"], [".weba", "audio/webm"], [".webm", "video/webm"],
  [".webp", "image/webp"], [".woff", "font/woff"], [".woff2", "font/woff2"], [".xhtml", "application/xhtml+xml"],
  [".xls", "application/vnd.ms-excel"], [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  [".xml", "application/xml"], [".yaml", "application/yaml"], [".yml", "application/yaml"], [".zip", "application/zip"],
  [".7z", "application/x-7z-compressed"],
];
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

const tbody = document.querySelector("#mt-table tbody");
const search = document.getElementById("mt-search");
const count = document.getElementById("mt-count");

function render() {
  const q = search.value.trim().toLowerCase().replace(/^\./, "");
  const matches = TYPES.filter(([ext, mime]) => !q || ext.slice(1).includes(q) || mime.toLowerCase().includes(q));
  tbody.innerHTML = matches.map(([ext, mime]) => `<tr data-mime="${esc(mime)}" title="Copy MIME type"><td class="mono">${esc(ext)}</td><td class="mono">${esc(mime)}</td></tr>`).join("")
    || `<tr><td colspan="2" class="muted">No match for that search.</td></tr>`;
  count.textContent = `${matches.length} of ${TYPES.length} types`;
}

search.addEventListener("input", render);
tbody.addEventListener("click", (e) => {
  const row = e.target.closest("tr[data-mime]");
  if (!row) return;
  const mime = row.dataset.mime;
  copyText(mime);
  toast(`Copied ${mime}`);
});
render();
