/**
 * ROBOTS.TXT - gerado pelo Next.js em /robots.txt
 *
 * Libera o site público para os buscadores, mas BLOQUEIA a área administrativa
 * (/painel) e as rotas de API (/api) — elas não devem aparecer no Google.
 * Também aponta para o sitemap.
 */
import type { MetadataRoute } from "next";

const baseUrl = (process.env.BASE_URL || "https://emanuelleitalo.com").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/painel", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
