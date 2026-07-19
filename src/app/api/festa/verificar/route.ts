/**
 * Verificação de e-mail do mural de fotos.
 * GET  /api/festa/verificar  -> diz se o aparelho já está verificado (cookie).
 * POST /api/festa/verificar  -> envia um código de 6 dígitos para o e-mail.
 *
 * Confirmação do código: /api/festa/verificar/confirmar.
 */

import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { execute } from "@/lib/db";
import { cleanText } from "@/lib/http";
import { validateCaptcha } from "@/lib/captcha";
import { validarEmail } from "@/lib/utils/validation";
import { Security, SafeLog } from "@/lib/security";
import { enviarCodigoFesta } from "@/lib/site-emails";
import { emailVerificado } from "@/lib/festa-auth";

export const runtime = "nodejs";

const VALIDADE_MIN = 15;

export async function ensureTabelaVerificacao() {
  await execute(`CREATE TABLE IF NOT EXISTS festa_verificacoes (
    email VARCHAR(160) NOT NULL PRIMARY KEY,
    codigo_hash CHAR(64) NOT NULL,
    expira DATETIME NOT NULL,
    tentativas INT NOT NULL DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

export function hashCodigo(email: string, codigo: string): string {
  return createHash("sha256").update(`${email.toLowerCase()}:${codigo}`).digest("hex");
}

export function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new Response(null, { status: 204, headers: Security.corsHeaders(origin, request.url) });
}

export function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);
  const email = emailVerificado(request);
  return Response.json(
    { sucesso: true, verificado: Boolean(email), email: email || "" },
    { headers: { ...corsHeaders, "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);

  if (!Security.isAllowedOrigin(origin, request.url)) {
    return Response.json({ sucesso: false, erro: "Origem não autorizada." }, { status: 403, headers: corsHeaders });
  }

  try {
    const ip = Security.clientIp(request);
    if (!Security.checkRateLimit(`POST:festa-codigo:${ip}`, 10, 600)) {
      return Response.json({ sucesso: false, erro: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429, headers: corsHeaders });
    }

    const data = await request.json().catch(() => ({}));
    const email = cleanText(data.email, 160).toLowerCase();
    const token = String(data.turnstileToken || data["cf-turnstile-response"] || "");

    if (!validarEmail(email)) {
      return Response.json({ sucesso: false, erro: "Informe um e-mail válido." }, { status: 422, headers: corsHeaders });
    }
    // Limite por e-mail (evita reenvio em massa para um endereço).
    if (!Security.checkRateLimit(`POST:festa-codigo-email:${email}`, 5, 600)) {
      return Response.json({ sucesso: false, erro: "Já enviamos vários códigos. Verifique seu e-mail ou aguarde." }, { status: 429, headers: corsHeaders });
    }
    if (!(await validateCaptcha(token, request, "festa"))) {
      return Response.json({ sucesso: false, erro: "Falha na verificação de segurança." }, { status: 422, headers: corsHeaders });
    }

    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const expira = new Date(Date.now() + VALIDADE_MIN * 60 * 1000);

    await ensureTabelaVerificacao();
    await execute(
      `INSERT INTO festa_verificacoes (email, codigo_hash, expira, tentativas)
       VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE codigo_hash = VALUES(codigo_hash), expira = VALUES(expira), tentativas = 0`,
      [email, hashCodigo(email, codigo), expira],
    );

    const enviado = await enviarCodigoFesta({ email, codigo });
    if (!enviado) {
      return Response.json({ sucesso: false, erro: "Não foi possível enviar o e-mail. Confira o endereço." }, { status: 502, headers: corsHeaders });
    }

    return Response.json({ sucesso: true, mensagem: "Código enviado para o seu e-mail." }, { headers: corsHeaders });
  } catch (error) {
    SafeLog.error("POST /api/festa/verificar", error);
    return Response.json({ sucesso: false, erro: "Falha ao enviar o código." }, { status: 500, headers: corsHeaders });
  }
}
