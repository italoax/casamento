/**
 * SERVE O PDF DO CONVITE - GET /convite-whatsapp (público)
 *
 * ?modelo=ID  → PDF do modelo específico
 * sem param   → PDF do modelo padrão (rsvp_config) para retrocompatibilidade
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadsDir } from "@/lib/uploads";
import { getWhatsappModelo, obterModelo } from "@/lib/whatsapp-config";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const modeloId = Number(url.searchParams.get("modelo") || 0);

  let pdfFile = "";
  if (modeloId) {
    const m = await obterModelo(modeloId);
    pdfFile = m?.pdf || "";
  } else {
    const { pdf } = await getWhatsappModelo();
    pdfFile = pdf;
  }

  if (!pdfFile) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(uploadsDir(), path.basename(pdfFile)));
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="Convite.pdf"',
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
