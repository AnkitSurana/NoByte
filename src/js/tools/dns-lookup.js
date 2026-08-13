// DNS lookup over DNS-over-HTTPS (Google primary, Cloudflare fallback). All from the browser.
import { withPending } from "/js/ui.js";

const form = document.getElementById("dns-form");
const domainInput = document.getElementById("dns-domain");
const typeSelect = document.getElementById("dns-type");
const results = document.getElementById("dns-results");
const errorEl = document.getElementById("dns-error");
const submitBtn = document.getElementById("dns-submit");

const TYPE_NAMES = { 1: "A", 28: "AAAA", 15: "MX", 2: "NS", 16: "TXT", 5: "CNAME" };
const ALL_TYPES = ["A", "AAAA", "MX", "NS", "TXT", "CNAME"];

async function query(domain, type) {
  const endpoints = [
    `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/dns-json" } });
      if (!res.ok) continue;
      return await res.json();
    } catch (e) {
      /* try next */
    }
  }
  throw new Error("network");
}

function recordCard(type, data) {
  const answers = (data.Answer || []).filter((a) => TYPE_NAMES[a.type] === type || type === "TXT");
  const rows = answers.length
    ? answers.map((a) => `<div class="result-row"><span class="mono val" style="word-break:break-all;">${escapeHtml(a.data)}</span><span class="muted xs">TTL ${a.TTL}s</span></div>`).join("")
    : `<p class="muted small">No ${type} records.</p>`;
  return `<div class="card"><div class="row between mb-2"><strong>${type}</strong><span class="badge badge--muted">${answers.length}</span></div>${rows}</div>`;
}

const escapeHtml = (s = "") => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const domain = domainInput.value.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  errorEl.textContent = "";
  results.innerHTML = "";
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    errorEl.textContent = "Enter a valid domain, like example.com.";
    return;
  }

  await withPending(submitBtn, async () => {
    const types = typeSelect.value === "ALL" ? ALL_TYPES : [typeSelect.value];
    try {
      const responses = await Promise.all(types.map((t) => query(domain, t).then((d) => [t, d]).catch(() => [t, null])));
      const cards = responses.map(([t, d]) => (d ? recordCard(t, d) : `<div class="card"><strong>${t}</strong><p class="muted small mt-2">Lookup failed.</p></div>`));
      results.innerHTML = cards.join("");
    } catch (e) {
      errorEl.textContent = "Could not reach the DNS service. Check your connection.";
    }
  });
});
