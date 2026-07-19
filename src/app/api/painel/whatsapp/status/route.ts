import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { obterStatus, whatsappConfigurado, type WhatsappSlot } from "@/lib/whatsapp";

export const runtime = "nodejs";

async function statusSeguro(slot: WhatsappSlot) {
  try {
    const s = await obterStatus(slot);
    return { slot, session: s.session, status: s.status, connected: Boolean(s.connected), number: s.number || "", erro: "" };
  } catch (error) {
    return { slot, session: "", status: "indisponivel", connected: false, number: "", erro: (error as Error).message };
  }
}

export async function GET() {
  if (!(await requirePainelPermission("manage_convidados"))) return errorJson("Acesso negado.", 403);
  if (!whatsappConfigurado()) {
    return json({ sucesso: true, configurado: false, numeros: [] });
  }
  const n1 = await statusSeguro("1");
  return json({ sucesso: true, configurado: true, numeros: [n1] });
}
