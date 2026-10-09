const ALBUM_PATH = "spaces/c259270cc06e4781b16c4acb8426e040/albums/70f916d5c64b4731b65b61ae7ec5136e/assets";
const IMAGE_BASE = "https://lightroom.adobe.com/v2c/spaces/c259270cc06e4781b16c4acb8426e040/";
const rendition = /^assets\/[a-f0-9]+\/revisions\/[a-f0-9]+\/renditions\/[a-f0-9]+$/;

export function validarSelecao(ids) {
    if (ids === null) return null;
    if (!Array.isArray(ids) || ids.length > 10000 || ids.some(id => typeof id !== "string" || !/^[a-f0-9]{32}$/.test(id))) throw new Error("Seleção de fotos inválida.");
    return [...new Set(ids)];
}

export async function carregarPaginaAlbum(cursor = "") {
    const params = new URLSearchParams(cursor);
    const allowed = new Set(["subtype", "filters[flags]", "order_after", "captured_after", "exclude", "embed"]);
    if (typeof cursor !== "string" || cursor.length > 1000 || [...params.keys()].some(key => !allowed.has(key))) {
        const error = new Error("Página inválida."); error.status = 400; throw error;
    }
    params.set("embed", "asset"); params.set("subtype", "image"); params.set("exclude", "incomplete");
    if (!cursor) params.set("order_after", "-");
    const response = await fetch(`https://lightroom.adobe.com/v2/${ALBUM_PATH}?${params}`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Álbum indisponível.");
    const data = JSON.parse((await response.text()).replace(/^while\s*\(1\)\s*\{\}\s*/, ""));
    const fotos = (data.resources || []).flatMap(({ asset }) => {
        const href = asset?.links?.["/rels/rendition_type/1280"]?.href;
        if (!rendition.test(href) || !/^[a-f0-9]{32}$/.test(asset?.id)) return [];
        const downloadHref = asset.links["/rels/rendition_type/2048"]?.href;
        const thumbHref = asset.links["/rels/rendition_type/640"]?.href;
        return [{ id: asset.id, src: IMAGE_BASE + href,
            thumbnail: IMAGE_BASE + (rendition.test(thumbHref) ? thumbHref : href),
            download: `/api/album/download?foto=${encodeURIComponent(rendition.test(downloadHref) ? downloadHref : href)}` }];
    });
    const nextHref = data.links?.next?.href;
    return { fotos, proxima: nextHref ? new URL(nextHref, "https://lightroom.adobe.com/").search.slice(1) : null };
}
