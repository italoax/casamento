/**
 * WHATSAPP - Integração com a API self-hosted (Baileys) do gestor.
 *
 * A API (pacote whatsapp-api) trabalha com "sessões" nomeadas: cada número de
 * WhatsApp é uma sessão. Aqui suportamos 2 números (slot 1 e slot 2), mapeados
 * para os nomes de sessão definidos no .env.
 *
 * Variáveis de ambiente:
 *   WHATSAPP_API_URL    -> URL base da API (ex.: https://whatsapp.seudominio.com)
 *   WHATSAPP_API_TOKEN  -> token enviado no header "token"
 *   WHATSAPP_SESSAO_1   -> nome da sessão do número 1 (padrão "casa1")
 *   WHATSAPP_SESSAO_2   -> nome da sessão do número 2 (padrão "casa2")
 *   WHATSAPP_PAIS       -> DDI padrão para normalizar telefones (padrão "55")
 */

import { env } from "./env";

export type WhatsappSlot = "1" | "2" | "3";

export type WhatsappState = {
  session: string;
  status: string;
  connected: boolean;
  number?: string;
  qrImage?: string;
  pairingCode?: string;
  lastError?: string;
};

function baseUrl(): string {
  return env("WHATSAPP_API_URL").replace(/\/+$/, "");
}

export function whatsappConfigurado(): boolean {
  return Boolean(baseUrl() && env("WHATSAPP_API_TOKEN"));
}

/** Mapeia o slot (1/2/3) para o nome da sessão configurado no .env. */
export function sessionDoSlot(slot: WhatsappSlot): string {
  if (slot === "3") return env("WHATSAPP_SESSAO_3", "casa3");
  if (slot === "2") return env("WHATSAPP_SESSAO_2", "casa2");
  return env("WHATSAPP_SESSAO_1", "casa1");
}

/** Normaliza um telefone BR para o formato com DDI: 55 + DDD + número. */
export function normalizarTelefone(valor: unknown): string {
  let d = String(valor || "").replace(/\D+/g, "");
  if (!d) return "";
  // Remove zeros à esquerda e DDI duplicado.
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length > 11) d = d.slice(-11);
  if (d.length < 10) return ""; // telefone inválido (sem DDD)
  const pais = env("WHATSAPP_PAIS", "55").replace(/\D+/g, "") || "55";
  return `${pais}${d}`;
}

async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 20000,
): Promise<T> {
  const url = baseUrl();
  const token = env("WHATSAPP_API_TOKEN");
  if (!url || !token) throw new Error("WhatsApp não configurado no servidor (.env).");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(`${url}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        token,
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });
    const body = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
    if (!resp.ok || body.ok === false) {
      const msg = (body.error as string) || `Falha na API de WhatsApp (HTTP ${resp.status}).`;
      throw new Error(msg);
    }
    return body as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A API de WhatsApp não respondeu a tempo.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function obterStatus(slot: WhatsappSlot): Promise<WhatsappState> {
  const session = sessionDoSlot(slot);
  const data = await apiFetch<WhatsappState>(`/session/status/${encodeURIComponent(session)}`);
  return { ...data, session };
}

/** Inicia a sessão (gera QR Code para leitura no celular). */
export async function iniciarSessao(slot: WhatsappSlot): Promise<WhatsappState> {
  const session = sessionDoSlot(slot);
  const data = await apiFetch<WhatsappState>(`/session/start/${encodeURIComponent(session)}`, { method: "POST" });
  return { ...data, session };
}

/** Desconecta (logout) o aparelho e libera a vinculação de outro número. */
export async function desconectarSessao(slot: WhatsappSlot): Promise<WhatsappState> {
  const session = sessionDoSlot(slot);
  const data = await apiFetch<WhatsappState>(`/session/logout/${encodeURIComponent(session)}`, { method: "POST" });
  return { ...data, session };
}

export type ChecagemNumero = { number: string; exists: boolean; jid?: string; incerto?: boolean };

/** Checa em lote se cada número tem WhatsApp (usa a sessão conectada do slot). */
export async function checarNumeros(slot: WhatsappSlot, numeros: string[]): Promise<ChecagemNumero[]> {
  const session = sessionDoSlot(slot);
  const data = await apiFetch<{ results?: ChecagemNumero[] }>(
    `/api/numbers/check`,
    { method: "POST", body: JSON.stringify({ session, numbers: numeros }) },
    60000, // checar muitos números pode demorar
  );
  return Array.isArray(data.results) ? data.results : [];
}

/** Envia uma mensagem de texto por um dos números. */
export async function enviarTexto(slot: WhatsappSlot, numero: string, mensagem: string): Promise<{ messageId: string }> {
  const session = sessionDoSlot(slot);
  const tel = normalizarTelefone(numero);
  if (!tel) throw new Error("Telefone inválido.");
  const data = await apiFetch<{ messageId?: string }>(`/api/messages/send`, {
    method: "POST",
    body: JSON.stringify({ session, number: tel, body: mensagem }),
  });
  return { messageId: data.messageId || "" };
}

/**
 * Envia um documento (PDF do convite) com a mensagem como legenda (texto embaixo).
 * mediaUrl precisa ser uma URL pública que a API consiga baixar.
 */
export async function enviarDocumento(
  slot: WhatsappSlot,
  numero: string,
  mediaUrl: string,
  caption: string,
  fileName = "Convite Casamento E&I.pdf",
): Promise<{ messageId: string }> {
  const session = sessionDoSlot(slot);
  const tel = normalizarTelefone(numero);
  if (!tel) throw new Error("Telefone inválido.");
  const data = await apiFetch<{ messageId?: string }>(
    `/api/messages/send/media`,
    {
      method: "POST",
      body: JSON.stringify({ session, number: tel, mediaUrl, caption, type: "document", fileName }),
    },
    60000, // download + envio de mídia pode demorar mais
  );
  return { messageId: data.messageId || "" };
}

/** URL pública do PDF do convite (servido por /convite-whatsapp). */
export function convitePublicUrl(): string {
  const base = (env("BASE_URL") || env("WHATSAPP_API_URL")).replace(/\/+$/, "");
  return `${base}/convite-whatsapp`;
}
