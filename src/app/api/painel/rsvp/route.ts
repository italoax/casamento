import { errorJson, json, cleanText } from "@/lib/http";
import { db, tableExists } from "@/lib/db";
import { requirePainelPermission } from "@/lib/painel-auth";

export const runtime = "nodejs";

async function ensureTable() {
  if (!(await tableExists("rsvp_config"))) {
    await db().execute(`CREATE TABLE IF NOT EXISTS rsvp_config (
      chave VARCHAR(120) NOT NULL PRIMARY KEY,
      valor TEXT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }
}

function parseSaoPauloDatetimeLocal(value: string) {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(normalized)) return null;
  const withSeconds = normalized.length === 16 ? `${normalized}:00` : normalized;
  const date = new Date(`${withSeconds}-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(request: Request) {
  if (!(await requirePainelPermission("manage_rsvp"))) return errorJson("Acesso negado.", 403);
  await ensureTable();
  const body = await request.json().catch(() => ({}));
  const data = cleanText(body.data_limite_confirmacao, 50);
  if (!data) return errorJson("Informe a data limite.", 422);
  const local = parseSaoPauloDatetimeLocal(data);
  if (!local) return errorJson("Data inválida.", 422);
  await db().execute("INSERT INTO rsvp_config (chave, valor) VALUES ('rsvp_deadline_utc', ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)", [local.toISOString()]);
  return json({ sucesso: true });
}

export async function DELETE() {
  if (!(await requirePainelPermission("manage_rsvp"))) return errorJson("Acesso negado.", 403);
  await ensureTable();
  await db().execute("DELETE FROM rsvp_config WHERE chave = 'rsvp_deadline_utc'");
  return json({ sucesso: true });
}
