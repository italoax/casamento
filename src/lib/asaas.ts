/**
 * ASAAS CLIENT - Integração com a API de cobranças do Asaas.
 *
 * Pix e cartão usam a mesma API REST de "payments" (cobranças), autenticada pelo
 * header `access_token` (API key). Não há certificado mTLS nem SDK no navegador:
 * o cartão é processado server-side (checkout transparente via backend).
 *
 * Docs: https://docs.asaas.com/
 */

import { env } from "./env";
import { clean, digits } from "./payment/payment-utils";
import { cardExpiration } from "./payment/payment-card-utils";
import type { CheckoutPayload, CustomerData, DbRow } from "./payment/payment-types";

type AsaasCustomer = { id?: string };

type AsaasPayment = {
  id?: string;
  status?: string;
  value?: number;
  dueDate?: string;
  externalReference?: string;
};

type AsaasPixQrCode = {
  encodedImage?: string;
  payload?: string;
  expirationDate?: string;
};

type AsaasErrorBody = { errors?: Array<{ code?: string; description?: string }> };

function asaasBaseUrl(): string {
  const explicit = env("ASAAS_BASE_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  const environment = (env("ASAAS_ENV", "production") || "production").toLowerCase();
  return environment === "sandbox"
    ? "https://api-sandbox.asaas.com/v3"
    : "https://api.asaas.com/v3";
}

let asaasKeyWarned = false;

function asaasApiKey(): string {
  // Preferimos a versão base64 quando existir: a chave do Asaas começa com "$",
  // e alguns painéis/ambientes (ex.: Hostinger) "expandem" variáveis que começam
  // com "$", corrompendo a chave. ASAAS_API_KEY_B64 evita o problema (sem "$").
  const b64 = env("ASAAS_API_KEY_B64");
  let key = b64 ? Buffer.from(b64, "base64").toString("utf8").trim() : "";
  if (!key) key = env("ASAAS_API_KEY") || env("ASAAS_ACCESS_TOKEN");
  // Remove aspas acidentais coladas no painel de variáveis.
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  key = key.trim();
  if (!key) throw new Error("Credenciais do Asaas não configuradas: informe ASAAS_API_KEY.");

  // Diagnóstico (mascarado): se a chave não tiver o formato esperado, provavelmente
  // foi corrompida pelo ambiente (ex.: "$" expandido). Logamos só prefixo/sufixo.
  if (!asaasKeyWarned && !key.startsWith("$aact_")) {
    asaasKeyWarned = true;
    const masked = `len=${key.length} inicio="${key.slice(0, 6)}" fim="${key.slice(-4)}"`;
    console.warn(`[ASAAS] Chave com formato inesperado (deveria começar com "$aact_"). ${masked}. Veja ASAAS_API_KEY_B64.`);
  }
  return key;
}

function asaasErrorMessage(data: unknown): string {
  const body = data as AsaasErrorBody | null;
  const parts = (body?.errors || [])
    .map((e) => clean(e?.description || e?.code || "", 200))
    .filter(Boolean);
  return parts.join(" - ") || "Erro desconhecido no Asaas.";
}

async function asaasFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const url = `${asaasBaseUrl()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: init.method || "GET",
      headers: {
        "Content-Type": "application/json",
        // O Asaas exige um User-Agent identificável nas requisições.
        "User-Agent": env("ASAAS_USER_AGENT", "casamento-emanuelle-italo"),
        access_token: asaasApiKey(),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Tempo limite excedido ao comunicar com o Asaas.");
    }
    throw new Error(`Falha de comunicação com o Asaas: ${(error as Error).message}`);
  }
  clearTimeout(timer);

  const text = await resp.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!resp.ok) {
    throw new Error(`Erro Asaas (${resp.status}): ${asaasErrorMessage(data)}`);
  }
  return data as T;
}

export function customerDataFromPayload(payload: CheckoutPayload): CustomerData {
  const payer = payload.payer || {};
  const cpf = digits(payer.identification?.number);
  const email = clean(payer.email, 180).toLowerCase();
  const nome = clean(`${payer.first_name || "Convidado"} ${payer.last_name || ""}`, 180) || "Convidado";

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || cpf.length !== 11) {
    throw new Error("Dados de pagamento inválidos.");
  }

  return {
    nome,
    email,
    cpf,
    telefone: digits(payer.phone?.number),
    cep: digits(payer.address?.zip_code),
    numeroEndereco: digits(payer.address?.number),
  };
}

export async function createAsaasCustomer(payload: CheckoutPayload): Promise<CustomerData & { customerId: string }> {
  const data = customerDataFromPayload(payload);
  const customer = await asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: {
      name: data.nome,
      cpfCnpj: data.cpf,
      email: data.email,
      mobilePhone: data.telefone || undefined,
      postalCode: data.cep || undefined,
      addressNumber: data.numeroEndereco || undefined,
      // Os e-mails de cobrança são enviados pelo próprio site; evita duplicar com os do Asaas.
      notificationDisabled: true,
    },
  });
  const customerId = String(customer.id || "");
  if (!customerId) throw new Error("Resposta incompleta do Asaas ao criar cliente.");
  return { ...data, customerId };
}

/** Validade do QR Code Pix exibida ao convidado (minutos). Ajuste aqui se quiser. */
const PIX_VALIDADE_MINUTOS = 30;

export async function createAsaasPixCharge(input: {
  customer: CustomerData & { customerId?: string };
  valor: number;
  descricao: string;
  externalReference: string;
}) {
  const customerId = input.customer.customerId;
  if (!customerId) throw new Error("Cliente Asaas não informado para criar a cobrança Pix.");

  const dueDate = new Date().toISOString().slice(0, 10);
  const payment = await asaasFetch<AsaasPayment>("/payments", {
    method: "POST",
    body: {
      customer: customerId,
      billingType: "PIX",
      value: Number(input.valor.toFixed(2)),
      dueDate,
      description: clean(input.descricao, 500),
      externalReference: clean(input.externalReference, 100),
    },
  });

  const id = String(payment.id || "");
  if (!id) throw new Error("Resposta incompleta do Asaas ao criar cobrança Pix.");

  let qr: AsaasPixQrCode;
  try {
    qr = await asaasFetch<AsaasPixQrCode>(`/payments/${id}/pixQrCode`);
  } catch (error) {
    throw new Error(`Erro Asaas ao gerar QR Code Pix: ${(error as Error).message}`);
  }

  // Validade exibida ao convidado (contagem na tela + "vencimento" no e-mail).
  // O Asaas mantém o QR pagável por muito mais tempo (padrão: 12 meses após o
  // vencimento) e não expõe esse tempo por cobrança na API; então a validade
  // curta é controlada aqui, no app.
  const expires = new Date(Date.now() + PIX_VALIDADE_MINUTOS * 60 * 1000);

  return {
    id,
    status: String(payment.status || "PENDING"),
    qrCode: String(qr.payload || ""),
    qrCodeBase64: String(qr.encodedImage || "").replace(/^data:image\/png;base64,/, ""),
    pixQrCodeId: "",
    dateOfExpiration: expires,
    raw: payment,
  };
}

/**
 * Busca o endereço real a partir do CEP (ViaCEP) para o creditCardHolderInfo do cartão.
 * Enviar cidade/bairro corretos melhora a aprovação antifraude. Falha -> null (fallback).
 */
async function lookupCep(cep: string): Promise<{ street: string; neighborhood: string; city: string; state: string } | null> {
  const cepDigits = digits(cep);
  if (cepDigits.length !== 8) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`, { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const data = (await resp.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string } | null;
    if (!data || data.erro || !data.localidade || !data.uf) return null;
    return {
      street: clean(data.logradouro || "", 120) || "Centro",
      neighborhood: clean(data.bairro || "", 80) || "Centro",
      city: clean(data.localidade, 80),
      state: clean(data.uf, 2).toUpperCase(),
    };
  } catch {
    return null;
  }
}

export async function createAsaasCardCharge(input: {
  payload: CheckoutPayload;
  customer: CustomerData & { customerId?: string };
  valor: number;
  descricao: string;
  externalReference: string;
  ip?: string | null;
}) {
  const customerId = input.customer.customerId;
  if (!customerId) throw new Error("Cliente Asaas não informado para a cobrança no cartão.");

  const card = input.payload.card || {};
  const number = digits(card.number);
  const ccv = digits(card.ccv);
  const holderName = clean(card.holder_name || input.customer.nome, 100);
  if (!number || !ccv) throw new Error("Dados do cartão incompletos.");
  const { expiryMonth, expiryYear } = cardExpiration(String(card.expiration || ""));

  const parcelas = Math.max(1, Math.min(12, Number(input.payload.installments || 1)));
  const totalValue = Number(input.valor.toFixed(2));
  const dueDate = new Date().toISOString().slice(0, 10);
  const endereco = await lookupCep(input.customer.cep || "");

  const body: Record<string, unknown> = {
    customer: customerId,
    billingType: "CREDIT_CARD",
    dueDate,
    description: clean(input.descricao, 500),
    externalReference: clean(input.externalReference, 100),
    creditCard: {
      holderName,
      number,
      expiryMonth,
      expiryYear,
      ccv,
    },
    creditCardHolderInfo: {
      name: holderName,
      email: input.customer.email,
      cpfCnpj: input.customer.cpf,
      postalCode: digits(input.customer.cep) || "00000000",
      addressNumber: digits(input.customer.numeroEndereco) || "S/N",
      phone: input.customer.telefone || undefined,
      ...(endereco ? { province: endereco.neighborhood, address: endereco.street } : {}),
    },
    remoteIp: input.ip || undefined,
  };

  // Parcelado: usa installmentCount + totalValue. À vista: value.
  if (parcelas > 1) {
    body.installmentCount = parcelas;
    body.totalValue = totalValue;
  } else {
    body.value = totalValue;
  }

  const payment = await asaasFetch<AsaasPayment>("/payments", { method: "POST", body });
  const id = String(payment.id || "");
  if (!id) throw new Error("Resposta incompleta do Asaas ao criar cobrança no cartão.");
  const status = String(payment.status || "PENDING");
  return { id, status, detail: status, raw: payment };
}

export async function fetchAsaasPayment(paymentId: string): Promise<DbRow | null> {
  if (!paymentId) return null;
  try {
    const payment = await asaasFetch<AsaasPayment>(`/payments/${encodeURIComponent(paymentId)}`);
    return {
      id: String(payment.id || paymentId),
      status: String(payment.status || ""),
      gateway_payment_id: String(payment.id || paymentId),
      externalReference: payment.externalReference || null,
    };
  } catch {
    return null;
  }
}

/**
 * Exclui (remove) uma cobrança no Asaas. Cobranças não pagas somem e o QR Code
 * deixa de funcionar; cobranças já pagas não são afetadas (o Asaas recusa).
 * Best-effort: retorna true se removeu, false em qualquer falha (nunca lança).
 */
export async function deleteAsaasPayment(paymentId: string): Promise<boolean> {
  if (!paymentId) return false;
  try {
    const res = await asaasFetch<{ deleted?: boolean }>(`/payments/${encodeURIComponent(paymentId)}`, { method: "DELETE" });
    return res?.deleted === true;
  } catch {
    return false;
  }
}

/**
 * Cadastra o webhook de cobranças no Asaas. Utilitário opcional — o caminho
 * recomendado é cadastrar no painel (Configurações → Integrações → Webhooks)
 * apontando para `${BASE_URL}/api/webhook` com o mesmo ASAAS_WEBHOOK_TOKEN.
 */
export async function configureAsaasWebhook(webhookUrl?: string) {
  const url = webhookUrl || `${env("BASE_URL", "https://emanuelleitalo.com").replace(/\/$/, "")}/api/webhook`;
  return asaasFetch("/webhooks", {
    method: "POST",
    body: {
      name: "Casamento - pagamentos",
      url,
      email: env("ASAAS_WEBHOOK_EMAIL") || undefined,
      enabled: true,
      interrupted: false,
      authToken: env("ASAAS_WEBHOOK_TOKEN") || undefined,
      sendType: "SEQUENTIALLY",
      events: ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED"],
    },
  });
}
