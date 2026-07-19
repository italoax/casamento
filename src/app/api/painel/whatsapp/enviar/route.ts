import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { convitePublicUrl, enviarDocumento, enviarTexto, type WhatsappSlot } from "@/lib/whatsapp";
import { obterModelo } from "@/lib/whatsapp-config";
import { jaEnviouConvidado, registrarEnvio } from "@/lib/whatsapp-log";

export const runtime = "nodejs";

function slotValido(v: unknown): v is WhatsappSlot {
  return v === "1" || v === "2" || v === "3";
}

export async function POST(request: Request) {
  if (!(await requirePainelPermission("manage_convidados"))) return errorJson("Acesso negado.", 403);
  const body = await request.json().catch(() => ({}));
  const slot = String(body.slot || "");
  const numero = String(body.numero || "").trim();
  const mensagem = String(body.mensagem || "").trim();
  const modeloId = Number(body.modeloId || 0) || null;

  const convidadoId = Number(body.convidadoId || 0) || null;
  const nomeLog = String(body.nome || "").trim() || numero;
  const listaLog = String(body.lista || "").trim() || null;
  const forcar = body.forcar === true || body.forcar === "1";

  if (!slotValido(slot)) return errorJson("Número de envio inválido.", 422);
  if (!numero) return errorJson("Telefone do destinatário ausente.", 422);
  if (!mensagem) return errorJson("Mensagem vazia.", 422);
  if (mensagem.length > 4000) return errorJson("Mensagem muito longa.", 422);

  if (convidadoId && !forcar && (await jaEnviouConvidado(convidadoId))) {
    return errorJson("Este convidado já recebeu a mensagem.", 409);
  }

  try {
    // Se o modelo tem PDF, envia como documento; senão, só texto.
    let temPdfModelo = false;
    if (modeloId) {
      const modelo = await obterModelo(modeloId);
      temPdfModelo = Boolean(modelo?.pdf);
    }

    if (temPdfModelo && modeloId) {
      const pdfUrl = convitePublicUrl() + `?modelo=${modeloId}`;
      const r = await enviarDocumento(slot, numero, pdfUrl, mensagem);
      await registrarEnvio({ convidadoId, nome: nomeLog, telefone: numero, lista: listaLog, sucesso: true, anexouPdf: true });
      return json({ sucesso: true, messageId: r.messageId });
    }
    const r = await enviarTexto(slot, numero, mensagem);
    await registrarEnvio({ convidadoId, nome: nomeLog, telefone: numero, lista: listaLog, sucesso: true, anexouPdf: false });
    return json({ sucesso: true, messageId: r.messageId });
  } catch (error) {
    const msg = (error as Error).message || "Falha ao enviar a mensagem.";
    await registrarEnvio({ convidadoId, nome: nomeLog, telefone: numero, lista: listaLog, sucesso: false, erro: msg, anexouPdf: false });
    return errorJson(msg, 502);
  }
}
