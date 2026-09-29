# Önce / sonra ölçümü

Lighthouse 13.5.0 · mobil (Moto G Power, simüle 4G, 4× CPU yavaşlatma) · her site 3 çalıştırma, medyan · 2026-09-28

| Metrik | Önce | Sonra | Değişim |
|---|---:|---:|---:|
| Performans | 22 | 100 | +78 puan |
| Erişilebilirlik | 89 | 100 | +11 puan |
| En iyi uygulamalar | 96 | 100 | +4 puan |
| SEO | 91 | 100 | +9 puan |
| First Contentful Paint (ms) | 7211 | 906 | −%87 |
| Largest Contentful Paint (ms) | 22071 | 1505 | −%93 |
| Total Blocking Time (ms) | 2365 | 0 | −%100 |
| Cumulative Layout Shift | 0.178 | 0 | −%100 |
| Speed Index (ms) | 7211 | 906 | −%87 |
| Aktarılan toplam (KB) | 3722 | 115 | −%97 |
| İstek sayısı | 20 | 7 | −%65 |

## Önce: en büyük fırsatlar (Lighthouse)

- Reduce unused CSS — ~4660 ms
- Reduce unused JavaScript — ~2270 ms

Tam raporlar: `reports/lighthouse-once.html`, `reports/lighthouse-sonra.html`.

## Yük testi (yerel sunucu, 25 eşzamanlı ziyaretçi, 15 sn, önbelleksiz ilk ziyaret)

| | Önce | Sonra |
|---|---:|---:|
| Sayfa görüntüleme / sn | 220.1 | 2217.5 |
| Sayfa yükleme p50 (ms) | 108 | 9 |
| Sayfa yükleme p95 (ms) | 156 | 24 |
| Ziyaret başına veri (KB) | 3719 | 111 |
| 100.000 ziyarette trafik (GB) | 354.6 | 10.6 |
| Ziyaret başına 404 | 1 (/favicon.ico) | 0 (—) |
| Sunucu hatası | 0 | 0 |

Not: Aynı makinede, ağ gecikmesi olmadan ölçülür; mutlak değerler değil, iki sürüm arasındaki oran anlamlıdır.
