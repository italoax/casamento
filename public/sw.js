/**
 * SERVICE WORKER — PWA do site do casamento
 *
 * Estratégia CONSERVADORA (site com pagamento + painel admin):
 *  - Só intercepta GET de MESMA ORIGEM. Qualquer outra coisa passa direto pra rede.
 *  - NUNCA toca em /api, /painel, /admin, /img/festa (uploads dinâmicos) nem em
 *    requisições com query de pagamento — essas vão SEMPRE pra rede.
 *  - Navegação (HTML): network-first. Se estiver offline, mostra /offline.html.
 *  - Assets estaticos: network-first com revalidacao HTTP.
 *    O cache local serve como alternativa quando a rede falha.
 *
 * Para forçar atualização do SW em todos os dispositivos, troque CACHE_VERSION.
 */

const CACHE_VERSION = "v2";
const STATIC_CACHE = `casamento-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

// Recursos mínimos para a tela offline funcionar.
const PRECACHE = [OFFLINE_URL, "/img/favicon/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== STATIC_CACHE).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Caminhos que NUNCA devem ser servidos do cache (dinâmicos / sensíveis).
function ehDinamico(url) {
  const p = url.pathname;
  return (
    p.startsWith("/api/") ||
    p.startsWith("/painel") ||
    p.startsWith("/admin") ||
    p.startsWith("/img/festa") // fotos da festa: sempre as mais novas
  );
}

// É um asset estático cacheável?
function ehAsset(url) {
  const p = url.pathname;
  return (
    p.startsWith("/_next/static/") ||
    p.startsWith("/css/") ||
    p.startsWith("/js/") ||
    p.startsWith("/img/") ||
    p.startsWith("/video/") ||
    p === "/manifest.webmanifest" ||
    p === "/favicon.ico" ||
    /\.(css|js|png|jpg|jpeg|webp|gif|svg|ico|woff|woff2|ttf|otf|avif)$/.test(p)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // cross-origin: deixa o navegador cuidar
  if (ehDinamico(url)) return; // rede direto, sem cache

  // Navegação (abrir uma página): network-first com fallback offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req, { cache: "no-cache" }).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error()))
    );
    return;
  }

  // Consulta a rede antes do cache para evitar servir arquivos de outra versao.
  if (ehAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        try {
          const resposta = await fetch(req, { cache: "no-cache" });
          if (resposta.status === 200 && resposta.type === "basic") {
            await cache.put(req, resposta.clone()).catch(() => {});
          }
          return resposta;
        } catch {
          return (await cache.match(req)) || Response.error();
        }
      })
    );
  }
});
