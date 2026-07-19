/**
 * Confirma o código de 6 dígitos enviado por e-mail.
 * POST /api/festa/verificar/confirmar { email, codigo }
 * Em caso de sucesso, define o cookie assinado que libera o envio de fotos.
 */

import { NextRequest } from "next/server";
import { execute, queryOne } from "@/lib/db";
import { cleanText } from "@/lib/http";
import { validarEmail } from "@/lib/utils/validation";
import { Security, SafeLog } from "@/lib/security";
import { cookieFesta } from "@/lib/festa-auth";
import { ensureTabelaVerificacao, hashCodigo } from "../route";

export const runtime = "nodejs";

const MAX_TENTATIVAS = 6;

export function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new Response(null, { status: 204, headers: Security.corsHeaders(origin, request.url) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);

  if (!Security.isAllowedOrigin(origin, request.url)) {
    return Response.json({ sucesso: false, erro: "Origem não autorizada." }, { status: 403, headers: corsHeaders });
  }

  try {
    const ip = Security.clientIp(request);
    if (!Security.checkRateLimit(`POST:festa-confirmar:${ip}`, 20, 600)) {
      return Response.json({ sucesso: false, erro: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429, headers: corsHeaders });
    }

    const data = await request.json().catch(() => ({}));
    const email = cleanText(data.email, 160).toLowerCase();
    const codigo = cleanText(data.codigo, 8).replace(/\D/g, "");

    if (!validarEmail(email) || codigo.length !== 6) {
      return Response.json({ sucesso: false, erro: "E-mail ou código inválido." }, { status: 422, headers: corsHeaders });
    }

    await ensureTabelaVerificacao();
    const row = await queryOne<{ codigo_hash: string; expira: string | Date; tentativas: number }>(
      "SELECT codigo_hash, expira, tentativas FROM festa_verificacoes WHERE email = ? LIMIT 1",
      [email],
    );

    if (!row) {
      return Response.json({ sucesso: false, erro: "Peça um novo código." }, { status: 410, headers: corsHeaders });
    }
    if (Number(row.tentativas) >= MAX_TENTATIVAS) {
      return Response.json({ sucesso: false, erro: "Muitas tentativas. Peça um novo código." }, { status: 429, headers: corsHeaders });
    }
    if (new Date(row.expira).getTime() < Date.now()) {
      return Response.json({ sucesso: false, erro: "Código expirado. Peça um novo." }, { status: 410, headers: corsHeaders });
    }
    if (row.codigo_hash !== hashCodigo(email, codigo)) {
      await execute("UPDATE festa_verificacoes SET tentativas = tentativas + 1 WHERE email = ?", [email]).catch(() => undefined);
      return Response.json({ sucesso: false, erro: "Código incorreto." }, { status: 422, headers: corsHeaders });
    }

    // Sucesso: remove o código usado e libera o aparelho via cookie assinado.
    await execute("DELETE FROM festa_verificacoes WHERE email = ?", [email]).catch(() => undefined);

    const headers = new Headers(corsHeaders);
    headers.append("Set-Cookie", cookieFesta(email));
    headers.set("Cache-Control", "no-store");
    return Response.json({ sucesso: true, email }, { headers });
  } catch (error) {
    SafeLog.error("POST /api/festa/verificar/confirmar", error);
    return Response.json({ sucesso: false, erro: "Falha ao confirmar o código." }, { status: 500, headers: corsHeaders });
  }
}
