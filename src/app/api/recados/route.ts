import { NextRequest } from "next/server";
import { queryRows, db } from "@/lib/db";
import { cleanText, clientIp } from "@/lib/http";
import { env, envBool } from "@/lib/env";
import { json, erro, validacaoErro } from "@/app/api/_middleware/responses";
import {
  validarCamposObrigatorios,
  validarComSchema,
} from "@/app/api/_middleware/validation";
import { validarEmail, validarNomeCompleto } from "@/lib/utils/validation";
import { Security, SafeLog } from "@/lib/security";
import type { Recado, RecadoResponse, RecadoSubmitResponse } from "@/lib/types/recado";
import { enviarNotificacaoRecado } from "@/lib/site-emails";

export const runtime = "nodejs";

async function ensureRecadosTable() {
  await db().execute(`CREATE TABLE IF NOT EXISTS recados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nome VARCHAR(80) NOT NULL,
    email VARCHAR(120) NOT NULL,
    mensagem TEXT NOT NULL,
    aprovado TINYINT(1) NOT NULL DEFAULT 0,
    ip VARCHAR(64) NULL,
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

/**
 * Valida token do reCAPTCHA com Google
 */
async function validarRecaptcha(token: string): Promise<boolean> {
  if (process.env.NODE_ENV !== "production" && envBool("DEV_BYPASS_RECAPTCHA", false)) return true;

  const secret = env("RECAPTCHA_SECRET");
  if (!secret || !token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = (await resp.json().catch(() => null)) as {
      success?: boolean;
      score?: number;
      action?: string;
    } | null;

    const minScore = Number(env("RECAPTCHA_MIN_SCORE", "0.5"));
    const requiredScore = Number.isFinite(minScore) ? minScore : 0.5;
    return Boolean(data?.success) && typeof data?.score === "number" && data.score >= requiredScore;
  } catch (error) {
    SafeLog.error("reCAPTCHA /api/recados", error);
    return false;
  }
}

/**
 * GET /api/recados - Lista recados aprovados
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);

  try {
    await ensureRecadosTable();

    const recados = (await queryRows(
      "SELECT id, nome, mensagem, created_at FROM recados WHERE aprovado = 1 ORDER BY created_at DESC LIMIT 50"
    )) as Recado[];

    return json<RecadoResponse>(
      {
        sucesso: true,
        recados,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    SafeLog.error("GET /api/recados", error);
    return erro("Falha temporária ao listar recados.", {
      status: 500,
      code: "LIST_ERROR",
      headers: corsHeaders,
    });
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: Security.corsHeaders(origin, request.url),
  });
}

/**
 * POST /api/recados - Criar novo recado
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);

  if (!Security.isAllowedOrigin(origin, request.url)) {
    return erro("Origem não autorizada.", {
      status: 403,
      code: "ORIGIN_NOT_ALLOWED",
      headers: corsHeaders,
    });
  }

  try {
    // Rate limiting: máx 10 requisições por 5 minutos
    const ip = Security.clientIp(request);
    if (!Security.checkRateLimit(`POST:recados:${ip}`, 10, 300)) {
      return erro("Muitas submissões. Aguarde alguns minutos.", {
        status: 429,
        code: "RATE_LIMITED",
        headers: corsHeaders,
      });
    }

    await ensureRecadosTable();

    // Parse e validação de dados
    const data = await request.json().catch(() => ({}));

    const errosValidacao = validarCamposObrigatorios(data, [
      "nome",
      "email",
      "mensagem",
      "recaptchaToken",
    ]);

    if (errosValidacao.length > 0) {
      return validacaoErro(
        Object.fromEntries(
          errosValidacao.map((e) => [e.field, e.message])
        ),
        { headers: corsHeaders }
      );
    }

    // Validação de schema
    const validacaoSchema = validarComSchema(data, {
      nome: (valor) => {
        const limpo = cleanText(valor, 80);
        return validarNomeCompleto(limpo)
          ? true
          : "Informe seu nome completo (nome e sobrenome).";
      },
      email: (valor) => {
        const limpo = cleanText(valor, 120);
        return validarEmail(limpo) ? true : "E-mail inválido.";
      },
      mensagem: (valor) => {
        const limpo = cleanText(valor, 600);
        return limpo.length >= 5
          ? true
          : "Escreva um recado com pelo menos 5 caracteres.";
      },
      recaptchaToken: (valor) => {
        return typeof valor === "string" && valor.length > 0
          ? true
          : "Token do reCAPTCHA inválido.";
      },
    });

    if (!validacaoSchema.valid) {
      return validacaoErro(
        Object.fromEntries(
          validacaoSchema.errors.map((e) => [e.field, e.message])
        ),
        { headers: corsHeaders }
      );
    }

    // Validar reCAPTCHA
    if (!(await validarRecaptcha(data.recaptchaToken))) {
      return erro("Falha na verificação do reCAPTCHA.", {
        status: 422,
        code: "RECAPTCHA_FAILED",
      });
    }

    // Limpar dados
    const nome = cleanText(data.nome, 80);
    const email = cleanText(data.email, 120);
    const mensagem = cleanText(data.mensagem, 600);

    // Inserir no banco
    const [result] = await db().execute(
      "INSERT INTO recados (nome, email, mensagem, aprovado, ip) VALUES (?, ?, ?, 0, ?)",
      [nome, email, mensagem, ip]
    );

    const id = Number((result as { insertId?: number }).insertId || 0);

    void enviarNotificacaoRecado({ nome, email, mensagem });

    return json<RecadoSubmitResponse>(
      {
        sucesso: true,
        id: String(id),
        mensagem: "Recado enviado com sucesso! Aguarde aprovação.",
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    SafeLog.error("POST /api/recados", error);
    return erro("Não foi possível salvar o recado.", {
      status: 500,
      code: "INSERT_ERROR",
      headers: corsHeaders,
    });
  }
}
