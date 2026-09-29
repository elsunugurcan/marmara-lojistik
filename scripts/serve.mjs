// Statik sunucu, iki profil:
//   legacy : sıkıştırma yok, önbellek başlığı yok, güvenlik başlığı yok (eski paylaşımlı hosting)
//   tuned  : Brotli/gzip, değişmez varlıklara 1 yıl önbellek, HTML'e no-cache, güvenlik başlıkları
// Kullanım: node scripts/serve.mjs <klasör> <port> <legacy|tuned>
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [dir = "after", port = "8081", mode = "tuned"] = process.argv.slice(2);
const root = path.resolve(dir);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".png": "image/png", ".woff2": "font/woff2", ".ttf": "font/ttf", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };
const COMPRESSIBLE = new Set([".html", ".css", ".js", ".json", ".svg", ".txt", ".xml", ".ttf"]);
const cache = new Map(); // sıkıştırılmış çıktı önbelleği

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(root, p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Bulunamadı"); }
  const ext = path.extname(file); const headers = { "Content-Type": TYPES[ext] ?? "application/octet-stream" };
  let body = fs.readFileSync(file);
  if (mode === "tuned") {
    headers["Cache-Control"] = ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable";
    headers["X-Content-Type-Options"] = "nosniff";
    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
    headers["X-Frame-Options"] = "DENY";
    headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
    const ae = String(req.headers["accept-encoding"] ?? "");
    if (COMPRESSIBLE.has(ext)) {
      const enc = ae.includes("br") ? "br" : ae.includes("gzip") ? "gzip" : null;
      if (enc) { const key = enc + file; if (!cache.has(key)) cache.set(key, enc === "br" ? zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }) : zlib.gzipSync(body, { level: 9 })); body = cache.get(key); headers["Content-Encoding"] = enc; headers["Vary"] = "Accept-Encoding"; }
    }
  }
  headers["Content-Length"] = body.length;
  res.writeHead(200, headers); res.end(req.method === "HEAD" ? undefined : body);
}).listen(Number(port), () => console.log(`${dir} (${mode}) → http://localhost:${port}`));
