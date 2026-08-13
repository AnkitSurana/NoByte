/**
 * Zero-dependency dev server for dist/.
 * Serves clean URLs (folder/index.html), correct MIME types, and the
 * 404 page for unknown paths. Run: node serve.mjs [port]
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const PORT = Number(process.argv[2]) || Number(process.env.PORT) || 4321;
const HOST = "127.0.0.1"; // explicit, so a port clash errors instead of being shadowed
const DIST = "dist";
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon",
  ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".wasm": "application/wasm",
  ".zip": "application/zip", ".pdf": "application/pdf",
};

async function resolveFile(urlPath) {
  // normalize() blocks ../ traversal out of dist/
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  const fp = join(DIST, clean);
  try {
    if ((await stat(fp)).isDirectory()) return join(fp, "index.html");
    return fp;
  } catch {
    if (!extname(fp)) return join(DIST, clean, "index.html");
    throw new Error("not found");
  }
}

const app = createServer(async (req, res) => {
  try {
    const fp = await resolveFile(req.url);
    const body = await readFile(fp);
    res.writeHead(200, { "content-type": TYPES[extname(fp)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch {
    try {
      const body = await readFile(join(DIST, "404.html"));
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("404 Not Found");
    }
  }
});

app.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`\n  Port ${PORT} is already in use. Try:  npm run serve -- <port>\n`);
    process.exit(1);
  }
  throw e;
});

app.listen(PORT, HOST, () => {
  console.log(`\n  NoByte  →  http://${HOST}:${PORT}\n`);
});
