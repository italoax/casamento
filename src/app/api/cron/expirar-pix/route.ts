import { errorJson, json } from "@/lib/http";
import { env } from "@/lib/env";
import { deleteAsaasPayment, pendingExpiredPixPaymentIds, releaseExpiredReservations } from "@/lib/payment";
import { SafeLog } from "@/lib/security";

export const runtime = "nodejs";

/**
 * CRON — expira Pix não pago.
 *
 * Para cada cobrança Pix pendente e já vencida (date_of_expiration < agora):
 *  1) apaga a cobrança no Asaas (o QR Code deixa de funcionar de verdade);
 *  2) devolve o estoque reservado e marca a venda como expirada.
 *
 * Proteção: header `x-api-token` (ou query `?key=`) deve bater com LOGS_API_KEY
 * (ou EMAIL_API_TOKEN). Cadastre na Hostinger um cron a cada ~5 min, ex.:
 *   curl -s -H "x-api-token: SUA_LOGS_API_KEY" https://emanuelleitalo.com/api/cron/expirar-pix
 */
async function executar(request: Request) {
  const expected = env("CRON_SECRET") || env("LOGS_API_KEY") || env("EMAIL_API_TOKEN");
  if (!expected) return errorJson("Cron desabilitado: configure LOGS_API_KEY.", 503);

  const url = new URL(request.url);
  const enviado = request.headers.get("x-api-token") || url.searchParams.get("key") || "";
  if (enviado !== expected) return errorJson("Não autorizado.", 403);

  try {
    // 1) Apaga as cobranças vencidas no Asaas (best-effort, uma a uma).
    const ids = await pendingExpiredPixPaymentIds(200);
    let apagadas = 0;
    for (const id of ids) {
      if (await deleteAsaasPayment(id)) apagadas++;
    }
    // 2) Libera o estoque e marca como expiradas (idempotente).
    const liberadas = await releaseExpiredReservations();
    return json({ sucesso: true, vencidas: ids.length, apagadas, liberadas });
  } catch (error) {
    SafeLog.error("GET /api/cron/expirar-pix", error);
    return errorJson("Falha ao expirar Pix.", 500);
  }
}

export async function GET(request: Request) {
  return executar(request);
}

export async function POST(request: Request) {
  return executar(request);
}
