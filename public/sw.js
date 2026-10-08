/**
 * SERVICE WORKER — PWA do site do casamento
 *
 * Estratégia CONSERVADORA (site com pagamento + painel admin):
 *  - Só intercepta GET de MESMA ORIGEM. Qualquer outra coisa passa direto pra rede.
 *  - NUNCA toca em /api, /painel, /admin, /img/festa (uploads dinâmicos) nem em
 *    requisições com query de pagamento — essas vão SEMPRE pra rede.
 *  - Navegação (HTML): network-first. Se estiver offline, mostra /offline.html.
 *  - Assets com hash: cache-first. A URL muda quando o conteúdo muda.
 *  - Assets com nome fixo: network-first com revalidação HTTP.
 *
 * Para forçar atualização do SW em todos os dispositivos, troque CACHE_VERSION.
 */

const CACHE_VERSION = `v3-${new URL(self.location.href).searchParams.get("v") || "fixed"}`;
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
      Promise.all(nomes.filter((n) => n.startsWith("casamento-static-") && n !== STATIC_CACHE).map((n) => caches.delete(n)))
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
    p.startsWith("/_assets/") ||
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

  // Arquivos com hash são imutáveis; nomes fixos sempre consultam a rede.
  if (ehAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const imutavel = /^\/_assets\/(css|js)\/[a-f0-9]{20}\//.test(url.pathname) || url.pathname.startsWith("/_next/static/");
        if (imutavel) {
          const existente = await cache.match(req);
          if (existente) return existente;
        }
        try {
          const resposta = await fetch(req, { cache: imutavel ? "default" : "no-cache" });
          if (resposta.status === 200 && resposta.type === "basic") {
            await cache.put(req, resposta.clone()).catch(() => {});
            // Limita o espaço usado, mesmo em visitas longas ou muitas páginas.
            const entradas = await cache.keys();
            await Promise.all(entradas.filter(entry => !PRECACHE.includes(new URL(entry.url).pathname)).slice(0, Math.max(0, entradas.length - 120)).map(entry => cache.delete(entry)));
          }
          return resposta;
        } catch {
          return (await cache.match(req)) || Response.error();
        }
      })
    );
  }
});
