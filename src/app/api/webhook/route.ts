/**
 * WEBHOOK ROUTE - /api/webhook
 * 
 * Recebe webhooks de pagamentos da Efí Pay.
 * Processa eventos como:
 * - Pagamento aprovado/recusado
 * - Transferência completa
 * - Pix recebido
 * 
 * Implementa idempotência para evitar duplicação de processamento.
 * Se o webhook for retransmitido, detecta e retorna a mesma resposta.
 * 
 * POST /api/webhook - Processa webhook
 * OPTIONS /api/webhook - CORS preflight
 */

import { errorJson, json } from "@/lib/http";
import { env } from "@/lib/env";
import { logPayment, normalizeStatus, updateSaleStatusByPayment } from "@/lib/payment";
import { Security, SafeLog } from "@/lib/security";
import { db, queryOne } from "@/lib/db";
import { decryptEmail } from "@/lib/encryption";
import { enviarAvisoAdminPresente, enviarCartaoRecusado, enviarComprovanteAprovado } from "@/lib/site-emails";
import * as crypto from "crypto";

export const runtime = "nodejs";

function safeEmail(value: unknown) {
  // Descriptografa email com fallback se falhar
  try {
    return decryptEmail(String(value || ""));
  } catch {
    return String(value || "");
  }
}

/**
 * Tabela para garantir idempotência - evita processar o mesmo webhook duas vezes
 * A Efí pode reenviar webhooks se não receber resposta 200
 */
async function ensureIdempotencyTable() {
  await db()
    .execute(
      `CREATE TABLE IF NOT EXISTS webhook_idempotency (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    gateway_payment_id VARCHAR(80),
    event_type VARCHAR(50),
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_status INT,
    response_body JSON,
    INDEX idx_key (idempotency_key),
    INDEX idx_payment_id (gateway_payment_id),
    INDEX idx_processed_at (processed_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    )
    .catch(() => undefined);
}

/**
 * Gera chave de idempotência a partir do pagamento ID + evento + status
 * Previne processar o mesmo evento de pagamento múltiplas vezes
 */
function generateIdempotencyKey(paymentId: string, event: string, status: string): string {
  const input = `${paymentId}:${event}:${status}`;
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Verifica se webhook foi processado antes
 * Retorna a resposta anterior se já foi processado
 */
async function isWebhookProcessed(key: string): Promise<{ processed: boolean; status: number; body: Record<string, unknown> | null }> {
  const record = await queryOne<{ response_status: number; response_body: string | null }>(
    "SELECT response_status, response_body FROM webhook_idempotency WHERE idempotency_key = ? LIMIT 1",
    [key]
  ).catch(() => null);

  if (!record) {
    return { processed: false, status: 0, body: null };
  }

  try {
    const body = record.response_body ? JSON.parse(record.response_body) : null;
    return { processed: true, status: record.response_status, body };
  } catch {
    return { processed: true, status: record.response_status, body: null };
  }
}

/**
 * Registra webhook processado (para idempotência)
 */
async function recordWebhookProcessed(
  key: string,
  paymentId: string,
  eventType: string,
  responseStatus: number,
  responseBody: Record<string, unknown>
): Promise<void> {
  await db()
    .execute(
      "INSERT INTO webhook_idempotency (idempotency_key, gateway_payment_id, event_type, response_status, response_body) VALUES (?, ?, ?, ?, ?)",
      [key, paymentId, eventType, responseStatus, JSON.stringify(responseBody)]
    )
    .catch(() => undefined);
}

export async function OPTIONS(request: Request) {
  // Responde a CORS preflight
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: Security.corsHeaders(origin, request.url),
  });
}

/**
 * POST Handler - Processa webhooks da Efí
 * 
 * Fluxo:
 * 1. Valida CORS origin
 * 2. Verifica token de autenticação (timing-safe comparison)
 * 3. Rate limiting por IP
 * 4. Parse JSON
 * 5. Verifica idempotência (se já processou antes)
 * 6. Processa pagamento
 * 7. Envia emails de confirmação
 * 8. Registra para idempotência
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);

  // Não validamos Origin aqui: webhook é servidor-a-servidor (a Efí envia um
  // header Origin próprio, que reprovaria no check de CORS e devolveria 403).
  // A proteção real do webhook é o token (EFI_WEBHOOK_TOKEN) e/ou mTLS abaixo.

  try {
    // 1. Validar webhook token quando configurado.
    // Para Pix Efí, a proteção principal costuma ser mTLS no cadastro do webhook.
    const expected = env("EFI_WEBHOOK_TOKEN");
    const provided = request.headers.get("x-efi-webhook-token") || request.headers.get("efi-access-token") || "";

    if (expected && !Security.constantTimeCompare(provided.trim(), expected.trim())) {
      const clientIp = Security.clientIp(request);
      SafeLog.warn("WEBHOOK", `Tentativa não autorizada do IP ${clientIp}`);
      return errorJson("Não autorizado", 403, { headers: corsHeaders });
    }

    // 2. Rate limiting - evita que um atacante envie muitos webhooks
    const clientIp = Security.clientIp(request);
    if (!Security.checkRateLimit(`webhook:${clientIp}`, 100, 60)) {
      return errorJson("Muitas requisições", 429, { headers: corsHeaders });
    }

    // 3. Parse payload. A Efí valida a URL no cadastro com um POST de teste (sem
    // dados de Pix); respondemos 200 a esse "ping" para o registro do webhook passar.
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload) {
      return json({ sucesso: true, status: "ping" }, 200, { headers: corsHeaders });
    }

    // Extrai dados do pagamento: Efí Pix envia { pix: [{ txid, endToEndId, valor, horario }] }.
    const payment = (payload.payment || {}) as Record<string, unknown>;
    const pixItems = Array.isArray(payload.pix) ? (payload.pix as Array<Record<string, unknown>>) : [];
    const pix = pixItems[0] || null;
    const paymentId = String(pix?.txid || payment.id || payload.txid || payload.charge_id || "");
    const event = String(payload.event || (pix ? "PIX_RECEIVED" : ""));
    const detail = String(payment.status || payload.status || (pix ? "CONCLUIDA" : event || "PENDING"));

    if (!paymentId) {
      return json({ sucesso: true, status: "ping" }, 200, { headers: corsHeaders });
    }

    // 4. Verifica idempotência - retorna resposta anterior se já foi processado
    await ensureIdempotencyTable();
    const idempotencyKey = generateIdempotencyKey(paymentId, event, detail);
    const cached = await isWebhookProcessed(idempotencyKey);

    if (cached.processed) {
      SafeLog.info("WEBHOOK", `Webhook duplicado (idempotência): ${paymentId}`);
      return json(cached.body || { sucesso: true, status: "cached" }, cached.status || 200, { headers: corsHeaders });
    }

    // 5. Processa webhook - atualiza status da venda.
    // O estoque é liquidado dentro de updateSaleStatusByPayment (idempotente):
    // aprovado -> reserva vira venda; rejeitado/expirado -> devolve a reserva.
    const status = normalizeStatus(detail || event);
    const sale = await updateSaleStatusByPayment(paymentId, status, detail);

    // 6. Log sem expor dados sensíveis
    await logPayment({
      tipo: String(sale?.payment_method || "efi"),
      status: status === "approved" ? "sucesso" : status,
      mensagem: `Webhook Efí: ${event || detail}`,
      gateway_payment_id: paymentId,
      external_reference: payment.externalReference || payload.custom_id || null,
      nome_comprador: sale?.nome_comprador ? String(sale.nome_comprador) : null,
      itens: sale?.itens ? String(sale.itens) : null,
      valor: sale?.valor_total != null ? Number(sale.valor_total) : null,
      payload: null,
    });

    const response = { sucesso: true, status };

    if (sale?.email) {
      const email = safeEmail(sale.email);
      const nome = String(sale.nome_comprador || "Convidado");
      const itens = String(sale.itens || "");
      const total = Number(sale.valor_total || 0);
      if (status === "approved" && Number(sale.comprovante_enviado || 0) !== 1) {
        void enviarComprovanteAprovado({ email, nome, itens, total });
        void enviarAvisoAdminPresente({
          email,
          nome,
          itens,
          total,
          metodo: String(sale.payment_method || "efi"),
          status: "aprovado",
        });
        await db().execute("UPDATE vendas SET comprovante_enviado = 1 WHERE gateway_payment_id = ?", [paymentId]).catch(() => undefined);
      } else if (!["approved", "pending"].includes(status) && String(sale.payment_method || "") === "cartao") {
        void enviarCartaoRecusado({ email, nome, motivo: detail, itens, total });
      }
    }

    // 7. Registrar sucesso para idempotência
    await recordWebhookProcessed(idempotencyKey, paymentId, event, 200, response);

    return json(response, 200, { headers: corsHeaders });
  } catch (error) {
    SafeLog.error("WEBHOOK", error);
    return errorJson("Falha interna no webhook", 500, { headers: corsHeaders });
  }
}
