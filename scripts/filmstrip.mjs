// Yükleme film şeridi: gerçek tarayıcıda ağ (yavaş 4G: 1,6 Mbps / 150 ms RTT) ve CPU (4×) kısıtlaması uygulanarak
// iki site aynı anda açılır, sabit zamanlarda ekran görüntüsü alınır ve tek bir karşılaştırma görseli üretilir.
// Ayrıca her sitenin tam yüklenmiş mobil ekran görüntüleri alınır.
// Kullanım: node scripts/filmstrip.mjs  →  reports/filmstrip.png, screenshots/*.png
import { chromium, devices } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import sharp from "sharp";

const TIMES = [500, 1000, 2000, 3000, 5000, 8000, 12000];
const SITES = [{ key: "once", dir: "before", port: 8095, mode: "legacy", label: "Önce" }, { key: "sonra", dir: "after", port: 8096, mode: "tuned", label: "Sonra" }];
const servers = SITES.map((s) => spawn("node", ["scripts/serve.mjs", s.dir, String(s.port), s.mode], { stdio: "ignore" }));
await new Promise((r) => setTimeout(r, 800));
fs.mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const frames = {}; const timings = {};
try {
  for (const s of SITES) {
    const ctx = await browser.newContext({ ...devices["Pixel 7"], locale: "tr-TR" });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    // Ekran kaydı (CDP screencast): boyanan her kare zaman damgasıyla gelir; sabit anlarda o ana kadarki son kare seçilir.
    const shots = [];
    cdp.on("Page.screencastFrame", async (f) => { shots.push({ ts: f.metadata.timestamp * 1000, data: Buffer.from(f.data, "base64") }); await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
    await page.goto("about:blank");
    await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1, maxWidth: 412, maxHeight: 915 });
    const t0 = Date.now();
    const nav = page.goto(`http://localhost:${s.port}/`, { waitUntil: "load", timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(TIMES.at(-1) + 300);
    await cdp.send("Page.stopScreencast");
    const blank = await sharp({ create: { width: 412, height: 915, channels: 3, background: "#ffffff" } }).png().toBuffer();
    frames[s.key] = TIMES.map((t) => { const cand = shots.filter((x) => x.ts - t0 <= t); return cand.length ? cand.at(-1).data : blank; });
    await nav; const nt = await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; const lcp = performance.getEntriesByType("largest-contentful-paint"); return { load: Math.round(n.loadEventEnd), dcl: Math.round(n.domContentLoadedEventEnd) }; });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await page.waitForTimeout(1500);
    // Popup/çerez bandı vb. dahil, kullanıcının gördüğü hâli
    await page.screenshot({ path: `screenshots/${s.key}-mobil.png` });
    await page.screenshot({ path: `screenshots/${s.key}-mobil-tam.png`, fullPage: true });
    console.log(`${s.key}: DOMContentLoaded ${nt.dcl} ms · load ${nt.load} ms (yavaş 4G + 4× CPU)`); timings[s.key] = nt;
    await ctx.close();
  }
  // Masaüstü görünüm (kısıtlamasız)
  for (const s of SITES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "tr-TR" });
    const page = await ctx.newPage(); await page.goto(`http://localhost:${s.port}/`, { waitUntil: "load" }); await page.waitForTimeout(1600);
    await page.screenshot({ path: `screenshots/${s.key}-masaustu.png` }); await ctx.close();
  }
} finally { await browser.close(); servers.forEach((p) => p.kill()); }

// Karşılaştırma görseli
const TW = 180, TH = 390, PAD = 14, LABEL = 110, HEAD = 40;
const W = LABEL + TIMES.length * (TW + PAD) + PAD, H = HEAD + SITES.length * (TH + PAD) + PAD;
const comps = [];
const svgText = (x, y, t, size = 18, weight = 700, fill = "#0b2a45", anchor = "start") => `<text x="${x}" y="${y}" font-family="Inter, Arial" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${t}</text>`;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#f5f7fa"/>`;
TIMES.forEach((t, i) => (svg += svgText(LABEL + i * (TW + PAD) + TW / 2, 28, `${(t / 1000).toLocaleString("tr-TR")} sn`, 16, 700, "#566272", "middle")));
for (const [ri, s] of SITES.entries()) {
  const y = HEAD + ri * (TH + PAD);
  svg += svgText(PAD, y + TH / 2, s.label, 22, 800, ri ? "#1a7f45" : "#b3261e");
  for (const [ci, buf] of frames[s.key].entries()) {
    const x = LABEL + ci * (TW + PAD);
    svg += `<rect x="${x - 1}" y="${y - 1}" width="${TW + 2}" height="${TH + 2}" fill="#d0d7de"/>`;
    if (buf) comps.push({ input: await sharp(buf).resize(TW, TH, { fit: "cover", position: "top" }).png().toBuffer(), left: x, top: y });
  }
}
svg += "</svg>";
await sharp(Buffer.from(svg)).composite(comps).png().toFile("reports/filmstrip.png");
fs.writeFileSync("reports/filmstrip.json", JSON.stringify({ network: "1,6 Mbps / 150 ms RTT", cpu: "4×", times: TIMES, timings }, null, 2) + "\n");
console.log("reports/filmstrip.png yazıldı");
