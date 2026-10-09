import { carregarPaginaAlbum } from "@/lib/site/album-adobe.mjs";
import { getAlbumSelecao } from "@/lib/site/album-config";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(request) {
    try {
        const ids = await getAlbumSelecao();
        if (ids?.length === 0) return Response.json({ fotos: [], proxima: null }, { headers });
        const pagina = await carregarPaginaAlbum(new URL(request.url).searchParams.get("cursor") || "");
        const selecionadas = ids === null ? null : new Set(ids);
        return Response.json({ ...pagina, fotos: selecionadas ? pagina.fotos.filter(foto => selecionadas.has(foto.id)) : pagina.fotos }, { headers });
    } catch (error) {
        return Response.json({ erro: error.status === 400 ? "Página inválida." : "Não foi possível carregar as fotos. Tente novamente." }, { status: error.status || 502, headers });
    }
}
