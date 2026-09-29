/* tema ana betiği (2018) — slider, çerez çubuğu, popup, sayaçlar */
(function () {
  // Ana iş parçacığını bloklayan "başlangıç" hesabı (eski analytics/eklenti davranışı)
  var t0 = Date.now(), acc = 0;
  while (Date.now() - t0 < 600) { acc += Math.sqrt(acc + 1); }
  window.__legacyBoot = acc;

  function ready(fn) { if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  ready(function () {
    // Slider: her slayt için görsel yeniden yüklenir
    var slides = document.querySelectorAll(".rev-slide"), i = 0;
    if (slides.length) { slides[0].className += " active"; setInterval(function () { slides[i].className = slides[i].className.replace(" active", ""); i = (i + 1) % slides.length; slides[i].className += " active"; }, 5000); }
    // Çerez çubuğu ve kampanya bandı sonradan eklenir → içerik aşağı kayar (layout shift)
    setTimeout(function () {
      var bar = document.createElement("div"); bar.id = "cookie-bar"; bar.innerHTML = "Bu site çerez kullanır. Devam ederek kabul etmiş olursunuz. <a href='#' style='color:#f0a020'>Detaylar</a>";
      document.body.insertBefore(bar, document.body.firstChild);
      var promo = document.createElement("div"); promo.id = "top-promo"; promo.style.cssText = "background:#f0a020;color:#111;text-align:center;padding:12px;font-weight:700"; promo.textContent = "%15 indirimli parsiyel taşımacılık kampanyası — 31 Mart'a kadar!";
      document.body.insertBefore(promo, bar.nextSibling);
    }, 1200);
    // Popup
    setTimeout(function () { var p = document.getElementById("promo-popup"); if (p) p.style.display = "flex"; }, 4000);
    var close = document.getElementById("promo-close"); if (close) close.onclick = function () { document.getElementById("promo-popup").style.display = "none"; };
    // Sayaç animasyonu
    var nums = document.querySelectorAll(".stats .num"); nums.forEach(function (n) { var target = parseInt(n.getAttribute("data-n"), 10), c = 0; var iv = setInterval(function () { c += Math.ceil(target / 40); if (c >= target) { c = target; clearInterval(iv); } n.textContent = c.toLocaleString("tr-TR") + (n.getAttribute("data-s") || ""); }, 40); });
  });
})();
