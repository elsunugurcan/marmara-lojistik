// Tek küçük betik (defer): çerez bildirimi. jQuery, slider ve popup kaldırıldı.
(function () {
  var box = document.getElementById("cookie"), ok = document.getElementById("cookie-ok");
  var seen = false; try { seen = localStorage.getItem("cookie-ok") === "1"; } catch (e) {}
  if (!seen && box) box.hidden = false;
  if (ok) ok.addEventListener("click", function () { box.hidden = true; try { localStorage.setItem("cookie-ok", "1"); } catch (e) {} });
})();
