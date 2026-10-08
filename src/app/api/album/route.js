const ALBUM_PATH = "spaces/c259270cc06e4781b16c4acb8426e040/albums/70f916d5c64b4731b65b61ae7ec5136e/assets";
const IMAGE_BASE = "https://lightroom.adobe.com/v2c/spaces/c259270cc06e4781b16c4acb8426e040/";

export async function GET(request) {
    const cursor = new URL(request.url).searchParams.get("cursor") || "";
    const params = new URLSearchParams(cursor);
    const allowed = new Set(["subtype", "filters[flags]", "order_after", "captured_after", "exclude", "embed"]);
    if (cursor.length > 1000 || [...params.keys()].some(key => !allowed.has(key))) {
        return Response.json({ erro: "Página inválida." }, { status: 400 });
    }
    params.set("embed", "asset");
    params.set("subtype", "image");
    params.set("exclude", "incomplete");
    if (!cursor) params.set("order_after", "-");
    try {
        // Consulta somente uma página de metadados; as imagens vêm direto do Adobe.
        const response = await fetch(`https://lightroom.adobe.com/v2/${ALBUM_PATH}?${params}`, {
            next: { revalidate: 300 },
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error("Álbum indisponível");
        const raw = await response.text();
        // A resposta pública do Lightroom inclui um prefixo de proteção contra XSSI.
        const data = JSON.parse(raw.replace(/^while\s*\(1\)\s*\{\}\s*/, ""));
        const fotos = (data.resources || []).flatMap(({ asset }) => {
            const href = asset?.links?.["/rels/rendition_type/1280"]?.href;
            if (!href || !/^assets\/[a-f0-9]+\/revisions\/[a-f0-9]+\/renditions\/[a-f0-9]+$/.test(href)) return [];
            const downloadHref = asset.links["/rels/rendition_type/2048"]?.href || href;
            const caminhoDownload = /^assets\/[a-f0-9]+\/revisions\/[a-f0-9]+\/renditions\/[a-f0-9]+$/.test(downloadHref) ? downloadHref : href;
            const thumbHref = asset.links["/rels/rendition_type/640"]?.href;
            const thumbnail = thumbHref && /^assets\/[a-f0-9]+\/revisions\/[a-f0-9]+\/renditions\/[a-f0-9]+$/.test(thumbHref) ? IMAGE_BASE + thumbHref : IMAGE_BASE + href;
            return [{ id: asset.id, src: IMAGE_BASE + href, thumbnail, download: `/api/album/download?foto=${encodeURIComponent(caminhoDownload)}` }];
        });
        const nextHref = data.links?.next?.href;
        const proxima = nextHref ? new URL(nextHref, "https://lightroom.adobe.com/").search.slice(1) : null;
        return Response.json({ fotos, proxima }, {
            headers: { "Cache-Control": "public, max-age=300" },
        });
    } catch {
        return Response.json({ erro: "Não foi possível carregar as fotos. Abra o álbum completo abaixo." }, { status: 502 });
    }
}
