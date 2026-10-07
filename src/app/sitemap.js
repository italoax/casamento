const baseUrl = (process.env.BASE_URL || "https://emanuelleitalo.com").replace(/\/$/, "");
export default function sitemap() {
    const lastModified = new Date();
    return [
        { url: `${baseUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 },
        { url: `${baseUrl}/padrinhos`, lastModified, changeFrequency: "monthly", priority: 0.7 },
        { url: `${baseUrl}/politica-de-privacidade`, lastModified, changeFrequency: "yearly", priority: 0.3 },
        { url: `${baseUrl}/termos-de-uso`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    ];
}
