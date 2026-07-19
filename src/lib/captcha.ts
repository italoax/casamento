/**
 * Validação de captcha — Cloudflare Turnstile.
 *
 * Substitui o antigo Google reCAPTCHA v3. O Turnstile retorna apenas
 * sucesso/falha (não há "score"), então a validação é `success === true`
 * (com checagem opcional da ação). Em dev, DEV_BYPASS_RECAPTCHA=true pula tudo.
 */

import { env, envBool } from "./env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function validateCaptcha(token: string, request?: Request, action?: string): Promise<boolean> {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction && envBool("DEV_BYPASS_RECAPTCHA", false)) return true;

  const secret = env("TURNSTILE_SECRET");
  if (!secret || !token) return false;

  const body = new URLSearchParams({ secret, response: token });
  const ip = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) body.set("remoteip", ip);

  try {
    const resp = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await resp.json().catch(() => null)) as { success?: boolean; action?: string } | null;
    if (!data?.success) return false;
    // O Turnstile devolve a ação quando ela é definida no widget; se vier e divergir, recusa.
    if (action && data.action && data.action !== action) return false;
    return true;
  } catch {
    return false;
  }
}
