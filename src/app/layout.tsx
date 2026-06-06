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

// Metadados para SEO e redes sociais
export const metadata: Metadata = {
  metadataBase: new URL("https://emanuelleitalo.com"),
  title: "Casamento Emanuelle & Ítalo",
  description: "Confirme sua presença e veja a lista de presentes para o casamento de Emanuelle e Ítalo.",
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Carrega valor de cartão de crédito de env (pode ser customizado por deploy)
  const valorCartaoEnv = Number(process.env.CARTAO_VALOR || "");
  const configEnvOverrides = Number.isFinite(valorCartaoEnv) && valorCartaoEnv >= 0
    ? `window.siteConfig = window.siteConfig || {}; window.siteConfig.checkout = window.siteConfig.checkout || {}; window.siteConfig.checkout.valorCartao = ${JSON.stringify(valorCartaoEnv)};`
    : "";

  return (
    <html lang="pt-BR" className="pagina-carregando">
      <head>
        <meta name="theme-color" content="#f7f4ef" />
        <meta name="color-scheme" content="only light" />
        {/* Pré-carrega fontes para melhorar performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Great+Vibes&family=Playfair+Display:wght@700&family=Quicksand:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
        {/* CSS modularizado por tópico */}
        <link rel="stylesheet" href="/css/01-fundamentos.css" />
        <link rel="stylesheet" href="/css/02-secoes.css" />
        <link rel="stylesheet" href="/css/03-rodape-responsivo-animacoes.css" />
        <link rel="stylesheet" href="/css/04-compras-checkout-login.css" />
        <link rel="stylesheet" href="/css/05-ajustes-mobile.css" />
        <link rel="stylesheet" href="/css/06-ajustes-finais.css" />
      </head>
      <body className="pagina-carregando" suppressHydrationWarning>
        {children}
        {/* Scripts carregados em ordem específica */}
        {/* beforeInteractive: carregado antes do React, bloqueante */}
        <Script src="/js/config.js" strategy="beforeInteractive" />
        <Script id="config-env-overrides" strategy="beforeInteractive">
          {/* Injeta config de cartão do servidor para o cliente */}
          {configEnvOverrides}
        </Script>
        <Script id="hash-inicial-travado" strategy="beforeInteractive">
          {/* Flag para evitar navegação durante preloader */}
          {`if (typeof window.hashInicialTravado === "undefined") window.hashInicialTravado = false; var hashInicialTravado = window.hashInicialTravado;`}
        </Script>
        {/* afterInteractive: carregado depois do React */}
        <Script src="/js/index.js" type="module" strategy="afterInteractive" />
        <Script src="/js/confirmacao.js" type="module" strategy="afterInteractive" />
        <Script src="/js/preloader.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
