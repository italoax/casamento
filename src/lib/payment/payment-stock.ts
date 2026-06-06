/**
 * Gerenciamento de estoque de presentes
 * Funções para reservar, converter e liberar estoque
 */

import { columnExists, db, queryOne, queryRows } from "../db";

async function ensureGiftStockColumns() {
  if (!(await columnExists("presentes", "quantidade_vendida").catch(() => false))) {
    await db().execute("ALTER TABLE presentes ADD COLUMN quantidade_vendida INT NOT NULL DEFAULT 0");
  }
  if (!(await columnExists("presentes", "quantidade_reservada").catch(() => false))) {
    await db().execute("ALTER TABLE presentes ADD COLUMN quantidade_reservada INT NOT NULL DEFAULT 0");
  }
}

export async function reserveStock(idsProdutos: number[]): Promise<void> {
  if (!idsProdutos.length) return;
  await ensureGiftStockColumns().catch(() => undefined);
  const counts = new Map<number, number>();
  idsProdutos.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
  for (const [id, qtd] of counts) {
    await db().execute("UPDATE presentes SET quantidade_reservada = COALESCE(quantidade_reservada, 0) + ? WHERE id = ?", [qtd, id]);
  }
}

/**
 * Reserva estoque de forma ATÔMICA e tudo-ou-nada.
 * Cada item só é reservado se ainda houver saldo (disponivel - vendida - reservada >= qtd),
 * numa única instrução SQL — fechando a janela de corrida entre "checar" e "reservar".
 * Se algum item não couber, desfaz os já reservados e lança erro.
 */
export async function reserveStockAtomic(idsProdutos: number[]): Promise<void> {
  if (!idsProdutos.length) return;
  await ensureGiftStockColumns().catch(() => undefined);
  const counts = new Map<number, number>();
  idsProdutos.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));

  const reservados: Array<[number, number]> = [];
  for (const [id, qtd] of counts) {
    const [res] = await db().execute(
      `UPDATE presentes
       SET quantidade_reservada = COALESCE(quantidade_reservada, 0) + ?
       WHERE id = ?
         AND (
           quantidade_disponivel IS NULL
           OR TRIM(CAST(quantidade_disponivel AS CHAR)) = ''
           OR (CAST(quantidade_disponivel AS SIGNED) - COALESCE(quantidade_vendida, 0) - COALESCE(quantidade_reservada, 0)) >= ?
         )`,
      [qtd, id, qtd],
    );
    if (!res || (res as { affectedRows?: number }).affectedRows !== 1) {
      // Desfaz o que já reservou nesta tentativa.
      for (const [rid, rqtd] of reservados) {
        await db().execute("UPDATE presentes SET quantidade_reservada = GREATEST(COALESCE(quantidade_reservada, 0) - ?, 0) WHERE id = ?", [rqtd, rid]).catch(() => undefined);
      }
      throw new Error("Quantidade indisponível: alguém finalizou esse presente antes. Atualize a lista e tente novamente.");
    }
    reservados.push([id, qtd]);
  }
}

export async function convertStock(idsProdutos: number[]): Promise<void> {
  if (!idsProdutos.length) return;
  await ensureGiftStockColumns().catch(() => undefined);
  const counts = new Map<number, number>();
  idsProdutos.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
  for (const [id, qtd] of counts) {
    await db().execute("UPDATE presentes SET quantidade_reservada = GREATEST(COALESCE(quantidade_reservada, 0) - ?, 0), quantidade_vendida = COALESCE(quantidade_vendida, 0) + ? WHERE id = ?", [qtd, qtd, id]);
  }
}

export async function releaseStock(idsProdutos: number[]): Promise<void> {
  if (!idsProdutos.length) return;
  await ensureGiftStockColumns().catch(() => undefined);
  const counts = new Map<number, number>();
  idsProdutos.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
  for (const [id, qtd] of counts) {
    await db().execute("UPDATE presentes SET quantidade_reservada = GREATEST(COALESCE(quantidade_reservada, 0) - ?, 0) WHERE id = ?", [qtd, id]);
  }
}

/**
 * Garante a coluna de controle de liquidação de estoque na tabela de vendas.
 * stock_settled = 1 significa que a reserva já foi convertida em venda OU liberada,
 * evitando contabilizar a mesma venda duas vezes (idempotência).
 */
async function ensureStockSettledColumn() {
  if (!(await columnExists("vendas", "stock_settled").catch(() => false))) {
    await db().execute("ALTER TABLE vendas ADD COLUMN stock_settled TINYINT NOT NULL DEFAULT 0").catch(() => undefined);
  }
}

/**
 * Converte ids_produtos (JSON) em array de ids com repetição por quantidade.
 * Aceita tanto [1, 1, 2] quanto [{ id, qtd }].
 */
function parseIdsArray(raw: unknown): number[] {
  try {
    const parsed = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(parsed)) return [];
    const out: number[] = [];
    for (const item of parsed) {
      if (typeof item === "number" || typeof item === "string") {
        const id = Number(item);
        if (Number.isInteger(id) && id > 0) out.push(id);
      } else if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const id = Number(obj.id ?? obj.id_produto ?? obj.produto_id ?? obj.presente_id ?? 0);
        const qtd = Math.max(1, Number(obj.qtd ?? obj.quantidade ?? obj.quantity ?? 1));
        if (Number.isInteger(id) && id > 0) for (let i = 0; i < qtd; i++) out.push(id);
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Liquida o estoque de UMA venda exatamente uma vez (idempotente e seguro a corridas).
 * - "convert": reserva -> vendida (pagamento aprovado)
 * - "release": apenas devolve a reserva (rejeitado/expirado)
 * Retorna true se ESTE chamado foi quem liquidou (útil para contagem/log).
 */
export async function settleStockForSale(saleId: number, outcome: "convert" | "release"): Promise<boolean> {
  await ensureStockSettledColumn();
  const sale = await queryOne<{ ids_produtos: string | null }>(
    "SELECT ids_produtos FROM vendas WHERE id = ? LIMIT 1",
    [saleId],
  ).catch(() => null);
  if (!sale) return false;

  // Claim atômico: só prossegue quem conseguir virar 0 -> 1.
  const [res] = await db().execute("UPDATE vendas SET stock_settled = 1 WHERE id = ? AND stock_settled = 0", [saleId]);
  if (!res || (res as { affectedRows?: number }).affectedRows !== 1) return false;

  const ids = parseIdsArray(sale.ids_produtos);
  if (outcome === "convert") await convertStock(ids);
  else await releaseStock(ids);
  return true;
}

/** Atalho: liquida pelo gateway_payment_id (usado pelo webhook). */
export async function settleStockForPayment(paymentId: string, outcome: "convert" | "release"): Promise<void> {
  if (!paymentId) return;
  const sale = await queryOne<{ id: number }>(
    "SELECT id FROM vendas WHERE gateway_payment_id = ? LIMIT 1",
    [paymentId],
  ).catch(() => null);
  if (sale?.id) await settleStockForSale(Number(sale.id), outcome);
}

/**
 * Libera reservas de Pix expirados/abandonados (sem webhook de cancelamento).
 * Pega vendas ainda pendentes, com validade vencida e estoque não liquidado,
 * devolve a reserva e marca como expiradas. Chamado de forma "preguiçosa"
 * no checkout e na listagem de presentes. Retorna quantas vendas liberou.
 */
export async function releaseExpiredReservations(): Promise<number> {
  await ensureStockSettledColumn().catch(() => undefined);
  const expiradas = await queryRows<{ id: number }>(
    `SELECT id FROM vendas
     WHERE stock_settled = 0
       AND (status IS NULL OR status = '' OR status = 'pending' OR status = 'in_process')
       AND date_of_expiration IS NOT NULL
       AND date_of_expiration < NOW()
       AND (payment_method IS NULL OR payment_method = '' OR payment_method = 'pix')
     LIMIT 200`,
  ).catch(() => [] as { id: number }[]);

  let liberadas = 0;
  for (const venda of expiradas) {
    const fez = await settleStockForSale(Number(venda.id), "release");
    if (fez) {
      await db().execute("UPDATE vendas SET status = 'expired' WHERE id = ?", [venda.id]).catch(() => undefined);
      liberadas++;
    }
  }
  return liberadas;
}
