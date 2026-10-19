import { queryOne } from "../db";
import { SafeLog } from "../security";
import { pendingExpiredPixPaymentIds } from "./payment-sales";
import { releaseExpiredReservations } from "./payment-stock";
import { deleteAsaasPayment } from "./asaas";
import { createPixExpirationScheduler } from "./pix-expiration-scheduler.mjs";

async function proximaExpiracao() {
    try {
        // O banco calcula o intervalo em UTC: não depende do fuso do Node ou
        // da interpretação de strings DATETIME pelo JavaScript.
        const next = await queryOne(`SELECT
          TIMESTAMPDIFF(MICROSECOND, UTC_TIMESTAMP(6), MIN(date_of_expiration)) / 1000 AS delay_ms
          FROM vendas
          WHERE (status IS NULL OR status = '' OR status IN ('pending', 'in_process'))
            AND (payment_method IS NULL OR payment_method = '' OR payment_method = 'pix')
            AND date_of_expiration IS NOT NULL`);
        return next?.delay_ms ?? null;
    } catch (error) {
        // Uma instalação sem vendas não precisa criar tabelas só para o timer.
        if (error?.code === "ER_NO_SUCH_TABLE") return null;
        throw error;
    }
}

async function expirarPendentes() {
    const ids = await pendingExpiredPixPaymentIds(200);
    for (const id of ids) await deleteAsaasPayment(id);
    await releaseExpiredReservations();
}

const scheduler = globalThis.__casamentoPixExpiration ||= createPixExpirationScheduler({
    readNextDelay: proximaExpiracao,
    expire: expirarPendentes,
    onError: error => SafeLog.error("Expiração de Pix", error),
});

export function iniciarExpiracaoPix() {
    if (process.env.NEXT_PHASE === "phase-production-build") return;
    return scheduler.start();
}

export function atualizarAgendamentoPix() {
    if (process.env.NEXT_PHASE === "phase-production-build") return;
    return scheduler.refresh();
}
