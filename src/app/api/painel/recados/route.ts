import { errorJson, json } from "@/lib/http";
import { db } from "@/lib/db";
import { requirePainelPermission } from "@/lib/painel-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await requirePainelPermission("manage_recados"))) return errorJson("Acesso negado.", 403);
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id || 0);
  const acao = String(body.acao || "");
  if (!id) return errorJson("ID inválido.", 422);
  if (acao === "aprovar") {
    await db().execute("UPDATE recados SET aprovado = 1 WHERE id = ?", [id]);
    return json({ sucesso: true });
  }
  if (acao === "remover") {
    await db().execute("DELETE FROM recados WHERE id = ?", [id]);
    return json({ sucesso: true });
  }
  return errorJson("Ação inválida.", 400);
}
