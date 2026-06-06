import { errorJson, json } from "@/lib/http";
import { checkoutItems, clean, createEfiCustomer, createEfiPixCharge, extractIds, insertSale, newRefs, normalizeStatus, releaseStock, reserveStockAtomic, validateRecaptcha, type CheckoutPayload } from "@/lib/payment";
import { env } from "@/lib/env";
import { Security, SafeLog } from "@/lib/security";
import { enviarPix } from "@/lib/site-emails";

export const runtime = "nodejs";

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
    // Rate limiting: máx 5 requisições por 5 minutos por IP
    const ip = Security.clientIp(request);
    if (!Security.checkRateLimit(`POST:pix:${ip}`, 5, 300)) {
      return errorJson("Muitas tentativas de checkout. Aguarde 5 minutos.", 429, { headers: corsHeaders });
    }

    const payload = (await request.json().catch(() => null)) as CheckoutPayload | null;
    if (!payload) return errorJson("Payload JSON inválido.", 400, { headers: corsHeaders });
    if (!(await validateRecaptcha(clean(payload.recaptchaToken, 3000), "checkout_pix", request))) return errorJson("Falha na verificação de segurança.", 422, { headers: corsHeaders });

    const idsProdutos = extractIds(payload);
    const itemData = await checkoutItems(idsProdutos);
    const extraCard = payload.metadata?.cartao_personalizado ? Number(env("CARTAO_VALOR", "10")) : 0;
    const valor = Math.round((itemData.total + extraCard) * 100) / 100;
    if (valor <= 0) return errorJson("Total inválido.", 400, { headers: corsHeaders });

    // Reserva ATÔMICA antes de criar a cobrança (impede vender além do estoque em acessos simultâneos).
    await reserveStockAtomic(idsProdutos);
    try {
      const customer = await createEfiCustomer(payload);
      const refs = newRefs();
      const payment = await createEfiPixCharge({
        customer,
        valor,
        descricao: clean(payload.description || itemData.itens || "Presente de casamento", 120),
        externalReference: refs.externalReference,
      });
      const paymentId = payment.id;
      const expires = payment.dateOfExpiration;
      const status = normalizeStatus(payment.status);

      await insertSale({
        nome: customer.nome,
        email: customer.email,
        cpf: customer.cpf,
        telefone: customer.telefone,
        mensagem: clean(payload.metadata?.mensagem, 2000),
        itens: itemData.itens,
        idsProdutos,
        valor,
        gatewayPaymentId: paymentId,
        status,
        statusDetail: String(payment.status || "ATIVA"),
        paymentMethod: "pix",
        externalReference: refs.externalReference,
        statusToken: refs.statusToken,
        qrCode: payment.qrCode,
        qrCodeBase64: payment.qrCodeBase64,
        pixQrCodeId: payment.pixQrCodeId,
        dateOfExpiration: expires.toISOString().slice(0, 19).replace("T", " "),
      });
      void enviarPix({
        email: customer.email,
        nome: customer.nome,
        total: valor,
        vencimento: expires.toISOString(),
        qrCode: payment.qrCode,
        qrCodeBase64: payment.qrCodeBase64,
      });

      return json({ sucesso: true, id: paymentId, pix_qr_code_id: payment.pixQrCodeId || null, qr_code: payment.qrCode, qr_code_base64: payment.qrCodeBase64, date_of_expiration: expires.toISOString(), total: valor, status_token: refs.statusToken }, 200, { headers: corsHeaders });
    } catch (err) {
      // Se algo falhar depois de reservar, devolve a reserva pra não travar o estoque.
      await releaseStock(idsProdutos).catch(() => undefined);
      throw err;
    }
  } catch (error) {
    SafeLog.error("POST /api/pix", error);
    return errorJson(error instanceof Error ? error.message : "Falha ao gerar Pix.", 500, { headers: corsHeaders });
  }
}
