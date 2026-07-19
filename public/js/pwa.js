/**
 * Registro do Service Worker (PWA).
 * Só roda em produção (HTTPS). Falha silenciosamente se não houver suporte.
 */
(function () {
  if (!("serviceWorker" in navigator)) return;
  // Em http:// (dev local sem https) o SW não é permitido, exceto em localhost.
  var ehLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (location.protocol !== "https:" && !ehLocal) return;

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function (e) {
      console.warn("[pwa] falha ao registrar service worker:", e);
    });
  });
})();
