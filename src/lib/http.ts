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
 * Extrai IP do cliente a partir do header X-Forwarded-For
 * Usado quando a aplicação está atrás de um proxy (nginx, cloudflare, etc)
 */
export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}
