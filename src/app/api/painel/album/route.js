import { requirePainelPermission } from "@/lib/auth/painel-auth";
import { errorJson, json } from "@/lib/http";
import { Security, SafeLog } from "@/lib/security";
import { carregarPaginaAlbum, validarSelecao } from "@/lib/site/album-adobe.mjs";
import { getAlbumSelecao, setAlbumSelecao } from "@/lib/site/album-config";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

export async function GET(request) {
    if (!(await requirePainelPermission("manage_rsvp"))) return errorJson("Acesso negado.", 403, { headers });
    try {
        const cursor = new URL(request.url).searchParams.get("cursor") || "";
        const [pagina, selecionadas] = await Promise.all([carregarPaginaAlbum(cursor), getAlbumSelecao()]);
        return json({ sucesso: true, ...pagina, selecionadas }, { headers });
    } catch (error) {
        SafeLog.error("Consultar álbum Adobe", error);
        return errorJson(error.status === 400 ? "Página inválida." : "Não foi possível carregar o álbum.", error.status || 502, { headers });
    }
}

export async function POST(request) {
    if (!(await requirePainelPermission("manage_rsvp"))) return errorJson("Acesso negado.", 403, { headers });
    if (!Security.isAllowedOrigin(request.headers.get("origin"), request.url)) return errorJson("Origem não permitida.", 403, { headers });
    let ids;
    try { ids = validarSelecao((await request.json()).ids); }
    catch { return errorJson("Seleção de fotos inválida.", 400, { headers }); }
    try {
        return json({ sucesso: true, selecionadas: await setAlbumSelecao(ids) }, { headers });
    } catch (error) {
        SafeLog.error("Salvar seleção do álbum", error);
        return errorJson("Não foi possível salvar a seleção.", 500, { headers });
    }
}
