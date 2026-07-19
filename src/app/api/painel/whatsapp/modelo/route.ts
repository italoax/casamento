import { mkdir, unlink, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { uploadsDir, resolveUploadPath } from "@/lib/uploads";
import { getWhatsappModelo, setWhatsappMensagem, setWhatsappPdf } from "@/lib/whatsapp-config";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requirePainelPermission("manage_convidados"))) return errorJson("Acesso negado.", 403);
  const modelo = await getWhatsappModelo();
  return json({ sucesso: true, mensagem: modelo.mensagem, temPdf: Boolean(modelo.pdf), pdfUrl: modelo.pdf ? "/convite-whatsapp" : "" });
}

export async function POST(request: Request) {
  if (!(await requirePainelPermission("manage_convidados"))) return errorJson("Acesso negado.", 403);

  const tipo = request.headers.get("content-type") || "";
  if (!tipo.includes("multipart/form-data")) {
    // Apenas mensagem (JSON).
    const body = await request.json().catch(() => ({}));
    await setWhatsappMensagem(String(body.mensagem || ""));
    return json({ sucesso: true });
  }

  const fd = await request.formData();
  const mensagem = String(fd.get("mensagem") || "");
  await setWhatsappMensagem(mensagem);

  // Remoção do PDF atual.
  if (String(fd.get("remover_pdf") || "") === "1") {
    const atual = await getWhatsappModelo();
    if (atual.pdf) {
      await unlink(resolveUploadPath(atual.pdf)).catch(() => undefined);
      await setWhatsappPdf("");
    }
    return json({ sucesso: true });
  }

  // Upload de novo PDF.
  const file = fd.get("pdf");
  if (file instanceof File && file.size > 0) {
    const ehPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!ehPdf) return errorJson("Envie um arquivo PDF.", 422);
    if (file.size > 16 * 1024 * 1024) return errorJson("PDF muito grande (máx. 16 MB).", 422);

    const dir = uploadsDir();
    await mkdir(dir, { recursive: true });
    const filename = `convite-whatsapp-${Date.now()}.pdf`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), bytes);

    // Remove o PDF anterior, se houver.
    const atual = await getWhatsappModelo();
    if (atual.pdf && atual.pdf !== filename) {
      await unlink(resolveUploadPath(atual.pdf)).catch(() => undefined);
    }
    await setWhatsappPdf(filename);
  }

  return json({ sucesso: true });
}
