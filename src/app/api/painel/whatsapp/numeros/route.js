import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/auth/painel-auth";
import { SafeLog } from "@/lib/security";
import { checarNumeros } from "@/lib/whatsapp/whatsapp";
export const runtime = "nodejs";
function slotValido(v) {
    return v === "1" || v === "2" || v === "3";
}
export async function POST(request) {
    if (!(await requirePainelPermission("manage_convidados")))
        return errorJson("Acesso negado.", 403);
    const body = await request.json().catch(() => ({}));
    const slot = String(body.slot || "");
    if (!slotValido(slot))
        return errorJson("Número de envio inválido.", 422);
    const numeros = Array.isArray(body.numeros) ? body.numeros.map((n) => String(n || "")).filter(Boolean) : [];
    if (numeros.length === 0)
        return errorJson("Informe ao menos um número.", 422);
    if (numeros.length > 500)
        return errorJson("Muitos números de uma vez (máx. 500).", 422);
    try {
        const results = await checarNumeros(slot, numeros);
        return json({ sucesso: true, results });
    }
    catch (error) {
        SafeLog.error("POST /api/painel/whatsapp/numeros", error);
        return errorJson(error.message || "Falha ao checar os números.", 502);
    }
}
