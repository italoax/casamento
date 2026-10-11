import { criarLinkImagem } from "./album-imagens.mjs";
import { getAlbumOrigem } from "./album-origem.mjs";
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
    const response = await fetch(`${getAlbumOrigem().albumUrl}?${params}`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Álbum indisponível.");
    const data = JSON.parse((await response.text()).replace(/^while\s*\(1\)\s*\{\}\s*/, ""));
    const fotos = (data.resources || []).flatMap(({ asset }) => {
        const href = asset?.links?.["/rels/rendition_type/1280"]?.href;
        if (!rendition.test(href) || !/^[a-f0-9]{32}$/.test(asset?.id)) return [];
        const downloadHref = asset.links["/rels/rendition_type/2048"]?.href;
        const thumbHref = asset.links["/rels/rendition_type/640"]?.href;
        return [{ id: asset.id, src: criarLinkImagem(href),
            thumbnail: criarLinkImagem(rendition.test(thumbHref) ? thumbHref : href),
            download: criarLinkImagem(rendition.test(downloadHref) ? downloadHref : href, true) }];
    });
    const nextHref = data.links?.next?.href;
    return { fotos, proxima: nextHref ? new URL(nextHref, "https://lightroom.adobe.com/").search.slice(1) : null };
}
