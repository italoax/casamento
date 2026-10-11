export function getAlbumOrigem() {
    let url;
    try { url = new URL((process.env.ALBUM_ADOBE_URL || "").trim()); }
    catch { throw new Error("Origem do álbum não configurada."); }
    const match = url.pathname.match(/^\/v2\/spaces\/([a-f0-9]{32})\/albums\/[a-f0-9]{32}\/assets$/);
    if (url.origin !== "https://lightroom.adobe.com" || url.username || url.password || url.search || url.hash || !match) {
        throw new Error("Origem do álbum inválida.");
    }
    return { albumUrl: url.href, imageBase: `${url.origin}/v2c/spaces/${match[1]}/` };
}
