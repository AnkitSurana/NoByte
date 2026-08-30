// HTTP status codes reference, searchable, in the browser.
import { copyText, toast } from "/js/ui.js";

const CODES = [
  [100, "Continue", "The client should continue with its request."],
  [101, "Switching Protocols", "The server is switching protocols as the client asked."],
  [103, "Early Hints", "Preload hints sent before the final response."],
  [200, "OK", "The request succeeded."],
  [201, "Created", "The request succeeded and a new resource was created."],
  [202, "Accepted", "The request was accepted but not yet processed."],
  [204, "No Content", "The request succeeded and there is nothing to send back."],
  [206, "Partial Content", "Part of the resource is returned, used for range requests."],
  [301, "Moved Permanently", "The resource has a new permanent URL."],
  [302, "Found", "The resource is temporarily at a different URL."],
  [303, "See Other", "Fetch the resource from another URL with a GET request."],
  [304, "Not Modified", "The cached version is still current, nothing changed."],
  [307, "Temporary Redirect", "Temporary redirect that keeps the original method."],
  [308, "Permanent Redirect", "Permanent redirect that keeps the original method."],
  [400, "Bad Request", "The server could not understand the request."],
  [401, "Unauthorized", "Authentication is required and has failed or is missing."],
  [402, "Payment Required", "Reserved for future use, sometimes used by paid APIs."],
  [403, "Forbidden", "The server understood the request but refuses to allow it."],
  [404, "Not Found", "The server cannot find the requested resource."],
  [405, "Method Not Allowed", "The request method is not supported for this resource."],
  [406, "Not Acceptable", "No version of the resource matches what the client accepts."],
  [408, "Request Timeout", "The server timed out waiting for the request."],
  [409, "Conflict", "The request conflicts with the current state of the resource."],
  [410, "Gone", "The resource is gone and will not come back."],
  [411, "Length Required", "The request needs a Content-Length header."],
  [413, "Payload Too Large", "The request body is larger than the server will accept."],
  [414, "URI Too Long", "The requested URL is longer than the server will accept."],
  [415, "Unsupported Media Type", "The request body is in a format the server will not accept."],
  [418, "I'm a teapot", "An April Fools joke from 1998 that stuck around."],
  [422, "Unprocessable Content", "The request was well-formed but has semantic errors."],
  [425, "Too Early", "The server will not risk processing a request that may be replayed."],
  [426, "Upgrade Required", "The client should switch to a different protocol."],
  [429, "Too Many Requests", "The client has sent too many requests in a given time."],
  [431, "Request Header Fields Too Large", "The headers are too large for the server to process."],
  [451, "Unavailable For Legal Reasons", "The resource is blocked for legal reasons."],
  [500, "Internal Server Error", "The server hit an unexpected condition."],
  [501, "Not Implemented", "The server does not support the request method."],
  [502, "Bad Gateway", "A server acting as a gateway got an invalid response upstream."],
  [503, "Service Unavailable", "The server is not ready, often overloaded or down for maintenance."],
  [504, "Gateway Timeout", "A gateway did not get a response in time from upstream."],
  [505, "HTTP Version Not Supported", "The server does not support the HTTP version used."],
  [507, "Insufficient Storage", "The server cannot store what is needed to finish the request."],
  [511, "Network Authentication Required", "The client must authenticate to get network access."],
];

const CLASSES = {
  1: "1xx Informational",
  2: "2xx Success",
  3: "3xx Redirection",
  4: "4xx Client error",
  5: "5xx Server error",
};
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

const list = document.getElementById("hs-list");
const search = document.getElementById("hs-search");
const count = document.getElementById("hs-count");

function render() {
  const q = search.value.trim().toLowerCase();
  const matches = CODES.filter(([code, name, desc]) =>
    !q || String(code).includes(q) || name.toLowerCase().includes(q) || desc.toLowerCase().includes(q)
  );
  let html = "";
  let lastClass = 0;
  for (const [code, name, desc] of matches) {
    const cls = Math.floor(code / 100);
    if (cls !== lastClass) { html += `<h2 class="status-class">${CLASSES[cls]}</h2>`; lastClass = cls; }
    html += `<div class="status-row" data-copytext="${code} ${esc(name)}" title="Copy code and name">
      <span class="status-code">${code}</span>
      <div><strong>${esc(name)}</strong><div class="muted small">${esc(desc)}</div></div>
    </div>`;
  }
  list.innerHTML = html || `<p class="muted">No status code matches that search.</p>`;
  count.textContent = `${matches.length} of ${CODES.length} codes`;
}

search.addEventListener("input", render);
list.addEventListener("click", (e) => {
  const row = e.target.closest(".status-row");
  if (!row) return;
  const text = row.dataset.copytext;
  copyText(text);
  toast(`Copied ${text}`);
});
render();
