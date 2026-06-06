/**
 * NEXT.JS CONFIGURATION - Segurança e Performance
 * 
 * Configura:
 * - Content Security Policy (CSP) - previne XSS
 * - CORS headers - controla acesso da API
 * - Security headers (HSTS, X-Frame-Options, etc)
 * 
 * Documentação: https://nextjs.org/docs/app/api-reference/config/next-config-js
 */

import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const baseUrlHost = process.env.BASE_URL ? new URL(process.env.BASE_URL).hostname : "";
const allowedDevOrigins = [baseUrlHost].filter(Boolean);

/**
 * Script-src do CSP (Content Security Policy)
 * Controla quais scripts podem ser executados
 * - 'self': apenas scripts deste domínio
 * - 'unsafe-inline': permite inline scripts (necessário para o site)
 * - 'unsafe-eval': apenas em dev (para hot reload)
 * - https://www.google.com: Google Maps e Scripts do Google
 */
const scriptSrc = [
  "script-src 'self' 'unsafe-inline'",
  isDev ? "'unsafe-eval'" : "",
  "https://www.google.com https://www.gstatic.com https://maps.google.com https://cdn.jsdelivr.net",
]
  .filter(Boolean)
  .join(" ");

/**
 * Headers de segurança aplicados a todas as respostas HTTP
 * Protegem contra vulnerabilidades comuns
 */
const securityHeaders = [
  {
    // HSTS - Força uso de HTTPS por 1 ano
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    // Previne sniffing de MIME type
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Previne clickjacking (permite apenas same-origin)
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    // Proteção XSS no IE
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    // Controla Referer header
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Desabilita features potencialmente perigosas
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    // Previne COOP attacks
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    // Content Security Policy - principal defesa contra XSS
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",                              // Padrão: apenas recursos do próprio domínio
      scriptSrc,                                         // Scripts permitidos
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",  // CSS
      "img-src 'self' data: https:",                     // Imagens (permite data: para inline)
      "font-src 'self' https://fonts.gstatic.com",       // Fontes
      "connect-src 'self' https://www.google.com https://www.gstatic.com https://www.openstreetmap.org https://*.tile.openstreetmap.org", // Requisições AJAX/fetch
      "frame-src https://www.google.com https://www.openstreetmap.org",  // Iframes
      "base-uri 'self'",                                 // Base URL para <base> tags
      "form-action 'self'",                              // Ações de formulário
      "frame-ancestors 'self'",                          // Quem pode fazer iframe deste site
      "upgrade-insecure-requests",                       // Converte http: para https:
    ].join("; "),
  },
];

/**
 * Configuração final do Next.js
 */
const nextConfig: NextConfig = {
  poweredByHeader: false,  // Não expõe qual framework está sendo usado
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  
  // Mantém compatibilidade com QR Codes antigos que apontam para /padrinhos/index.html
  async redirects() {
    return [
      {
        source: "/padrinhos/index.html",
        destination: "/padrinhos",
        permanent: true,
      },
    ];
  },

  // Adiciona security headers em todas as respostas
  async headers() {
    return [
      {
        source: "/:path*",  // Aplica a todas as rotas
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
