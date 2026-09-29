// Ölçüm sonuçlarından müşteriye gönderilecek tek sayfalık rapor üretir: reports/index.html (+ ekran görüntüsü).
// Kullanım: node scripts/report.mjs
import fs from "node:fs";
import { chromium } from "playwright";

const S = JSON.parse(fs.readFileSync("reports/summary.json", "utf8"));
const L = JSON.parse(fs.readFileSync("reports/load-test.json", "utf8"));
const F = JSON.parse(fs.readFileSync("reports/filmstrip.json", "utf8"));
const I = JSON.parse(fs.readFileSync("reports/images.json", "utf8"));
const a = S.once.values, b = S.sonra.values;
const fmtMs = (v) => (v >= 1000 ? (v / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 }) + " sn" : v + " ms");
const ring = (score, label) => { const c = score >= 90 ? "#0c7d3e" : score >= 50 ? "#b86e00" : "#b3261e"; const r = 34, C = 2 * Math.PI * r; return `<div class="ring"><svg width="84" height="84" viewBox="0 0 84 84"><circle cx="42" cy="42" r="${r}" fill="none" stroke="#e8ecf0" stroke-width="8"/><circle cx="42" cy="42" r="${r}" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - score / 100)}" transform="rotate(-90 42 42)"/><text x="42" y="49" text-anchor="middle" font-size="22" font-weight="800" fill="${c}">${score}</text></svg><span>${label}</span></div>`; };
const cats = [["performance", "Performans"], ["accessibility", "Erişilebilirlik"], ["best-practices", "En iyi uyg."], ["seo", "SEO"]];
const vitals = [["LCP", "lcp", fmtMs, 2500], ["FCP", "fcp", fmtMs, 1800], ["TBT", "tbt", fmtMs, 200], ["CLS", "cls", (v) => String(v).replace(".", ","), 0.1], ["Sayfa ağırlığı", "bytes", (v) => (v >= 1024 ? (v / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 1 }) + " MB" : v + " KB"), 1600], ["İstek", "requests", String, 50]];
const pctDown = (x, y) => (x ? Math.round((1 - y / x) * 100) : 0);
const imgKB = I.reduce((s, r) => s + r.legacy, 0) / 1024, imgAfter = I.reduce((s, r) => s + r.avif800, 0) / 1024;
const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Marmara Lojistik — Performans Raporu</title>
<style>
@font-face{font-family:Inter;src:url(../after/assets/fonts/inter-400.woff2) format("woff2");font-weight:400}@font-face{font-family:Inter;src:url(../after/assets/fonts/inter-700.woff2) format("woff2");font-weight:700 800}
*{box-sizing:border-box;margin:0}body{font-family:Inter,system-ui,sans-serif;background:#f3f5f8;color:#1d2733;padding:32px}
.wrap{max-width:1200px;margin:0 auto}header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px}
h1{font-size:28px;letter-spacing:-.4px}h2{font-size:15px;text-transform:uppercase;letter-spacing:1px;color:#566272;margin:0 0 14px}
.muted{color:#566272;font-size:14px}.grid{display:grid;gap:16px}.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}.g6{grid-template-columns:repeat(6,1fr)}
.card{background:#fff;border:1px solid #e3e7ec;border-radius:14px;padding:20px}
.rings{display:flex;justify-content:space-between}.ring{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:13px;color:#566272}
.tag{display:inline-block;font-size:12px;font-weight:800;padding:3px 8px;border-radius:6px;margin-bottom:10px}.bad{background:#fde7e5;color:#b3261e}.good{background:#dcf3e5;color:#0c7d3e}
.vital b{display:block;font-size:13px;color:#566272;font-weight:700}.vital .v{font-size:22px;font-weight:800;margin-top:4px}.vital .from{font-size:13px;color:#8a95a3;text-decoration:line-through}.vital .d{font-size:13px;font-weight:800;color:#0c7d3e}
table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:8px 6px;border-bottom:1px solid #eef1f4;text-align:right}td:first-child,th:first-child{text-align:left}th{color:#566272;font-weight:700;font-size:13px}
.film img{width:100%;border-radius:10px;border:1px solid #e3e7ec}
ul{padding-left:18px;font-size:14px;line-height:1.7}
</style></head><body><div class="wrap">
<header><div><div class="muted">Marmara Lojistik · marmaralojistik.example</div><h1>Hız ve SEO iyileştirmesi — önce / sonra</h1></div><div class="muted" style="text-align:right">Lighthouse ${S.sonra.lighthouse} · mobil · ${S.sonra.runs} çalıştırma medyanı<br>${new Date(S.sonra.fetchTime).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</div></header>
<div class="grid g2">
  <div class="card"><span class="tag bad">ÖNCE</span><div class="rings">${cats.map(([k, l]) => ring(a[k], l)).join("")}</div></div>
  <div class="card"><span class="tag good">SONRA</span><div class="rings">${cats.map(([k, l]) => ring(b[k], l)).join("")}</div></div>
</div>
<div class="grid g6" style="margin-top:16px">${vitals.map(([l, k, f]) => `<div class="card vital"><b>${l}</b><div class="v">${f(b[k])}</div><span class="from">${f(a[k])}</span> <span class="d">−%${pctDown(a[k], b[k])}</span></div>`).join("")}</div>
<div class="card film" style="margin-top:16px"><h2>Yükleme film şeridi · yavaş 4G (${F.network}) + ${F.cpu} CPU</h2><img src="filmstrip.png" alt="Önce ve sonra sürümlerinin yüklenme anları"></div>
<div class="grid g3" style="margin-top:16px">
  <div class="card"><h2>Yük testi (${L.sonra.concurrency} eşzamanlı)</h2><table><tr><th></th><th>Önce</th><th>Sonra</th></tr><tr><td>Sayfa / sn</td><td>${L.once.pageViewsPerSec}</td><td><b>${L.sonra.pageViewsPerSec}</b></td></tr><tr><td>p95 süre</td><td>${L.once.p95ms} ms</td><td><b>${L.sonra.p95ms} ms</b></td></tr><tr><td>Ziyaret başına</td><td>${L.once.kbPerView} KB</td><td><b>${L.sonra.kbPerView} KB</b></td></tr><tr><td>100 bin ziyaret</td><td>${L.once.gbPer100kViews} GB</td><td><b>${L.sonra.gbPer100kViews} GB</b></td></tr></table></div>
  <div class="card"><h2>Görseller</h2><table><tr><th></th><th>Eski JPEG</th><th>AVIF 800</th></tr>${I.map((r) => `<tr><td>${r.name}</td><td>${Math.round(r.legacy / 1024)} KB</td><td><b>${Math.round(r.avif800 / 1024)} KB</b></td></tr>`).join("")}<tr><td><b>Toplam</b></td><td>${Math.round(imgKB)} KB</td><td><b>${Math.round(imgAfter)} KB</b></td></tr></table></div>
  <div class="card"><h2>Yapılanlar</h2><ul><li>Slider kaldırıldı; hero &lt;picture&gt; + AVIF/WebP, preload</li><li>1,2 MB bloklayan CSS/JS → 5 KB satır içi kritik CSS, 0,5 KB defer JS</li><li>TTF → woff2 (latin-ext), font-display: swap</li><li>Çerez/kampanya bandı için yer ayrıldı (CLS 0)</li><li>Brotli, 1 yıllık önbellek, güvenlik başlıkları</li><li>Meta açıklama, canonical, JSON-LD, sitemap</li><li>Performans bütçesi CI kontrolü</li></ul></div>
</div>
<p class="muted" style="margin-top:16px">"Önce" sürümü, tipik bir 2018 WordPress kurumsal temasının yeniden üretimidir (aynı içerik). Tüm sayılar bu depodaki betiklerle ölçülmüştür: npm run audit · npm run load · npm run filmstrip.</p>
</div></body></html>`;
fs.writeFileSync("reports/index.html", html);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
await page.goto("file://" + process.cwd() + "/reports/index.html"); await page.waitForTimeout(500);
await page.screenshot({ path: "screenshots/rapor.png", fullPage: true });
await page.screenshot({ path: "screenshots/rapor-ust.png" });
await browser.close();
console.log("reports/index.html + screenshots/rapor.png");
