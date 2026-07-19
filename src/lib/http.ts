/**
 * HTTP UTILITIES - Helpers para Respostas HTTP
 * 
 * Centraliza a construção de respostas JSON padrão da aplicação.
 * Usado em todas as API routes para manter consistência de formato.
 */

import { NextResponse } from "next/server";

/**
 * Retorna resposta JSON com status HTTP
 * @param data Dados para resposta
 * @param statusOrInit Status HTTP ou objeto ResponseInit
 * @returns NextResponse formatado
 */
export function json(data: unknown, statusOrInit: number | ResponseInit = 200, init: ResponseInit = {}) {
  const responseInit = typeof statusOrInit === "number" ? { ...init, status: statusOrInit } : statusOrInit;
  return NextResponse.json(data, responseInit);
}

/**
 * Retorna resposta de erro padrão
 * Formato: { sucesso: false, erro: "mensagem" }
 * @param message Mensagem de erro
 * @param status Status HTTP (padrão: 400)
 */
export function errorJson(message: string, status = 400, init: ResponseInit = {}) {
  return json({ sucesso: false, erro: message }, status, init);
}

/**
 * Limpa texto removendo HTML tags e truncando
 * Proteção contra XSS e dados muito grandes
 * @param value Texto a limpar
 * @param max Tamanho máximo (padrão: 255 caracteres)
 */
export function cleanText(value: unknown, max = 255) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")  // Remove tags HTML
    .trim()
    .slice(0, max);
}

/**
 * Extrai o IP real do cliente quando o app está atrás de um proxy.
 *
 * Atrás da Cloudflare, o IP confiável é o CF-Connecting-IP: a Cloudflare o
 * define e o SOBRESCREVE, então o cliente não consegue forjá-lo. Confiar no
 * primeiro X-Forwarded-For seria inseguro — qualquer um pode mandar esse header
 * e, com isso, burlar rate limit / bloqueio de força-bruta (ex.: dígitos do RSVP).
 */
export function clientIp(request: Request) {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  // Fallback (sem Cloudflare): primeiro hop do XFF. Spoofável, mas é o melhor
  // disponível e nessa hospedagem o tráfego passa pela Cloudflare.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}
