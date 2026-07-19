/**
 * ROOT LAYOUT - Estrutura HTML Base da Aplicação
 * 
 * Este é o layout raiz (compartilhado por todas as páginas).
 * Define:
 * - Meta tags (SEO, OpenGraph)
 * - Fontes Google
 * - CSS global
 * - Scripts do cliente
 */

/* eslint-disable @next/next/no-css-tags, @next/next/no-page-custom-font */
import type { Metadata } from "next";
import Script from "next/script";
import { getCartaoValor } from "@/lib/cartao-config";

// Metadados para SEO e redes sociais
export const metadata: Metadata = {
  metadataBase: new URL("https://emanuelleitalo.com"),
  title: "Casamento Emanuelle & Ítalo",
  description: "Confirme sua presença e veja a lista de presentes para o casamento de Emanuelle e Ítalo.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Emanuelle & Ítalo",
  },
  openGraph: {
    title: "Casamento Emanuelle & Ítalo",
    description: "Vamos nos casar! Clique para ver detalhes, local e confirmar presença.",
    images: ["/img/noivos/og-image-img2-1200x630.webp"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/img/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/img/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/img/favicon/favicon-180x180.png", sizes: "180x180", type: "image/png" }],
  },
};

// Versão dos assets estáticos (CSS/JS) para cache-busting. Muda a cada deploy
// (ou reinício do servidor na Hostinger), forçando navegadores e o Cloudflare a
// baixarem a versão nova — a URL muda, então o cache antigo é ignorado.
// Pode ser fixada via env ASSET_VERSION; senão usa o instante de inicialização.
const ASSET_VERSION = process.env.ASSET_VERSION || String(Date.now());

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Valor do cartão postal: banco (editável no painel) -> env -> padrão.
  const valorCartao = await getCartaoValor();
  const v = `?v=${ASSET_VERSION}`;
  const configEnvOverrides = `window.siteConfig = window.siteConfig || {}; window.siteConfig.checkout = window.siteConfig.checkout || {}; window.siteConfig.checkout.valorCartao = ${JSON.stringify(valorCartao)};`;

  return (
    <html lang="pt-BR" className="pagina-carregando">
      <head>
        <meta name="theme-color" content="#f7f4ef" />
        <meta name="color-scheme" content="only light" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Pré-carrega fontes para melhorar performance. Cormorant só usa 400/500/600
            (o 700 foi removido, era um arquivo de fonte baixado à toa). O preload da
            folha de estilo faz o navegador buscá-la mais cedo, ajudando o FCP. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Great+Vibes&family=Playfair+Display:wght@700&family=Quicksand:wght@300;400;600&display=swap"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Great+Vibes&family=Playfair+Display:wght@700&family=Quicksand:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
        {/* CSS modularizado por tópico (com versão para cache-busting) */}
        <link rel="stylesheet" href={`/css/01-fundamentos.css${v}`} />
        <link rel="stylesheet" href={`/css/02-secoes.css${v}`} />
        <link rel="stylesheet" href={`/css/03-rodape-responsivo-animacoes.css${v}`} />
        <link rel="stylesheet" href={`/css/04-compras-checkout-login.css${v}`} />
        <link rel="stylesheet" href={`/css/05-ajustes-mobile.css${v}`} />
        <link rel="stylesheet" href={`/css/06-ajustes-finais.css${v}`} />
      </head>
      <body className="pagina-carregando" suppressHydrationWarning>
        {children}
        {/* Scripts carregados em ordem específica */}
        {/* beforeInteractive: carregado antes do React, bloqueante */}
        <Script src={`/js/config.js${v}`} strategy="beforeInteractive" />
        <Script id="config-env-overrides" strategy="beforeInteractive">
          {/* Injeta config de cartão do servidor para o cliente */}
          {configEnvOverrides}
        </Script>
        <Script id="hash-inicial-travado" strategy="beforeInteractive">
          {/* Flag para evitar navegação durante preloader */}
          {`if (typeof window.hashInicialTravado === "undefined") window.hashInicialTravado = false; var hashInicialTravado = window.hashInicialTravado;`}
        </Script>
        {/* afterInteractive: carregado depois do React */}
        <Script src={`/js/index.js${v}`} type="module" strategy="afterInteractive" />
        <Script src={`/js/confirmacao.js${v}`} type="module" strategy="afterInteractive" />
        <Script src={`/js/preloader.js${v}`} strategy="afterInteractive" />
        {/* Registra o Service Worker (PWA / instalável / offline) */}
        <Script src={`/js/pwa.js${v}`} strategy="afterInteractive" />
        {/* Título da aba animado (marquee): rola o nome pra não cortar em abas estreitas */}
        <Script id="titulo-animado" strategy="afterInteractive">
          {`(function(){var base=(document.title||"Casamento Emanuelle & Ítalo").trim();var chars=Array.from(base+"   🤍   ");var pos=0;setInterval(function(){document.title=chars.slice(pos).concat(chars.slice(0,pos)).join("");pos=(pos+1)%chars.length;},400);})();`}
        </Script>
      </body>
    </html>
  );
}
