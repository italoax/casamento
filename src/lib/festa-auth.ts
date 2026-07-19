/**
 * Autenticação leve do mural de fotos da festa.
 *
 * Depois que o convidado confirma o código enviado por e-mail, o aparelho recebe
 * um cookie assinado (HMAC) que o libera para enviar fotos a noite toda, sem
 * pedir o código de novo. O cookie guarda o e-mail verificado e uma validade.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export const FESTA_COOKIE = "festa_auth";
const VALIDADE_HORAS = 24;

function secret(): string {
  return env("RSVP_TOKEN_SECRET", "") || env("SESSION_SECRET", "") || "festa-fallback-secret";
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function assinar(payload: string): string {
  return b64url(createHmac("sha256", secret()).update(payload).digest());
}

/** Gera o token assinado para um e-mail verificado (válido por 24h). */
export function gerarTokenFesta(email: string): string {
  const dados = { email: email.toLowerCase(), exp: Date.now() + VALIDADE_HORAS * 3600 * 1000 };
  const payload = b64url(JSON.stringify(dados));
  return `${payload}.${assinar(payload)}`;
}

/** Valida o token e devolve o e-mail verificado, ou null se inválido/expirado. */
export function lerTokenFesta(token: string | undefined | null): string | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const esperado = assinar(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const dados = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    if (!dados?.email || typeof dados.exp !== "number" || dados.exp < Date.now()) return null;
    return String(dados.email);
  } catch {
    return null;
  }
}

/** Lê o e-mail verificado a partir do cabeçalho Cookie de uma requisição. */
export function emailVerificado(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(`${FESTA_COOKIE}=`));
  if (!match) return null;
  return lerTokenFesta(decodeURIComponent(match.slice(FESTA_COOKIE.length + 1)));
}

/** Monta o valor do cabeçalho Set-Cookie com o token (httpOnly, 24h). */
export function cookieFesta(email: string): string {
  const token = gerarTokenFesta(email);
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${FESTA_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${VALIDADE_HORAS * 3600}; HttpOnly;${secure} SameSite=Lax`;
}
