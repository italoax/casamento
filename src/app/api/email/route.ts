/**
 * EMAIL ROUTE - /api/email
 * 
 * API interna para enviar diferentes tipos de e-mails.
 * Requer token de autenticação no header X-API-Token.
 * 
 * Tipos de e-mail:
 * - enviar_notificacao_recado: notifica admin de novo recado
 * - enviar_comprovante_aprovado: comprovante de pagamento aprovado
 * - enviar_cartao_recusado: notificação de cartão recusado
 * - enviar_pix: informações de pagamento PIX
 * - enviar_confirmacao_presenca: confirmação de RSVP
 * 
 * POST /api/email - Envia e-mail
 * OPTIONS /api/email - CORS preflight
 */

import { errorJson, json } from "@/lib/http";
import { env } from "@/lib/env";
import { Security } from "@/lib/security";
import {
  enviarCartaoRecusado,
  enviarComprovanteAprovado,
  enviarConfirmacaoPresenca,
  enviarNotificacaoRecado,
  enviarPix,
} from "@/lib/site-emails";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  // CORS preflight
  const origin = request.headers.get("origin");
  return new Response(null, { status: 204, headers: Security.corsHeaders(origin, request.url) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);
  
  // Autenticação por token
  const token = env("EMAIL_API_TOKEN", "");

  if (token && request.headers.get("x-api-token") !== token) {
    return errorJson("Acesso negado", 403, { headers: corsHeaders });
  }

  // Rate limiting por IP: máximo 120 requisições a cada 5 minutos (300 segundos)
  const ip = Security.clientIp(request);
  if (!Security.checkRateLimit(`POST:email:${ip}`, 120, 300)) {
    return errorJson("Muitas tentativas. Aguarde alguns minutos.", 429, { headers: corsHeaders });
  }

  // Parse do payload
  const data = await request.json().catch(() => ({}));
  const acao = String(data.acao || "");
  let enviado = false;

  // Rota para cada tipo de e-mail
  if (acao === "enviar_notificacao_recado") {
    // Novo recado enviado por convidado
    enviado = await enviarNotificacaoRecado({ nome: data.nome || "Convidado", email: data.email_remetente || data.email || "", mensagem: data.mensagem || "" });
  } else if (acao === "enviar_comprovante_aprovado") {
    // Pagamento aprovado - envia comprovante
    enviado = await enviarComprovanteAprovado({ email: data.email || "", nome: data.nome || "Convidado", itens: data.itens || "", total: Number(data.total || 0) });
  } else if (acao === "enviar_cartao_recusado") {
    // Cartão recusado - avisa o convidado
    enviado = await enviarCartaoRecusado({ email: data.email || "", nome: data.nome || "Convidado", motivo: data.motivo || "", itens: data.itens || "", total: Number(data.total || 0) });
  } else if (acao === "enviar_pix") {
    // PIX gerado - envia QR code e instruções
    enviado = await enviarPix({ email: data.email || "", nome: data.nome || "Convidado", total: Number(data.total || 0), vencimento: data.vencimento || data.date_of_expiration || "", qrCode: data.qr_code || "", qrCodeBase64: data.qr_code_base64 || "" });
  } else if (acao === "enviar_confirmacao_presenca") {
    // Confirmação de presença - resumo de quem confirmou
    enviado = await enviarConfirmacaoPresenca({ email: data.email || "", nomeConvite: data.nome_convite || "Convidado", qtd: Number(data.qtd || 0), nomesConfirmados: data.nomes_confirmados || "", observacoes: data.resumo?.observacoes || data.observacoes || "" });
  } else {
    return errorJson("ação inválida.", 400, { headers: corsHeaders });
  }

  return json(enviado ? { sucesso: true } : { sucesso: false, erro: "Falha ao enviar e-mail" }, { headers: corsHeaders });
}
