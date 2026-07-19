import { errorJson, json, cleanText } from "@/lib/http";
import { db, columnExists } from "@/lib/db";
import { requirePainelPermission } from "@/lib/painel-auth";

export const runtime = "nodejs";

// Garante a coluna "visivel" (separa aprovação de exibição no mural).
async function ensureVisivelColumn() {
  if (!(await columnExists("recados", "visivel"))) {
    await db().execute("ALTER TABLE recados ADD COLUMN visivel TINYINT(1) NOT NULL DEFAULT 1").catch(() => undefined);
  }
}

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
  if (acao === "editar") {
    const nome = cleanText(body.nome, 80);
    const mensagem = cleanText(body.mensagem, 600);
    if (!nome || mensagem.length < 5) return errorJson("Informe o nome e um recado com pelo menos 5 caracteres.", 422);
    await db().execute("UPDATE recados SET nome = ?, mensagem = ? WHERE id = ?", [nome, mensagem, id]);
    return json({ sucesso: true });
  }
  if (acao === "visibilidade") {
    await ensureVisivelColumn();
    const visivel = Number(body.visivel) ? 1 : 0;
    await db().execute("UPDATE recados SET visivel = ? WHERE id = ?", [visivel, id]);
    return json({ sucesso: true });
  }
  if (acao === "remover") {
    await db().execute("DELETE FROM recados WHERE id = ?", [id]);
    return json({ sucesso: true });
  }
  return errorJson("Ação inválida.", 400);
}
