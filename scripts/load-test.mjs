// Yük testi: N eşzamanlı "ziyaretçi" sayfayı ve Lighthouse'un kaydettiği tüm alt kaynakları (ilk ziyaret, önbelleksiz)
// süre boyunca tekrar tekrar indirir. Sunucu başına: sayfa görüntüleme/sn, p50/p95 sayfa süresi, ziyaret başına aktarılan veri.
// Kullanım: node scripts/load-test.mjs [eşzamanlılık=25] [süre sn=15]
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";

const CONC = Number(process.argv[2] ?? 25), DUR = Number(process.argv[3] ?? 15) * 1000;
const SITES = [{ key: "once", dir: "before", port: 8093, mode: "legacy" }, { key: "sonra", dir: "after", port: 8094, mode: "tuned" }];
const agent = new http.Agent({ keepAlive: true, maxSockets: CONC * 6 });
const get = (port, path) => new Promise((res, rej) => { const r = http.get({ host: "127.0.0.1", port, path, agent, headers: { "Accept-Encoding": "br, gzip", Accept: "image/avif,image/webp,*/*" } }, (resp) => { let n = 0; resp.on("data", (c) => (n += c.length)); resp.on("end", () => res({ status: resp.statusCode, bytes: n })); }); r.on("error", rej); });
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };

function resourcesFor(key, port) {
  const lhr = JSON.parse(fs.readFileSync(`reports/lighthouse-${key}.json`, "utf8"));
  return [...new Set(lhr.audits["network-requests"].details.items.map((i) => i.url).filter((u) => u.startsWith(`http://localhost:`)).map((u) => new URL(u).pathname))];
}
const out = {};
const servers = SITES.map((s) => spawn("node", ["scripts/serve.mjs", s.dir, String(s.port), s.mode], { stdio: "ignore" }));
await new Promise((r) => setTimeout(r, 800));
try {
  for (const s of SITES) {
    const lhKey = s.key; const paths = resourcesFor(lhKey, s.port);
    const times = []; let bytes = 0, views = 0, errors = 0; const notFound = new Set(); let n404 = 0; const end = Date.now() + DUR;
    const visitor = async () => { while (Date.now() < end) { const t = performance.now(); try { const [html, ...rest] = await Promise.all(paths.map((p) => get(s.port, p))); [html, ...rest].forEach((r, i) => { bytes += r.bytes; if (r.status === 404) { n404++; notFound.add(paths[i]); } else if (r.status !== 200) errors++; }); views++; times.push(performance.now() - t); } catch { errors++; } } };
    await Promise.all(Array.from({ length: CONC }, visitor));
    out[s.key] = { concurrency: CONC, durationSec: DUR / 1000, resources: paths.length, pageViewsPerSec: +(views / (DUR / 1000)).toFixed(1), p50ms: Math.round(pct(times, 50)), p95ms: Math.round(pct(times, 95)), kbPerView: Math.round(bytes / views / 1024), gbPer100kViews: +((bytes / views) * 100_000 / 1024 ** 3).toFixed(1), notFoundPerView: +(n404 / views).toFixed(2), notFound: [...notFound], errors };
    console.log(s.key.padEnd(6), JSON.stringify(out[s.key]));
  }
} finally { servers.forEach((p) => p.kill()); agent.destroy(); }
fs.writeFileSync("reports/load-test.json", JSON.stringify(out, null, 2) + "\n");
const md = `\n## Yük testi (yerel sunucu, ${CONC} eşzamanlı ziyaretçi, ${DUR / 1000} sn, önbelleksiz ilk ziyaret)\n\n| | Önce | Sonra |\n|---|---:|---:|\n| Sayfa görüntüleme / sn | ${out.once.pageViewsPerSec} | ${out.sonra.pageViewsPerSec} |\n| Sayfa yükleme p50 (ms) | ${out.once.p50ms} | ${out.sonra.p50ms} |\n| Sayfa yükleme p95 (ms) | ${out.once.p95ms} | ${out.sonra.p95ms} |\n| Ziyaret başına veri (KB) | ${out.once.kbPerView} | ${out.sonra.kbPerView} |\n| 100.000 ziyarette trafik (GB) | ${out.once.gbPer100kViews} | ${out.sonra.gbPer100kViews} |\n| Ziyaret başına 404 | ${out.once.notFoundPerView} (${out.once.notFound.join(", ") || "—"}) | ${out.sonra.notFoundPerView} (${out.sonra.notFound.join(", ") || "—"}) |\n| Sunucu hatası | ${out.once.errors} | ${out.sonra.errors} |\n\nNot: Aynı makinede, ağ gecikmesi olmadan ölçülür; mutlak değerler değil, iki sürüm arasındaki oran anlamlıdır.\n`;
const file = "reports/SONUCLAR.md"; const cur = fs.readFileSync(file, "utf8").replace(/\n## Yük testi[\s\S]*$/, "\n"); fs.writeFileSync(file, cur.trimEnd() + "\n" + md);
console.log(md);
