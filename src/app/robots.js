const baseUrl = (process.env.BASE_URL || "https://emanuelleitalo.com").replace(/\/$/, "");
export default function robots() {
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
