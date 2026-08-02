/**
 * Meta de convidados (em porções de adulto) exibida no Dashboard.
 * POST /api/painel/meta  { meta: number }  -> salva em rsvp_config.
 *
 * A leitura é feita no getDashboardData (vem junto com os KPIs); aqui só grava.
 */
import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await requirePainelPermission("manage_rsvp"))) return errorJson("Acesso negado.", 403);

  const body = await request.json().catch(() => ({}));
  const meta = Number(body?.meta);
  if (!Number.isFinite(meta) || meta < 0 || meta > 100000) {
    return errorJson("Meta inválida. Informe um número entre 0 e 100000.", 422);
  }
  // Guarda inteiro (a meta é um alvo cheio; o consumo confirmado é que pode ter 0,5).
  const valor = String(Math.round(meta));

  await db()
    .execute(
      `CREATE TABLE IF NOT EXISTS rsvp_config (
        chave VARCHAR(120) NOT NULL PRIMARY KEY,
        valor TEXT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    )
    .catch(() => undefined);

  await db().execute(
    "INSERT INTO rsvp_config (chave, valor) VALUES ('meta_convidados', ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
    [valor],
  );

  return json({ sucesso: true, meta: Number(valor) });
}
