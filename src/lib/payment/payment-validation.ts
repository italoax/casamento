/**
 * Validações de entrada e segurança
 * Valida recaptcha e dados de pagamento
 */

import { env, envBool } from "../env";

export async function validateRecaptcha(token: string, action: string, request?: Request): Promise<boolean> {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction && envBool("DEV_BYPASS_RECAPTCHA", false)) return true;

  const secret = env("RECAPTCHA_SECRET");
  if (!secret || !token) return false;

  const body = new URLSearchParams({ secret, response: token });
  const ip = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) body.set("remoteip", ip);

  const resp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await resp.json().catch(() => null)) as { success?: boolean; score?: number; action?: string } | null;
  if (!data?.success) return false;
  if (data.action && data.action !== action) return false;

  const minScore = Number(env("RECAPTCHA_MIN_SCORE", "0.5"));
  const requiredScore = Number.isFinite(minScore) ? minScore : 0.5;
  return typeof data.score === "number" && data.score >= requiredScore;
}
