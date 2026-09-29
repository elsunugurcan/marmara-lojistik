// Önce/sonra ölçümü: iki siteyi ayrı sunucu profilleriyle ayağa kaldırır, Lighthouse'u (mobil, simüle 4G, 4× CPU)
// her biri için N kez çalıştırır, medyanı alır ve reports/ altına JSON + HTML rapor + özet tablo yazar.
// Kullanım: node scripts/audit.mjs [tekrar=3]
import { spawn } from "node:child_process";
import fs from "node:fs";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const RUNS = Number(process.argv[2] ?? 3);
const CHROME = process.env.CHROME_PATH; // boşsa chrome-launcher sistemdeki Chrome u bulur
const SITES = [{ key: "once", dir: "before", port: 8091, mode: "legacy", label: "Önce (eski WordPress teması)" }, { key: "sonra", dir: "after", port: 8092, mode: "tuned", label: "Sonra (optimize)" }];
const METRICS = [["performance", "Performans", (l) => Math.round(l.categories.performance.score * 100)], ["accessibility", "Erişilebilirlik", (l) => Math.round(l.categories.accessibility.score * 100)], ["best-practices", "En iyi uygulamalar", (l) => Math.round(l.categories["best-practices"].score * 100)], ["seo", "SEO", (l) => Math.round(l.categories.seo.score * 100)],
  ["fcp", "First Contentful Paint (ms)", (l) => Math.round(l.audits["first-contentful-paint"].numericValue)], ["lcp", "Largest Contentful Paint (ms)", (l) => Math.round(l.audits["largest-contentful-paint"].numericValue)], ["tbt", "Total Blocking Time (ms)", (l) => Math.round(l.audits["total-blocking-time"].numericValue)], ["cls", "Cumulative Layout Shift", (l) => +l.audits["cumulative-layout-shift"].numericValue.toFixed(3)], ["si", "Speed Index (ms)", (l) => Math.round(l.audits["speed-index"].numericValue)],
  ["bytes", "Aktarılan toplam (KB)", (l) => Math.round(l.audits["total-byte-weight"].numericValue / 1024)], ["requests", "İstek sayısı", (l) => l.audits["network-requests"].details.items.length]];
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

const servers = SITES.map((s) => spawn("node", ["scripts/serve.mjs", s.dir, String(s.port), s.mode], { stdio: "ignore" }));
await new Promise((r) => setTimeout(r, 800));
fs.mkdirSync("reports", { recursive: true });
const results = {};
try {
  for (const s of SITES) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const chrome = await chromeLauncher.launch({ chromePath: CHROME, chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"] });
      try {
        const r = await lighthouse(`http://localhost:${s.port}/`, { port: chrome.port, output: ["json", "html"], logLevel: "error" }, { extends: "lighthouse:default", settings: { formFactor: "mobile", throttlingMethod: "simulate", onlyCategories: ["performance", "accessibility", "best-practices", "seo"] } });
        const lhr = r.lhr; runs.push({ lhr, html: r.report[1] });
        process.stdout.write(`${s.key} #${i + 1}: perf ${Math.round(lhr.categories.performance.score * 100)}, LCP ${Math.round(lhr.audits["largest-contentful-paint"].numericValue)} ms\n`);
      } finally { await chrome.kill(); }
    }
    const values = Object.fromEntries(METRICS.map(([k, , f]) => [k, median(runs.map((r) => f(r.lhr)))]));
    const medianRun = runs.find((r) => METRICS.find((m) => m[0] === "performance")[2](r.lhr) === values.performance) ?? runs[0];
    fs.writeFileSync(`reports/lighthouse-${s.key}.html`, medianRun.html);
    fs.writeFileSync(`reports/lighthouse-${s.key}.json`, JSON.stringify(medianRun.lhr));
    const opp = Object.values(medianRun.lhr.audits).filter((a) => a.details?.type === "opportunity" && (a.numericValue ?? 0) > 50).sort((a, b) => b.numericValue - a.numericValue).slice(0, 8).map((a) => ({ id: a.id, title: a.title, savingsMs: Math.round(a.numericValue) }));
    results[s.key] = { label: s.label, runs: RUNS, values, opportunities: opp, lighthouse: medianRun.lhr.lighthouseVersion, fetchTime: medianRun.lhr.fetchTime };
  }
} finally { servers.forEach((p) => p.kill()); }

fs.writeFileSync("reports/summary.json", JSON.stringify(results, null, 2) + "\n");
const lowerBetter = new Set(["fcp", "lcp", "tbt", "cls", "si", "bytes", "requests"]);
let md = `# Önce / sonra ölçümü\n\nLighthouse ${results.sonra.lighthouse} · mobil (Moto G Power, simüle 4G, 4× CPU yavaşlatma) · her site ${RUNS} çalıştırma, medyan · ${new Date().toISOString().slice(0, 10)}\n\n| Metrik | Önce | Sonra | Değişim |\n|---|---:|---:|---:|\n`;
for (const [k, label] of METRICS) { const a = results.once.values[k], b = results.sonra.values[k]; const ch = a === 0 ? "—" : lowerBetter.has(k) ? `${b <= a ? "−" : "+"}%${Math.abs(Math.round(((b - a) / a) * 100))}` : `${b - a >= 0 ? "+" : ""}${b - a} puan`; md += `| ${label} | ${a} | ${b} | ${ch} |\n`; }
md += `\n## Önce: en büyük fırsatlar (Lighthouse)\n\n${results.once.opportunities.map((o) => `- ${o.title} — ~${o.savingsMs} ms`).join("\n")}\n\nTam raporlar: \`reports/lighthouse-once.html\`, \`reports/lighthouse-sonra.html\`.\n`;
fs.writeFileSync("reports/SONUCLAR.md", md);
console.log("\n" + md);
