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
import Script from "next/script";
import { assetUrl, assetRelease } from "@/lib/site/assets";
import { getCartaoValor } from "@/lib/site/cartao-config";
// Metadados para SEO e redes sociais
export const metadata = {
    metadataBase: new URL("https://emanuelleitalo.com"),
    title: "Emanuelle & Ítalo | Casamento",
    applicationName: "Emanuelle & Ítalo",
    description: "Confirme sua presença e veja a lista de presentes para o casamento de Emanuelle e Ítalo.",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Emanuelle & Ítalo",
    },
    openGraph: {
        title: "Emanuelle & Ítalo | Casamento",
        siteName: "Emanuelle & Ítalo",
        locale: "pt_BR",
        type: "website",
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
export default async function RootLayout({ children }) {
    // Valor do cartão postal: banco (editável no painel) -> env -> padrão.
    const valorCartao = await getCartaoValor();
    const configEnvOverrides = `window.siteConfig = window.siteConfig || {}; window.siteConfig.checkout = window.siteConfig.checkout || {}; window.siteConfig.checkout.valorCartao = ${JSON.stringify(valorCartao)};`;
    return (<html lang="pt-BR" className="pagina-carregando">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-R02R0P2KT8"></script>
        <script id="google-analytics" dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-R02R0P2KT8');
        ` }}></script>
        <meta name="theme-color" content="#f7f4ef"/>
        <meta name="color-scheme" content="only light"/>
        <meta name="mobile-web-app-capable" content="yes"/>
        {/* Pré-carrega fontes para melhorar performance. Cormorant só usa 400/500/600
            (o 700 foi removido, era um arquivo de fonte baixado à toa). O preload da
            folha de estilo faz o navegador buscá-la mais cedo, ajudando o FCP. */}
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Great+Vibes&family=Playfair+Display:wght@700&family=Quicksand:wght@300;400;600&display=swap"/>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Great+Vibes&family=Playfair+Display:wght@700&family=Quicksand:wght@300;400;600&display=swap" rel="stylesheet"/>
        {/* CSS modularizado por tópico (com versão para cache-busting) */}
        <link rel="stylesheet" href={assetUrl("/css/01-fundamentos.css")}/>
        <link rel="stylesheet" href={assetUrl("/css/02-secoes.css")}/>
        <link rel="stylesheet" href={assetUrl("/css/03-rodape-responsivo-animacoes.css")}/>
        <link rel="stylesheet" href={assetUrl("/css/04-compras-checkout-login.css")}/>
        <link rel="stylesheet" href={assetUrl("/css/05-ajustes-mobile.css")}/>
        <link rel="stylesheet" href={assetUrl("/css/06-ajustes-finais.css")}/>
      </head>
      <body className="pagina-carregando" suppressHydrationWarning>
        {children}
        {/* Scripts carregados em ordem específica */}
        {/* beforeInteractive: carregado antes do React, bloqueante */}
        <Script src={assetUrl("/js/config.js")} strategy="beforeInteractive"/>
        <Script id="config-env-overrides" strategy="beforeInteractive">
          {/* Injeta config de cartão do servidor para o cliente */}
          {configEnvOverrides}
        </Script>
        <Script id="hash-inicial-travado" strategy="beforeInteractive">
          {/* Flag para evitar navegação durante preloader */}
          {`if (typeof window.hashInicialTravado === "undefined") window.hashInicialTravado = false; var hashInicialTravado = window.hashInicialTravado;`}
        </Script>
        {/* afterInteractive: carregado depois do React */}
        <Script src={assetUrl("/js/index.js")} type="module" strategy="afterInteractive"/>
        <Script src={assetUrl("/js/confirmacao.js")} type="module" strategy="afterInteractive"/>
        <Script src={assetUrl("/js/preloader.js")} strategy="afterInteractive"/>
        {/* Registra o Service Worker (PWA / instalável / offline) */}
        <Script src={assetUrl("/js/pwa.js")} data-asset-release={assetRelease} data-cache-mode={process.env.NODE_ENV} strategy="afterInteractive"/>
      </body>
    </html>);
}
