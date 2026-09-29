// "Önce" sitesinin eklenti/tema ağırlığını yeniden üretir (bootstrap, font-awesome, revslider, jquery vb. boyutunda dosyalar).
// Gerçek üçüncü taraf kütüphaneler depoya konmaz; boyut ve davranış (bloklayan yükleme, kullanılmayan kurallar) eşdeğerdir.
import fs from "node:fs";
const T = "before/wp-content/themes/marmara", P = "before/wp-content/plugins";
const css = (name, rules, prefix) => { let out = `/* ${name} — legacy bundle */\n`; for (let i = 0; i < rules; i++) out += `.${prefix}-${i}{display:block;position:relative;margin:${i % 7}px ${i % 5}px;padding:${i % 9}px;color:#${((i * 9973) % 0xffffff).toString(16).padStart(6, "0")};border:1px solid rgba(0,0,0,.${i % 9});box-sizing:border-box;transition:all .3s ease}\n.${prefix}-${i}:hover{opacity:.9;transform:translateY(-1px)}\n`; return out; };
const js = (name, fns) => { let out = `/* ${name} */\n(function(w,d){\n`; for (let i = 0; i < fns; i++) out += `function f${i}(a,b){var c=a||${i},e=b||[];for(var k=0;k<3;k++){e.push((c*${i + 1}+k)%97)}return e.reduce(function(s,v){return s+v},0)}\n`; out += `w.__legacy_${name.replace(/\W/g, "")}=[${Array.from({ length: fns }, (_, i) => "f" + i).join(",")}];\n})(window,document);\n`; return out; };
fs.writeFileSync(`${T}/css/style.css`, `@import url("bootstrap.css");\n@import url("font-awesome.css");\n` + fs.readFileSync(`${T}/css/_base.css`, "utf8") + css("theme", 1300, "mt"));
fs.writeFileSync(`${T}/css/bootstrap.css`, css("bootstrap 3.3.7 (full)", 800, "bs"));
fs.writeFileSync(`${T}/css/font-awesome.css`, css("font-awesome 4.7", 400, "fa"));
fs.writeFileSync(`${P}/revslider.css`, css("revslider", 700, "rev"));
fs.writeFileSync(`${P}/contact-form-7.css`, css("cf7", 300, "wpcf7"));
fs.writeFileSync(`${P}/wp-block-library.css`, css("block-library", 500, "wp-block"));
fs.writeFileSync(`${T}/js/jquery.js`, js("jquery 1.12.4", 700));
fs.writeFileSync(`${T}/js/jquery-migrate.js`, js("jquery-migrate", 200));
fs.writeFileSync(`${P}/revslider.js`, js("revslider 5.4", 900));
fs.writeFileSync(`${T}/js/theme.js`, js("theme", 450) + fs.readFileSync(`${T}/js/_main.js`, "utf8"));
fs.writeFileSync(`${P}/wp-emoji-release.js`, js("wp-emoji", 250));
let total = 0;
for (const f of [`${T}/css/style.css`, `${T}/css/bootstrap.css`, `${T}/css/font-awesome.css`, `${P}/revslider.css`, `${P}/contact-form-7.css`, `${P}/wp-block-library.css`, `${T}/js/jquery.js`, `${T}/js/jquery-migrate.js`, `${P}/revslider.js`, `${T}/js/theme.js`, `${P}/wp-emoji-release.js`]) { const kb = fs.statSync(f).size / 1024; total += kb; console.log(f.padEnd(52), Math.round(kb) + " KB"); }
console.log("toplam CSS+JS:", Math.round(total), "KB");
