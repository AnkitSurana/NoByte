/**
 * Thin request handler in front of the static assets.
 *
 * Cloudflare's built-in HTML handling (assets.html_handling, default
 * "auto-trailing-slash") redirects any request to its canonical
 * path/index-file form. That redirect is built from `url.pathname` alone,
 * so a query string on the original request (?utm_source=..., ?gclid=...)
 * is silently dropped before the page — and therefore analytics — ever
 * sees it.
 *
 * For requests that already target a canonical path and only carry a
 * query string, we serve the asset directly instead of letting the
 * platform redirect: fetch the asset for the query-less URL, but return
 * that response as-is for the original request. The browser's address
 * bar (and window.location.search) never changes, so the query string
 * survives.
 *
 * Everything else (no query string, or a genuinely non-canonical path)
 * falls straight through to the normal asset-serving behaviour.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.search) {
      const canonical = new URL(url.pathname, url.origin);
      const assetResponse = await env.ASSETS.fetch(new Request(canonical, request));

      // If the path itself wasn't canonical either, ASSETS.fetch will still
      // return its own redirect (to fix the path) — let that through
      // normally rather than pretending it was a 200.
      return assetResponse;
    }

    return env.ASSETS.fetch(request);
  },
};