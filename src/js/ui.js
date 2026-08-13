// Shared UI helpers used across every tool. Vanilla, no deps.
// Exposed both as ES module exports and on window.UI for inline handlers.

const ICONS = {
  check: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  error: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>',
  info: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>',
};

/** Toast: enters/exits from the same direction (spatial consistency). */
export function toast(message, variant = "info", ms = 3200) {
  const region = document.getElementById("toast-region");
  if (!region) return;
  const el = document.createElement("div");
  el.className = `toast toast--${variant}`;
  el.setAttribute("role", variant === "error" ? "alert" : "status");
  el.innerHTML = `${ICONS[variant] || ICONS.info}<div>${message}</div>`;
  region.appendChild(el);
  const remove = () => {
    el.setAttribute("data-leaving", "true");
    el.addEventListener("transitionend", () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 400);
  };
  const timer = setTimeout(remove, ms);
  el.addEventListener("click", () => {
    clearTimeout(timer);
    remove();
  });
}

/** Copy text to clipboard, with success feedback on the button (no toast for copies). */
export async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      btn.setAttribute("data-copied", "true");
      setTimeout(() => btn.removeAttribute("data-copied"), 1500);
    }
    return true;
  } catch (e) {
    toast("Could not copy to clipboard", "error");
    return false;
  }
}

/** Wire any [data-copy] button: value comes from data-copy (a selector) or data-copy-text. */
export function initCopyButtons(scope = document) {
  scope.querySelectorAll("[data-copy], [data-copy-text]").forEach((btn) => {
    if (btn.__copyWired) return;
    btn.__copyWired = true;
    btn.addEventListener("click", () => {
      let text = btn.getAttribute("data-copy-text");
      if (!text) {
        const sel = btn.getAttribute("data-copy");
        const target = sel && document.querySelector(sel);
        text = target ? target.value ?? target.textContent : "";
      }
      copyText(text || "", btn);
    });
  });
}

/** Accessible tabs. Container [data-tabs] with [role=tab][aria-controls] and [role=tabpanel]. */
export function initTabs(scope = document) {
  scope.querySelectorAll("[data-tabs]").forEach((group) => {
    const tabs = [...group.querySelectorAll('[role="tab"]')];
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const dir = e.key === "ArrowRight" ? 1 : -1;
          const next = tabs[(i + dir + tabs.length) % tabs.length];
          next.focus();
          select(next);
        }
      });
    });
  });
}

/** Dropzone: calls onFiles(FileList) on drop or click-to-pick. */
export function initDropzone(el, onFiles, { accept = "", multiple = false } = {}) {
  if (!el) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.multiple = multiple;
  input.className = "sr-only";
  el.appendChild(input);
  el.setAttribute("role", "button");
  el.tabIndex = 0;
  const open = () => input.click();
  el.addEventListener("click", (e) => {
    if (e.target !== input) open();
  });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });
  input.addEventListener("change", () => {
    if (input.files.length) onFiles(input.files);
    input.value = "";
  });
  ["dragenter", "dragover"].forEach((ev) =>
    el.addEventListener(ev, (e) => {
      e.preventDefault();
      el.classList.add("is-drag");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    el.addEventListener(ev, (e) => {
      e.preventDefault();
      if (ev === "dragleave" && el.contains(e.relatedTarget)) return;
      el.classList.remove("is-drag");
    })
  );
  el.addEventListener("drop", (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length) onFiles(files);
  });
}

/** Async button state: shows a spinner + disables while `fn` runs. */
export async function withPending(btn, fn) {
  if (!btn) return fn();
  btn.setAttribute("data-loading", "true");
  btn.disabled = true;
  try {
    return await fn();
  } finally {
    btn.removeAttribute("data-loading");
    btn.disabled = false;
  }
}

export function humanBytes(n) {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let u = -1;
  do {
    n /= 1024;
    u++;
  } while (n >= 1024 && u < units.length - 1);
  return `${n.toFixed(n < 10 ? 1 : 0)} ${units[u]}`;
}

/* ---------- saving a generated file ----------
 * The plain "click a hidden <a download>" trick is a desktop trick. On an
 * iPhone or iPad it fails in three different ways:
 *   - Safari on iOS honours `download` for a blob: URL, but every in-app
 *     browser (Instagram, Gmail, LinkedIn) quietly ignores it and the tap
 *     appears to do nothing.
 *   - The click happens after `await pdf.save()`, so the button's user
 *     activation has often expired by then and the click is dropped.
 *   - Revoking the object URL a second later can cut off a write that a phone
 *     has not finished, leaving a 0-byte file.
 * So: hand the file to the share sheet on iOS (that is where "Save to Files"
 * lives), fall back to the anchor, and keep a tappable link in a toast as the
 * last resort. Android and desktop keep the anchor path unchanged.
 */
const isIOS = () =>
  /iP(hone|od|ad)/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS reports itself as a Mac

function anchorSave(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // If `download` is not honoured, the file opens in its own tab (iOS renders a
  // PDF there with its own share button) instead of replacing the tool page.
  if (!("download" in a)) {
    a.target = "_blank";
    a.rel = "noopener";
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function download(filename, data, type = "application/octet-stream") {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  // Long-lived on purpose: the tab is the only thing holding the bytes, and a
  // slow phone may still be writing them. Dropped when the page goes away.
  const revoke = () => URL.revokeObjectURL(url);
  addEventListener("pagehide", revoke, { once: true });
  setTimeout(revoke, 120000);

  if (!isIOS()) return anchorSave(url, filename);

  const file = new File([blob], filename, { type: blob.type || type });
  const shareable = navigator.canShare && navigator.canShare({ files: [file] });
  const fallback = () => {
    anchorSave(url, filename);
    // Belt and braces: if the tap was dropped, this link is a fresh gesture.
    const safe = filename.replace(/[&<>"]/g, "");
    toast(`<a class="toast__link" href="${url}" download="${safe}">Tap to save ${safe}</a>`, "info", 12000);
  };

  if (!shareable) return fallback();
  navigator
    .share({ files: [file], title: filename })
    .catch((err) => {
      if (err && err.name === "AbortError") return; // the sheet was dismissed
      fallback();
    });
}

export const debounce = (fn, ms = 150) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

// Auto-wire the common bits + expose globally.
window.UI = { toast, copyText, initCopyButtons, initTabs, initDropzone, withPending, humanBytes, download, debounce };
initCopyButtons();
initTabs();
