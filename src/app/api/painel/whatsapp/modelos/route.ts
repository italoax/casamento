import { mkdir, unlink, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { uploadsDir, resolveUploadPath } from "@/lib/uploads";
import { listarModelos, criarModelo, atualizarModelo, excluirModelo, obterModelo, setModeloPdf } from "@/lib/whatsapp-config";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requirePainelPermission("manage_convidados"))) return errorJson("Acesso negado.", 403);
  const modelos = await listarModelos();
  return json({ sucesso: true, modelos });
}

export async function POST(request: Request) {
  if (!(await requirePainelPermission("manage_convidados"))) return errorJson("Acesso negado.", 403);

  const tipo = request.headers.get("content-type") || "";
  if (!tipo.includes("multipart/form-data")) {
    const body = await request.json().catch(() => ({}));
    const nome = String(body.nome || "").trim();
    const mensagem = String(body.mensagem || "").trim();
    if (!nome) return errorJson("Informe um nome para o modelo.", 422);
    if (!mensagem) return errorJson("A mensagem não pode ficar vazia.", 422);
    if (body.id) {
      await atualizarModelo(Number(body.id), nome, mensagem);
      return json({ sucesso: true });
    }
    const id = await criarModelo(nome, mensagem);
    return json({ sucesso: true, id });
  }

  // Multipart — upload/remoção de PDF para um modelo existente
  const fd = await request.formData();
  const modeloId = Number(fd.get("id") || 0);
  if (!modeloId) return errorJson("ID do modelo é obrigatório.", 422);

  const modelo = await obterModelo(modeloId);
  if (!modelo) return errorJson("Modelo não encontrado.", 404);

  // Remoção do PDF
  if (String(fd.get("remover_pdf") || "") === "1") {
    if (modelo.pdf) {
      await unlink(resolveUploadPath(modelo.pdf)).catch(() => undefined);
      await setModeloPdf(modeloId, "");
    }
    return json({ sucesso: true });
  }

  // Upload de novo PDF
  const file = fd.get("pdf");
  if (file instanceof File && file.size > 0) {
    const ehPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!ehPdf) return errorJson("Envie um arquivo PDF.", 422);
    if (file.size > 16 * 1024 * 1024) return errorJson("PDF muito grande (máx. 16 MB).", 422);

    const dir = uploadsDir();
    await mkdir(dir, { recursive: true });
    const filename = `convite-modelo-${modeloId}-${Date.now()}.pdf`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), bytes);

    if (modelo.pdf && modelo.pdf !== filename) {
      await unlink(resolveUploadPath(modelo.pdf)).catch(() => undefined);
    }
    await setModeloPdf(modeloId, filename);
  }

  return json({ sucesso: true });
}

export async function DELETE(request: Request) {
  if (!(await requirePainelPermission("manage_convidados"))) return errorJson("Acesso negado.", 403);
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!id) return errorJson("ID inválido.", 422);

  const modelo = await obterModelo(id);
  if (modelo?.pdf) {
    await unlink(resolveUploadPath(modelo.pdf)).catch(() => undefined);
  }
  await excluirModelo(id);
  return json({ sucesso: true });
}
