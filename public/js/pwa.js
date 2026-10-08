/**
 * Registro do Service Worker (PWA).
 * Só roda em produção (HTTPS). Falha silenciosamente se não houver suporte.
 */
(function () {
  if (!("serviceWorker" in navigator)) return;
  var script = document.currentScript;
  var release = script && script.dataset.assetRelease;
  if (script && script.dataset.cacheMode === "development") {
    // Evita que um SW de produção interfira no hot reload local.
    navigator.serviceWorker.getRegistrations().then(function (registros) {
      registros.forEach(function (registro) {
        var worker = registro.active || registro.waiting || registro.installing;
        if (worker && new URL(worker.scriptURL).pathname === "/sw.js") registro.unregister();
      });
    }).catch(function () {});
    return;
  }
  // Em http:// (dev local sem https) o SW não é permitido, exceto em localhost.
  var ehLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (location.protocol !== "https:" && !ehLocal) return;

  function registrar() {
    var url = "/sw.js" + (release ? "?v=" + encodeURIComponent(release) : "");
    navigator.serviceWorker.register(url, { scope: "/", updateViaCache: "none" }).then(function (registro) {
      return registro.update();
    }).catch(function (e) {
      console.warn("[pwa] falha ao registrar service worker:", e);
    });
  }
  if (document.readyState === "complete") registrar();
  else window.addEventListener("load", registrar, { once: true });
})();
