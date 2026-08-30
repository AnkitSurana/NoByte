// URL inspector: parse a URL into its parts and decode the query string.
import { copyText, toast } from "/js/ui.js";

const $ = (id) => document.getElementById(id);
const urlInput = $("ui-url"), err = $("ui-error");
const partsWrap = $("ui-parts"), partsList = $("ui-parts-list");
const queryWrap = $("ui-query"), qcount = $("ui-qcount"), qtbody = $("ui-qtable").querySelector("tbody");

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function inspect() {
  const val = urlInput.value.trim();
  if (!val) {
    err.textContent = "";
    urlInput.classList.remove("input--invalid");
    partsWrap.classList.add("hidden");
    queryWrap.classList.add("hidden");
    return;
  }
  let u;
  try { u = new URL(val); }
  catch (e) {
    err.textContent = "Not a valid URL. Include the scheme, for example https://";
    urlInput.classList.add("input--invalid");
    partsWrap.classList.add("hidden");
    queryWrap.classList.add("hidden");
    return;
  }
  err.textContent = "";
  urlInput.classList.remove("input--invalid");

  const rows = [
    ["Protocol", u.protocol.replace(/:$/, "")],
    ["Host", u.hostname],
    ["Port", u.port || "(default)"],
    ["Path", u.pathname || "/"],
    ["Query", u.search ? u.search.slice(1) : "(none)"],
    ["Fragment", u.hash ? u.hash.slice(1) : "(none)"],
    ["Origin", u.origin],
  ];
  partsList.innerHTML = rows.map(([k, v]) => `<div class="result-row"><span class="label">${k}</span><span class="val">${esc(v)}</span></div>`).join("");
  partsWrap.classList.remove("hidden");

  const params = [...u.searchParams.entries()];
  if (params.length) {
    qtbody.innerHTML = params.map(([k, v]) => `<tr data-copyval="${esc(v)}" title="Copy value"><td class="mono">${esc(k)}</td><td class="mono">${esc(v)}</td></tr>`).join("");
    qcount.textContent = `${params.length} parameter${params.length > 1 ? "s" : ""}`;
    queryWrap.classList.remove("hidden");
  } else {
    queryWrap.classList.add("hidden");
  }
}

urlInput.addEventListener("input", inspect);

// Click a part row to copy its value.
partsList.addEventListener("click", (e) => {
  const row = e.target.closest(".result-row");
  if (!row) return;
  const v = row.querySelector(".val")?.textContent?.trim();
  if (!v || /^\((default|none)\)$/.test(v)) return;
  copyText(v);
  toast(`Copied ${row.querySelector(".label")?.textContent || "value"}`);
});
// Click a query row to copy its decoded value.
qtbody.addEventListener("click", (e) => {
  const row = e.target.closest("tr[data-copyval]");
  if (!row) return;
  copyText(row.dataset.copyval);
  toast("Copied value");
});

document.getElementById("ui-example").addEventListener("click", () => {
  urlInput.value = "https://shop.example.com:8443/products/42?q=hello%20world&page=2&sort=price#reviews";
  inspect();
});

inspect();
