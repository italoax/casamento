import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { db, queryRows, tableExists } from "@/lib/db";
import { condicaoVendasPendentes } from "@/lib/painel-data";
import { fetchAsaasPayment, normalizeStatus, settleStockForSale } from "@/lib/payment";

export const runtime = "nodejs";

type Venda = { id: number; gateway_payment_id?: string | null; status?: string | null; payment_method?: string | null; ids_produtos?: string | null };

export async function POST() {
  if (!(await requirePainelPermission("sync_vendas"))) return errorJson("Acesso negado.", 403);
  if (!(await tableExists("vendas"))) return json({ sucesso: true, atualizados: 0, aprovados: 0, pendentes: 0, erros: 0, expirados_liberados: 0 });

  const pendentes = await queryRows<Venda>(`SELECT id, gateway_payment_id, status, payment_method, ids_produtos FROM vendas WHERE ${condicaoVendasPendentes()} AND (payment_method IS NULL OR payment_method = '' OR payment_method = 'pix') AND gateway_payment_id IS NOT NULL AND gateway_payment_id <> '' ORDER BY data_compra DESC LIMIT 50`);
  let atualizados = 0;
  let aprovados = 0;
  let erros = 0;

  for (const venda of pendentes) {
    try {
      const payment = await fetchAsaasPayment(String(venda.gateway_payment_id));
      if (!payment) { erros++; continue; }
      const statusNovo = normalizeStatus(payment.status || venda.status);
      // Asaas usa ids "pay_..." para Pix e cartão; confiamos no método já gravado.
      const method = String(venda.payment_method || "pix").toLowerCase();
      const statusAtual = String(venda.status || "").toLowerCase();
      await db().execute("UPDATE vendas SET status = ?, payment_method = COALESCE(NULLIF(?, ''), payment_method) WHERE id = ?", [statusNovo, method, venda.id]);
      if (statusNovo !== statusAtual) atualizados++;
      if (statusNovo === "approved" && statusAtual !== "approved") {
        await settleStockForSale(venda.id, "convert");
        aprovados++;
      } else if (statusNovo === "rejected" && ["pending", "in_process"].includes(statusAtual)) {
        await settleStockForSale(venda.id, "release");
      }
    } catch {
      erros++;
    }
  }

  const rest = await queryRows<{ total: number }>(`SELECT COUNT(*) total FROM vendas WHERE ${condicaoVendasPendentes()}`);
  return json({ sucesso: true, atualizados, aprovados, pendentes: Number(rest[0]?.total || 0), erros, expirados_liberados: 0 });
}
