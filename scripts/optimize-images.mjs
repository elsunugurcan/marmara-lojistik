// Görsel hattı: kaynak görselleri AVIF + WebP + JPEG yedek olarak 4 genişlikte üretir.
// Kullanım: node scripts/optimize-images.mjs  →  after/assets/img/<ad>-<genişlik>.<avif|webp|jpg>
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = "src-images", OUT = "after/assets/img";
const WIDTHS = [480, 800, 1200, 1600];
fs.mkdirSync(OUT, { recursive: true });

const rows = [];
for (const file of fs.readdirSync(SRC).filter((f) => /\.(png|jpe?g)$/i.test(f))) {
  const name = path.parse(file).name;
  const input = sharp(path.join(SRC, file));
  const { width: srcW } = await input.metadata();
  const legacy = fs.statSync(`before/wp-content/uploads/2018/03/${name}.jpg`).size;
  for (const w of WIDTHS.filter((w) => w <= srcW)) {
    const base = input.clone().resize({ width: w, withoutEnlargement: true });
    await base.clone().avif({ quality: 50, effort: 6 }).toFile(`${OUT}/${name}-${w}.avif`);
    await base.clone().webp({ quality: 72, effort: 6 }).toFile(`${OUT}/${name}-${w}.webp`);
    await base.clone().jpeg({ quality: 76, mozjpeg: true, progressive: true }).toFile(`${OUT}/${name}-${w}.jpg`);
  }
  const size = (ext, w) => fs.statSync(`${OUT}/${name}-${w}.${ext}`).size;
  rows.push({ name, legacy, avif800: size("avif", 800), webp800: size("webp", 800), jpg800: size("jpg", 800), avif1600: size("avif", 1600) });
}
const kb = (b) => (b / 1024).toFixed(0).padStart(6) + " KB";
console.log("görsel".padEnd(18), "eski JPEG".padStart(9), "AVIF 800".padStart(9), "WebP 800".padStart(9), "JPEG 800".padStart(9), "AVIF 1600".padStart(10));
for (const r of rows) console.log(r.name.padEnd(18), kb(r.legacy), kb(r.avif800), kb(r.webp800), kb(r.jpg800), kb(r.avif1600));
fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/images.json", JSON.stringify(rows, null, 2) + "\n");
