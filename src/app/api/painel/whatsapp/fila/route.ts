import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { SafeLog } from "@/lib/security";
import { enfileirarJob, statusJobAtual, type Destinatario } from "@/lib/whatsapp-queue";
import type { WhatsappSlot } from "@/lib/whatsapp";

export const runtime = "nodejs";

function slotValido(v: unknown): v is WhatsappSlot {
  return v === "1" || v === "2" || v === "3";
}

export async function GET() {
  if (!(await requirePainelPermission("manage_convidados"))) return errorJson("Acesso negado.", 403);
  try {
    const { job, itens } = await statusJobAtual();
    return json({ sucesso: true, job, itens });
  } catch (error) {
    SafeLog.error("GET /api/painel/whatsapp/fila", error);
    return errorJson("Falha ao consultar a fila.", 500);
  }
}

export async function POST(request: Request) {
  if (!(await requirePainelPermission("manage_convidados"))) return errorJson("Acesso negado.", 403);
  const body = await request.json().catch(() => ({}));
  const slot = String(body.slot || "");
  if (!slotValido(slot)) return errorJson("Número de envio inválido.", 422);

  const destinatarios: Destinatario[] = Array.isArray(body.destinatarios)
    ? body.destinatarios.map((d: Record<string, unknown>) => ({
        id: d.id != null ? Number(d.id) : null,
        nome: String(d.nome || ""),
        telefone: String(d.telefone || ""),
        lista: d.lista != null ? String(d.lista) : null,
      }))
    : [];

  try {
    const { jobId } = await enfileirarJob({
      slot,
      modeloId: body.modeloId != null ? Number(body.modeloId) : null,
      mensagem: String(body.mensagem || ""),
      anexarPdf: body.anexarPdf === true || body.anexarPdf === "1",
      intervalo: Number(body.intervalo) || 0,
      destinatarios,
    });
    return json({ sucesso: true, jobId });
  } catch (error) {
    SafeLog.error("POST /api/painel/whatsapp/fila", error);
    return errorJson((error as Error).message || "Falha ao criar o disparo.", 400);
  }
}
