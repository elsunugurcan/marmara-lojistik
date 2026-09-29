// Performans regresyon kontrolü: (1) 'sonra' HTML'inde statik kurallar, (2) dosya ağırlık bütçesi, (3) son Lighthouse ölçümü bütçede mi.
// Kullanım: node scripts/check.mjs   (hata varsa çıkış kodu 1)
import fs from "node:fs";
import path from "node:path";
const budget = JSON.parse(fs.readFileSync("budget.json", "utf8"));
const SITE = process.env.SITE ?? "after"; // SITE=before ile eski sitenin kaç kuralı çiğnediği görülebilir
const html = fs.readFileSync(`${SITE}/index.html`, "utf8");
const fails = [], passes = [];
const check = (ok, msg) => (ok ? passes : fails).push(msg);
const kb = (f) => fs.statSync(f).size / 1024;

// 1) Statik kurallar
const head = html.slice(0, html.indexOf("</head>"));
check(!/<script(?![^>]*(defer|async|type="application\/ld\+json"))[^>]*src=/i.test(html), "senkron (bloklayan) harici script yok");
check(!/<link[^>]+rel="stylesheet"/i.test(head), "bloklayan harici stil dosyası yok (kritik CSS satır içi)");
const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
check(imgs.every((i) => /\bwidth="\d+"/.test(i) && /\bheight="\d+"/.test(i)), `tüm görsellerde width/height var (${imgs.length} görsel, CLS önlemi)`);
check(imgs.every((i) => /\balt="[^"]+"/.test(i)), "tüm görsellerde anlamlı alt metni var");
check(imgs.filter((i) => /fetchpriority="high"/.test(i)).length === 1 && imgs.slice(1).every((i) => /loading="lazy"/.test(i)), "yalnızca hero öncelikli, diğer görseller lazy");
check(/<link rel="preload" as="image"[^>]+hero/.test(head), "LCP görseli preload ediliyor");
check(/font-display:swap/.test(html), "font-display: swap");
check(/<meta name="description" content=".{70,160}"/.test(head) && /<link rel="canonical"/.test(head) && /application\/ld\+json/.test(head), "SEO: açıklama (70–160 kr.), canonical, yapılandırılmış veri");
check(/<html lang="tr">/.test(html), "sayfa dili tanımlı");
for (const m of html.matchAll(/(?:src|href|srcset)="([^"#:]+?)"/g)) for (const ref of m[1].split(",").map((s) => s.trim().split(" ")[0])) if (ref && !ref.startsWith("/") && !fs.existsSync(path.join(SITE, ref))) fails.push(`kırık bağlantı: ${ref}`);
check(fs.existsSync("after/robots.txt") && fs.existsSync("after/sitemap.xml") && fs.existsSync("after/favicon.svg"), "robots.txt, sitemap.xml, favicon mevcut");

// 2) Ağırlık bütçesi (sıkıştırmasız dosya boyutları; hero: 800w AVIF)
const w = budget.weights;
check(kb("after/index.html") <= w.htmlKB, `HTML ${kb("after/index.html").toFixed(1)} KB ≤ ${w.htmlKB} KB`);
check(kb("after/assets/js/site.js") <= w.jsKB, `JS ${kb("after/assets/js/site.js").toFixed(1)} KB ≤ ${w.jsKB} KB`);
const fonts = fs.readdirSync("after/assets/fonts").filter((f) => f.endsWith(".woff2")).reduce((s, f) => s + kb(`after/assets/fonts/${f}`), 0);
check(fonts <= w.fontsKB, `fontlar ${fonts.toFixed(0)} KB ≤ ${w.fontsKB} KB`);
check(kb("after/assets/img/hero-otoyol-800.avif") <= w.heroImageKB, `hero (800w AVIF) ${kb("after/assets/img/hero-otoyol-800.avif").toFixed(0)} KB ≤ ${w.heroImageKB} KB`);

// 3) Son Lighthouse ölçümü
if (fs.existsSync("reports/summary.json")) {
  const v = JSON.parse(fs.readFileSync("reports/summary.json", "utf8")).sonra.values;
  for (const [k, min] of Object.entries(budget.lighthouse)) check(v[k] >= min, `Lighthouse ${k} ${v[k]} ≥ ${min}`);
  for (const [k, max] of Object.entries(budget.metrics)) check(v[k] <= max, `${k.toUpperCase()} ${v[k]} ≤ ${max}`);
  check(v.bytes <= w.totalKB, `toplam aktarım ${v.bytes} KB ≤ ${w.totalKB} KB`);
  check(v.requests <= w.requests, `istek sayısı ${v.requests} ≤ ${w.requests}`);
} else fails.push("reports/summary.json yok — önce npm run audit");

for (const p of passes) console.log("✓", p);
for (const f of fails) console.log("✗", f);
console.log(`\n${passes.length} geçti, ${fails.length} başarısız`);
process.exit(fails.length ? 1 : 0);
