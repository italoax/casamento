let versaoAssetsPadrao = obterVersaoAssetsPadrao();

function obterVersaoAssetsPadrao() {
  if (typeof window.siteConfig?.assetsVersion === "string") {
    const versaoConfig = window.siteConfig.assetsVersion.trim();
    if (versaoConfig) return versaoConfig;
  }
  const scriptConfig = document.querySelector('script[src*="config.js"]');
  if (scriptConfig) {
    try {
      const url = new URL(scriptConfig.src, window.location.href);
      const versao = url.searchParams.get("v");
      if (versao) return versao;
    } catch (e) {}
  }
  return "";
}

function versionarImagemUrl(url) {
  if (!versaoAssetsPadrao || typeof url !== "string") return url;
  const valor = url.trim();
  if (!valor) return url;
  if (/^(data:|blob:|mailto:|tel:|javascript:|#)/i.test(valor)) return url;
  if (!/\.(png|jpe?g|gif|webp|svg|ico|avif)(\?|#|$)/i.test(valor)) return url;
  if (/(^|[?&])v=/.test(valor)) return url;
  if (/^(https?:)?\/\//i.test(valor)) {
    try {
      const parsed = new URL(valor, window.location.href);
      if (parsed.origin !== window.location.origin) return url;
      parsed.searchParams.set("v", versaoAssetsPadrao);
      return parsed.toString();
    } catch (e) {
      return url;
    }
  }
  const partes = valor.split("#");
  const base = partes.shift() || "";
  const hash = partes.length ? `#${partes.join("#")}` : "";
  const separador = base.includes("?") ? "&" : "?";
  return `${base}${separador}v=${encodeURIComponent(versaoAssetsPadrao)}${hash}`;
}

export { versionarImagemUrl, obterVersaoAssetsPadrao };
