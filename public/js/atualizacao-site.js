(function () {
  var script = document.currentScript;
  var versaoAtual = script && script.dataset.siteVersion;
  if (!versaoAtual) return; // O desenvolvimento local usa hot reload.
  var consultando = false;
  var recarregando = false;

  async function verificar() {
    if (document.hidden || consultando || recarregando) return;
    consultando = true;
    try {
      var resposta = await fetch("/api/site/versao", {
        cache: "no-store", signal: AbortSignal.timeout(5000),
      });
      if (!resposta.ok) return;
      var dados = await resposta.json();
      if (typeof dados.versao !== "string" || !dados.versao || dados.versao === versaoAtual) return;
      var url = new URL(window.location.href);
      // A URL nova também evita HTML antigo em caches intermediários.
      // Se o servidor ainda entregar o HTML antigo, evita um ciclo de recargas.
      if (url.searchParams.get("_site_version") === dados.versao) return;
      url.searchParams.set("_site_version", dados.versao);
      recarregando = true;
      window.location.replace(url.href);
    } catch { /* Sem rede ou durante publicação, tenta novamente depois. */ }
    finally { consultando = false; }
  }

  void verificar();
  setInterval(verificar, 5000);
  document.addEventListener("visibilitychange", verificar);
  window.addEventListener("online", verificar);
})();
