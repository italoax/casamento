/**
 * Meta de convidados (porções de adulto) + margem de folga (%) do Dashboard.
 * POST /api/painel/meta  { meta?: number, margem?: number }  -> grava em rsvp_config.
 *
 * A leitura é feita no getDashboardData (vem junto com os KPIs); aqui só grava.
 * `meta` é o alvo; `margem` é a % a mais aplicada sobre o potencial (folga de
 * buffet). Ambos são opcionais no corpo; grava só o que veio válido.
 */
import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/auth/painel-auth";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function POST(request) {
    if (!(await requirePainelPermission("manage_rsvp")))
        return errorJson("Acesso negado.", 403);
    const body = await request.json().catch(() => ({}));
    const updates = [];
    if (body?.meta !== undefined) {
        const meta = Number(body.meta);
        if (!Number.isFinite(meta) || meta < 0 || meta > 100000) {
            return errorJson("Meta inválida. Informe um número entre 0 e 100000.", 422);
        }
        updates.push(["meta_convidados", String(Math.round(meta))]);
    }
    if (body?.margem !== undefined) {
        const margem = Number(body.margem);
        if (!Number.isFinite(margem) || margem < 0 || margem > 100) {
            return errorJson("Margem inválida. Informe uma porcentagem entre 0 e 100.", 422);
        }
        updates.push(["margem_convidados", String(Math.round(margem))]);
    }
    if (!updates.length)
        return errorJson("Nada para salvar.", 422);
    await db()
        .execute(`CREATE TABLE IF NOT EXISTS rsvp_config (
        chave VARCHAR(120) NOT NULL PRIMARY KEY,
        valor TEXT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
        .catch(() => undefined);
    for (const [chave, valor] of updates) {
        await db().execute("INSERT INTO rsvp_config (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)", [chave, valor]);
    }
    return json({ sucesso: true });
}
