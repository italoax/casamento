/**
 * Autenticação leve do mural de fotos da festa.
 *
 * Depois de resolver o Turnstile uma vez (em /api/festa/sessao), o aparelho
 * recebe um cookie assinado (HMAC) que o libera para enviar fotos a noite
 * toda — o token do captcha é de uso único, então revalidá-lo a cada foto
 * impediria o envio de várias de uma vez.
 *
 * Antes o cookie era emitido após confirmar um código por e-mail; isso saiu do
 * caminho porque, numa festa, mandar o convidado abrir a caixa de entrada
 * custava a maior parte das fotos. Contra conteúdo indevido a proteção passou a
 * ser a moderação: toda foto entra pendente e só aparece depois de aprovada.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

const FESTA_COOKIE = "festa_auth";
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

/** Gera o token assinado do aparelho liberado (válido por 24h). */
function gerarTokenFesta(identidade: string): string {
  const dados = { email: identidade.toLowerCase(), exp: Date.now() + VALIDADE_HORAS * 3600 * 1000 };
  const payload = b64url(JSON.stringify(dados));
  return `${payload}.${assinar(payload)}`;
}

/** Valida o token e devolve a identidade guardada, ou null se inválido/expirado. */
function lerTokenFesta(token: string | undefined | null): string | null {
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

/**
 * Diz se este aparelho já passou pelo captcha (lendo o cookie da requisição).
 * Devolve a identidade guardada no token, ou null se não liberado.
 */
export function aparelhoLiberado(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(`${FESTA_COOKIE}=`));
  if (!match) return null;
  return lerTokenFesta(decodeURIComponent(match.slice(FESTA_COOKIE.length + 1)));
}

/** Monta o valor do cabeçalho Set-Cookie com o token (httpOnly, 24h). */
export function cookieFesta(identidade: string): string {
  const token = gerarTokenFesta(identidade);
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${FESTA_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${VALIDADE_HORAS * 3600}; HttpOnly;${secure} SameSite=Lax`;
}
