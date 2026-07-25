/**
 * PAINEL — gestão das fotos da festa.
 * GET    /api/painel/festa        -> lista todas as fotos (pendentes primeiro).
 * PATCH  /api/painel/festa        -> aprova uma foto (publica no álbum).
 * DELETE /api/painel/festa?id=..  -> apaga a foto (registro + arquivo no disco).
 *
 * Toda foto enviada pelo convidado entra pendente (aprovado = 0) e só aparece
 * no álbum público depois de aprovada aqui.
 */

import { unlink } from "node:fs/promises";
import { errorJson, json } from "@/lib/http";
import { requirePainelRole } from "@/lib/painel-auth";
import { execute, queryOne, queryRows } from "@/lib/db";
import { resolveFestaUploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

type FotoFesta = { id: number; nome: string; email?: string; arquivo: string; aprovado: number; created_at: string };

export async function GET() {
  if (!(await requirePainelRole("admin"))) return errorJson("Acesso negado.", 403);
  // Pendentes no topo: é o que exige ação. Dentro de cada grupo, mais recentes primeiro.
  const fotos = (await queryRows(
    "SELECT id, nome, email, arquivo, aprovado, created_at FROM festa_fotos ORDER BY aprovado ASC, created_at DESC, id DESC LIMIT 1000",
  ).catch(() => [])) as FotoFesta[];
  const pendentes = fotos.filter((f) => Number(f.aprovado) === 0).length;
  return json({ sucesso: true, fotos, total: fotos.length, pendentes });
}

export async function PATCH(request: Request) {
  if (!(await requirePainelRole("admin"))) return errorJson("Acesso negado.", 403);
  const body = await request.json().catch(() => ({}));
  const id = Number(body?.id || 0);
  if (!id) return errorJson("ID inválido.", 422);

  // `aprovado` só aceita publicar ou despublicar — nunca um valor arbitrário.
  const aprovado = body?.aprovado === false || body?.aprovado === 0 ? 0 : 1;
  await execute("UPDATE festa_fotos SET aprovado = ? WHERE id = ?", [aprovado, id]);
  return json({ sucesso: true, id, aprovado, mensagem: aprovado ? "Foto publicada." : "Foto despublicada." });
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
