/**
 * Sessão do mural de fotos — libera o aparelho para enviar.
 *
 * GET  -> informa se este aparelho já está liberado.
 * POST -> valida o Turnstile e entrega o cookie assinado (24h).
 *
 * Substitui a antiga verificação por e-mail com código: numa festa, mandar o
 * convidado abrir a caixa de entrada custa a maior parte das fotos. O captcha
 * resolve o que realmente importa aqui (barrar robôs), e um único desafio
 * libera a noite toda — o token do Turnstile é de uso único, então pedir um por
 * foto inviabilizaria o envio de várias de uma vez.
 *
 * Contra conteúdo indevido a proteção não é esta: toda foto entra pendente e só
 * aparece no álbum após aprovação no painel.
 */

import { Security, SafeLog } from "@/lib/security";
import { validateCaptcha } from "@/lib/captcha";
import { cookieFesta, aparelhoLiberado } from "@/lib/festa-auth";

export const runtime = "nodejs";

/** Identidade genérica: não pedimos mais e-mail, mas o token exige um sujeito. */
const CONVIDADO = "convidado";

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: Security.corsHeaders(request.headers.get("origin"), request.url),
  });
}

export async function GET(request: Request) {
  const corsHeaders = Security.corsHeaders(request.headers.get("origin"), request.url);
  return Response.json({ sucesso: true, liberado: Boolean(aparelhoLiberado(request)) }, { headers: corsHeaders });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);

  if (!Security.isAllowedOrigin(origin, request.url)) {
    return Response.json({ sucesso: false, erro: "Origem não autorizada." }, { status: 403, headers: corsHeaders });
  }

  try {
    const ip = Security.clientIp(request);
    if (!Security.checkRateLimit(`POST:festa-sessao:${ip}`, 10, 300)) {
      return Response.json({ sucesso: false, erro: "Muitas tentativas. Aguarde um pouquinho." }, { status: 429, headers: corsHeaders });
    }

    const body = await request.json().catch(() => ({}));
    const token = String(body?.turnstileToken || "");
    if (!(await validateCaptcha(token, request, "festa"))) {
      return Response.json({ sucesso: false, erro: "Verificação de segurança falhou. Tente de novo." }, { status: 403, headers: corsHeaders });
    }

    return Response.json(
      { sucesso: true, liberado: true },
      { status: 200, headers: { ...corsHeaders, "Set-Cookie": cookieFesta(CONVIDADO) } },
    );
  } catch (error) {
    SafeLog.error("POST /api/festa/sessao", error);
    return Response.json({ sucesso: false, erro: "Falha ao liberar o envio." }, { status: 500, headers: corsHeaders });
  }
}
