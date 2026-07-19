/**
 * Lógica de checkout e cálculo de preços
 */

import { columnExists, db, queryRows } from "../db";
import { releaseExpiredReservations } from "./payment-stock";
import type { CheckoutPayload } from "./payment-types";

type DbRow = Record<string, unknown>;

const PRESENT_COLUMNS = [
  "id",
  "nome",
  "preco",
  "preco_total_referencia",
  "modo_exibicao",
  "quantidade_disponivel",
  "quantidade_vendida",
  "quantidade_reservada",
].join(", ");

async function ensureGiftStockColumns() {
  if (!(await columnExists("presentes", "quantidade_vendida").catch(() => false))) {
    await db().execute("ALTER TABLE presentes ADD COLUMN quantidade_vendida INT NOT NULL DEFAULT 0");
  }
  if (!(await columnExists("presentes", "quantidade_reservada").catch(() => false))) {
    await db().execute("ALTER TABLE presentes ADD COLUMN quantidade_reservada INT NOT NULL DEFAULT 0");
  }
}

function unitPrice(row: DbRow): number {
  const preco = Number(row.preco || 0);
  const modo = String(row.modo_exibicao || "").toLowerCase();
  const qtdRaw = row.quantidade_disponivel;
  const hasQtd = qtdRaw !== null && qtdRaw !== undefined && String(qtdRaw) !== "";
  const qtd = hasQtd ? Math.max(0, Number(qtdRaw)) : null;
  const usaCotas = modo === "cotas" || (modo === "" && qtd !== null && qtd > 1);
  
  if (usaCotas && qtd && qtd > 0) {
    const total = row.preco_total_referencia !== null && row.preco_total_referencia !== undefined && String(row.preco_total_referencia) !== "" 
      ? Number(row.preco_total_referencia) 
      : preco;
    if (preco > 0 && Math.abs(preco - total) > 0.01) return Math.round(preco * 100) / 100;
    return Math.round((total / qtd) * 100) / 100;
  }
  return Math.round(preco * 100) / 100;
}

export function extractIds(payload: CheckoutPayload): number[] {
  const raw = payload.metadata?.ids_produtos;
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
}

export async function checkoutItems(idsProdutos: number[]): Promise<{ total: number; itens: string }> {
  if (!idsProdutos.length) throw new Error("Selecione um presente válido.");

  await ensureGiftStockColumns().catch(() => undefined);
  // Libera reservas de Pix expirados antes de checar disponibilidade,
  // evitando que carrinhos abandonados travem o estoque.
  await releaseExpiredReservations().catch(() => undefined);
  
  const counts = new Map<number, number>();
  idsProdutos.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
  const ids = [...counts.keys()];
  
  const rows = await queryRows<DbRow>(
    `SELECT ${PRESENT_COLUMNS} FROM presentes WHERE status = 'disponivel' AND id IN (${ids.map(() => "?").join(",")})`,
    ids
  );
  
  if (rows.length !== ids.length) throw new Error("Um ou mais presentes não estão disponíveis.");
  
  const byId = new Map(rows.map((r) => [Number(r.id), r]));
  let total = 0;
  const labels: string[] = [];
  
  for (const [id, qtd] of counts) {
    const item = byId.get(id);
    if (!item) throw new Error("Presente indisponível.");
    
    const disponivel = item.quantidade_disponivel === null || item.quantidade_disponivel === undefined || String(item.quantidade_disponivel) === "" 
      ? null 
      : Number(item.quantidade_disponivel);
    const vendido = Number(item.quantidade_vendida || 0);

    // Só o que já foi PAGO (vendido) bloqueia. Reservas de Pix pendente não contam:
    // como é contribuição em dinheiro, repetições são permitidas.
    if (disponivel !== null && qtd > Math.max(0, disponivel - vendido)) {
      throw new Error(`Quantidade indisponível para ${String(item.nome || "presente")}.`);
    }
    
    const price = unitPrice(item);
    total += price * qtd;
    labels.push(`${qtd}x ${String(item.nome || "Presente")}`);
  }
  
  return { total: Math.round(total * 100) / 100, itens: labels.join(" | ") };
}
