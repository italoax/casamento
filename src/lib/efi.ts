/**
 * EFÍ PAY CLIENT - Integração com APIs Efí Pro/Efí Pay.
 *
 * Pix usa as APIs Pix v2 da Efí com certificado mTLS.
 * Cartão usa a API de cobranças v1 com payment_token gerado pelo checkout transparente Efí.
 */

import { env, envBool } from "./env";
import { clean, digits } from "./payment/payment-utils";
import type { CheckoutPayload, CustomerData, DbRow } from "./payment/payment-types";

type EfiSdkClient = Record<string, (...args: unknown[]) => Promise<unknown>>;

type EfiPixCharge = {
  txid?: string;
  status?: string;
  loc?: { id?: number; location?: string; tipoCob?: string };
  calendario?: { criacao?: string; expiracao?: number | string };
  valor?: { original?: string };
  pixCopiaECola?: string;
  pix?: Array<Record<string, unknown>>;
};

type EfiPixQrCode = {
  qrcode?: string;
  imagemQrcode?: string;
  linkVisualizacao?: string;
};

type EfiChargeResponse = {
  code?: number;
  data?: {
    charge_id?: number;
    total?: number;
    status?: string;
    installments?: number;
    installment_value?: number;
    refusal?: { reason?: string; retry?: boolean };
    payment?: string;
  };
};

function efiErrorMessage(error: unknown): string {
  const err = error as Record<string, unknown> | null;
  if (!err) return "Erro desconhecido na Efí.";
  const parts = [err.nome, err.name, err.mensagem, err.message, err.error_description, err.error]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return parts.join(" - ") || "Erro desconhecido na Efí.";
}

function certificateOption() {
  const certificateBase64 = env("EFI_CERTIFICATE_BASE64") || env("EFIPAY_CERTIFICATE_BASE64");
  if (certificateBase64) {
    return { certificate: certificateBase64, cert_base64: true };
  }

  const certificatePath = env("EFI_CERTIFICATE_PATH") || env("EFIPAY_CERTIFICATE_PATH");
  if (certificatePath) {
    return { certificate: certificatePath, cert_base64: false };
  }

  return { certificate: "", cert_base64: false };
}

function efiOptions() {
  const clientId = env("EFI_CLIENT_ID") || env("EFIPAY_CLIENT_ID");
  const clientSecret = env("EFI_CLIENT_SECRET") || env("EFIPAY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Credenciais da Efí não configuradas: informe EFI_CLIENT_ID e EFI_CLIENT_SECRET.");

  const cert = certificateOption();
  if (!cert.certificate) throw new Error("Certificado Pix da Efí não configurado: informe EFI_CERTIFICATE_PATH ou EFI_CERTIFICATE_BASE64.");

  return {
    sandbox: envBool("EFI_SANDBOX", false),
    client_id: clientId,
    client_secret: clientSecret,
    certificate: cert.certificate,
    cert_base64: cert.cert_base64,
    validateMtls: envBool("EFI_VALIDATE_MTLS", false),
  };
}

async function efiClient(): Promise<EfiSdkClient> {
  // O SDK publica CommonJS/ESM; import dinâmico evita problemas no build do Next.
  const mod = await import("sdk-node-apis-efi");
  const EfiPay = (mod as unknown as { default?: new (options: Record<string, unknown>) => EfiSdkClient })?.default || (mod as unknown as new (options: Record<string, unknown>) => EfiSdkClient);
  return new EfiPay(efiOptions());
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

export async function createEfiCustomer(payload: CheckoutPayload): Promise<CustomerData & { customerId: string }> {
  const data = customerDataFromPayload(payload);
  // A Efí não exige criação prévia de cliente para Pix/cartão no fluxo usado aqui.
  return { ...data, customerId: data.cpf };
}

export async function createEfiPixCharge(input: {
  customer: CustomerData;
  valor: number;
  descricao: string;
  externalReference: string;
}) {
  const client = await efiClient();
  const expiracao = Math.min(86400, Math.max(60, Number(env("EFI_PIX_EXPIRATION_SECONDS", "1800"))));
  const chave = env("EFI_PIX_KEY") || env("EFIPAY_PIX_KEY");
  if (!chave) throw new Error("Chave Pix da Efí não configurada: informe EFI_PIX_KEY.");

  const body = {
    calendario: { expiracao },
    devedor: { cpf: input.customer.cpf, nome: input.customer.nome },
    valor: { original: input.valor.toFixed(2) },
    chave,
    solicitacaoPagador: clean(input.descricao, 140),
    infoAdicionais: [{ nome: "Pedido", valor: clean(input.externalReference, 72) }],
  };

  let charge: EfiPixCharge;
  try {
    charge = (await client.pixCreateImmediateCharge({}, body)) as EfiPixCharge;
  } catch (error) {
    throw new Error(`Erro Efí ao criar Pix: ${efiErrorMessage(error)}`);
  }

  const txid = String(charge.txid || "");
  if (!txid) throw new Error("Resposta incompleta da Efí ao criar cobrança Pix.");

  let qr: EfiPixQrCode = {};
  const locId = Number(charge.loc?.id || 0);
  if (locId) {
    try {
      qr = (await client.pixGenerateQRCode({ id: locId })) as EfiPixQrCode;
    } catch (error) {
      throw new Error(`Erro Efí ao gerar QR Code Pix: ${efiErrorMessage(error)}`);
    }
  }

  const qrCode = String(qr.qrcode || charge.pixCopiaECola || "");
  const qrCodeBase64 = String(qr.imagemQrcode || "").replace(/^data:image\/png;base64,/, "");
  const expires = new Date(Date.now() + expiracao * 1000);

  return {
    id: txid,
    status: String(charge.status || "ATIVA"),
    qrCode,
    qrCodeBase64,
    pixQrCodeId: locId ? String(locId) : "",
    dateOfExpiration: expires,
    raw: charge,
  };
}

export async function fetchEfiPayment(paymentId: string): Promise<DbRow | null> {
  if (!paymentId) return null;
  const client = await efiClient();
  const id = String(paymentId);
  try {
    if (/^\d+$/.test(id)) {
      const charge = (await client.detailCharge({ id: Number(id) })) as EfiChargeResponse;
      return { id, status: charge.data?.status || "", gateway_payment_id: id, externalReference: null };
    }
    const pix = (await client.pixDetailCharge({ txid: id })) as EfiPixCharge;
    return { id, status: pix.status || "", gateway_payment_id: id, externalReference: null, pix };
  } catch {
    return null;
  }
}

/**
 * Busca o endereço real a partir do CEP (ViaCEP) para o billing_address do cartão.
 * Enviar cidade/estado/bairro corretos melhora a aprovação antifraude da operadora.
 * Em qualquer falha (CEP inválido, timeout, serviço fora) retorna null e usamos fallback.
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

export async function createEfiCardCharge(input: {
  payload: CheckoutPayload;
  customer: CustomerData;
  valor: number;
  descricao: string;
  externalReference: string;
  ip?: string | null;
}) {
  const paymentToken = clean(input.payload.creditCardToken, 255);
  if (!paymentToken) throw new Error("Token do cartão Efí não informado. Gere o payment_token no checkout transparente da Efí antes de finalizar.");

  const client = await efiClient();
  const parcelas = Math.max(1, Math.min(12, Number(input.payload.installments || 1)));
  const amountCents = Math.round(input.valor * 100);
  const cep = digits(input.customer.cep);
  const numeroEndereco = digits(input.customer.numeroEndereco) || "S/N";
  const endereco = await lookupCep(cep);

  const body = {
    items: [{ name: clean(input.descricao || "Presente de casamento", 255), value: amountCents, amount: 1 }],
    metadata: {
      custom_id: clean(input.externalReference, 255),
      notification_url: `${env("BASE_URL", "https://emanuelleitalo.com").replace(/\/$/, "")}/api/webhook`,
    },
    payment: {
      credit_card: {
        installments: parcelas,
        payment_token: paymentToken,
        billing_address: {
          street: endereco?.street || "Endereco informado no checkout",
          number: numeroEndereco,
          neighborhood: endereco?.neighborhood || "Centro",
          zipcode: cep || "00000000",
          city: endereco?.city || "Cidade",
          state: endereco?.state || "SP",
        },
        customer: {
          name: input.customer.nome,
          email: input.customer.email,
          cpf: input.customer.cpf,
          phone_number: input.customer.telefone || undefined,
        },
      },
    },
  };

  try {
    const response = (await client.createOneStepCharge({}, body)) as EfiChargeResponse;
    const id = String(response.data?.charge_id || "");
    if (!id) throw new Error("Resposta incompleta da Efí ao criar cobrança no cartão.");
    return {
      id,
      status: String(response.data?.status || "waiting"),
      detail: response.data?.refusal?.reason || response.data?.status || "waiting",
      raw: response,
    };
  } catch (error) {
    throw new Error(`Erro Efí ao processar cartão: ${efiErrorMessage(error)}`);
  }
}

export async function configureEfiPixWebhook(webhookUrl?: string) {
  const chave = env("EFI_PIX_KEY") || env("EFIPAY_PIX_KEY");
  if (!chave) throw new Error("Chave Pix da Efí não configurada: informe EFI_PIX_KEY.");
  // A Efí acrescenta "/pix" ao final da URL registrada. Terminar a URL em
  // "?ignorar=" faz o sufixo virar parte da query (".../api/webhook?ignorar=/pix"),
  // garantindo que a notificação caia na rota /api/webhook em vez de 404 em /api/webhook/pix.
  const url = webhookUrl || `${env("BASE_URL", "https://emanuelleitalo.com").replace(/\/$/, "")}/api/webhook?ignorar=`;
  const client = await efiClient();
  return client.pixConfigWebhook({ chave }, { webhookUrl: url });
}
