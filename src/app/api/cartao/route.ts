import { errorJson, json } from "@/lib/http";
import {
  checkoutItems,
  clean,
  createEfiCardCharge,
  createEfiCustomer,
  customerDataFromPayload,
  extractIds,
  insertSale,
  logPayment,
  newRefs,
  normalizeStatus,
  releaseStock,
  reserveStockAtomic,
  settleStockForPayment,
  validateRecaptcha,
  type CheckoutPayload,
} from "@/lib/payment";
import { env } from "@/lib/env";
import { Security, SafeLog } from "@/lib/security";
import { enviarCartaoRecusado, enviarComprovanteAprovado } from "@/lib/site-emails";

export const runtime = "nodejs";

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function efiCustomerId(value: unknown) {
  const id = clean(value, 80);
  return id;
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: Security.corsHeaders(origin, request.url),
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);

  if (!Security.isAllowedOrigin(origin, request.url)) {
    return errorJson("Origem não autorizada.", 403, { headers: corsHeaders });
  }

  try {
    const ip = Security.clientIp(request);
    if (!Security.checkRateLimit(`POST:cartao:${ip}`, 5, 300)) {
      return errorJson("Muitas tentativas de checkout. Aguarde 5 minutos.", 429, { headers: corsHeaders });
    }

    const payload = (await request.json().catch(() => null)) as CheckoutPayload | null;
    if (!payload) return errorJson("Payload JSON inválido.", 400, { headers: corsHeaders });
    if (!(await validateRecaptcha(clean(payload.recaptchaToken, 3000), "checkout_cartao", request))) {
      return errorJson("Falha na verificação de segurança.", 422, { headers: corsHeaders });
    }

    const creditCardToken = clean(payload.creditCardToken, 255);
    if (!creditCardToken) {
      return errorJson("Token do cartão inválido. Revise os dados do cartão e tente novamente.", 400, { headers: corsHeaders });
    }

    const idsProdutos = extractIds(payload);
    const itemData = await checkoutItems(idsProdutos);
    const extraCard = payload.metadata?.cartao_personalizado ? Number(env("CARTAO_VALOR", "10")) : 0;
    const valor = money(itemData.total + extraCard);
    if (valor <= 0) return errorJson("Total inválido.", 400, { headers: corsHeaders });

    const parcelas = Math.max(1, Math.min(12, Number(payload.installments || 1)));
    const tokenCustomerId = efiCustomerId(payload.efiCustomerId);
    const customerData = tokenCustomerId ? customerDataFromPayload(payload) : await createEfiCustomer(payload);
    const refs = newRefs();

    // Reserva ATÔMICA antes de cobrar (impede vender além do estoque em acessos simultâneos).
    await reserveStockAtomic(idsProdutos);

    let payment;
    let status: ReturnType<typeof normalizeStatus>;
    try {
      payment = await createEfiCardCharge({
        payload: { ...payload, installments: parcelas, creditCardToken },
        customer: customerData,
        valor,
        descricao: clean(payload.description || itemData.itens || "Presente de casamento", 120),
        externalReference: refs.externalReference,
        ip,
      });
      status = normalizeStatus(payment.status);
      await insertSale({
        nome: customerData.nome,
        email: customerData.email,
        cpf: customerData.cpf,
        telefone: customerData.telefone,
        cep: customerData.cep,
        numeroEndereco: customerData.numeroEndereco,
        mensagem: clean(payload.metadata?.mensagem, 2000),
        itens: itemData.itens,
        idsProdutos,
        valor,
        gatewayPaymentId: payment.id,
        status,
        statusDetail: String(payment.detail || payment.status || "waiting"),
        paymentMethod: "cartao",
        externalReference: refs.externalReference,
        statusToken: refs.statusToken,
      });
    } catch (err) {
      // Falhou ao cobrar/registrar: devolve a reserva.
      await releaseStock(idsProdutos).catch(() => undefined);
      throw err;
    }
    const paymentId = payment.id;

    // Registra no log do painel (aba "Logs"). Cartão é síncrono, então o
    // resultado já é conhecido aqui — não dá pra depender do webhook (que é Pix).
    await logPayment({
      tipo: "cartao",
      status: status === "approved" ? "sucesso" : status,
      mensagem:
        status === "approved"
          ? "Cartão aprovado."
          : status === "rejected"
            ? `Cartão recusado: ${String(payment.detail || payment.status || "não autorizado")}`
            : "Cartão pendente de confirmação.",
      nome_comprador: customerData.nome || null,
      email: customerData.email || null,
      cpf: customerData.cpf || null,
      telefone: customerData.telefone || null,
      itens: itemData.itens || null,
      valor,
      gateway_payment_id: paymentId,
      external_reference: refs.externalReference,
      payload: null,
    }).catch(() => undefined);

    // Cartão é síncrono. Liquida o estoque conforme o resultado:
    //  - aprovado -> reserva vira venda
    //  - rejeitado -> devolve a reserva
    //  - pendente -> mantém reservado (webhook/consulta de status converte depois)
    if (status === "approved") {
      await settleStockForPayment(paymentId, "convert").catch(() => undefined);
    } else if (status === "rejected") {
      await settleStockForPayment(paymentId, "release").catch(() => undefined);
    }

    if (status === "approved") {
      void enviarComprovanteAprovado({ email: customerData.email, nome: customerData.nome, itens: itemData.itens, total: valor });
    } else if (!["pending", "approved"].includes(status)) {
      void enviarCartaoRecusado({ email: customerData.email, nome: customerData.nome, motivo: String(payment.detail || payment.status || "Não autorizado"), itens: itemData.itens, total: valor });
    }

    return json(
      {
        sucesso: true,
        id: paymentId,
        total: valor,
        status,
        status_detail: String(payment.detail || payment.status || "waiting"),
        status_token: refs.statusToken,
      },
      200,
      { headers: corsHeaders },
    );
  } catch (error) {
    SafeLog.error("POST /api/cartao", error);
    return errorJson(error instanceof Error ? error.message : "Falha ao processar cartão.", 500, { headers: corsHeaders });
  }
}
