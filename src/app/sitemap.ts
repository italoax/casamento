/**
 * SITEMAP.XML - gerado pelo Next.js em /sitemap.xml
 *
 * Lista apenas as páginas PÚBLICAS do site (a área /painel e a /api ficam de fora
 * de propósito). Ajuda o Google a encontrar e indexar as páginas certas.
 */
import type { MetadataRoute } from "next";

const baseUrl = (process.env.BASE_URL || "https://emanuelleitalo.com").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${baseUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/padrinhos`, lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/politica-de-privacidade`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/termos-de-uso`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
