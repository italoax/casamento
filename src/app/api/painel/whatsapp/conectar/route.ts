import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { SafeLog } from "@/lib/security";
import { desconectarSessao, iniciarSessao, obterStatus, type WhatsappSlot } from "@/lib/whatsapp";

export const runtime = "nodejs";

function slotValido(v: unknown): v is WhatsappSlot {
  return v === "1" || v === "2" || v === "3";
}

export async function POST(request: Request) {
  if (!(await requirePainelPermission("manage_convidados"))) return errorJson("Acesso negado.", 403);
  const body = await request.json().catch(() => ({}));
  const slot = String(body.slot || "");
  if (!slotValido(slot)) return errorJson("Número inválido.", 422);
  const acao = String(body.acao || "qr");

  try {
    if (acao === "status") {
      const estado = await obterStatus(slot);
      return json({ sucesso: true, estado });
    }
    if (acao === "desligar") {
      const estado = await desconectarSessao(slot);
      return json({ sucesso: true, estado });
    }
    // padrão: inicia a sessão e retorna o QR Code
    const estado = await iniciarSessao(slot);
    return json({ sucesso: true, estado });
  } catch (error) {
    SafeLog.error(`POST /api/painel/whatsapp/conectar (acao=${acao}, slot=${slot})`, error);
    return errorJson((error as Error).message || "Falha ao conectar o WhatsApp.", 502);
  }
}
