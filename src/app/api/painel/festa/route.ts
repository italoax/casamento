/**
 * PAINEL — gestão das fotos da festa.
 * GET    /api/painel/festa        -> lista todas as fotos (mais recentes primeiro).
 * DELETE /api/painel/festa?id=..  -> apaga a foto (registro + arquivo no disco).
 */

import { unlink } from "node:fs/promises";
import { errorJson, json } from "@/lib/http";
import { requirePainelRole } from "@/lib/painel-auth";
import { execute, queryOne, queryRows } from "@/lib/db";
import { resolveFestaUploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

type FotoFesta = { id: number; nome: string; email?: string; arquivo: string; created_at: string };

export async function GET() {
  if (!(await requirePainelRole("admin"))) return errorJson("Acesso negado.", 403);
  const fotos = (await queryRows(
    "SELECT id, nome, email, arquivo, created_at FROM festa_fotos ORDER BY created_at DESC, id DESC LIMIT 1000",
  ).catch(() => [])) as FotoFesta[];
  return json({ sucesso: true, fotos, total: fotos.length });
}

export async function DELETE(request: Request) {
  if (!(await requirePainelRole("admin"))) return errorJson("Acesso negado.", 403);
  const id = Number(new URL(request.url).searchParams.get("id") || 0);
  if (!id) return errorJson("ID inválido.", 422);

  const row = await queryOne<{ arquivo?: string }>("SELECT arquivo FROM festa_fotos WHERE id = ? LIMIT 1", [id]);
  if (row?.arquivo && String(row.arquivo).startsWith("img/festa/")) {
    await unlink(resolveFestaUploadPath(String(row.arquivo))).catch(() => undefined);
  }
  await execute("DELETE FROM festa_fotos WHERE id = ?", [id]);
  return json({ sucesso: true, mensagem: "Foto removida." });
}
