import { errorJson, json } from "./http";
import { fetchEfiPayment, normalizeStatus, saleByStatusToken, updateSaleStatusByPayment } from "./payment";

export async function handlePaymentStatusRequest(request: Request) {
  try {
    const data = await request.json().catch(() => ({}));
    const token = String(data.token || "").trim();
    if (!/^[a-f0-9]{32,64}$/i.test(token)) return errorJson("Token inválido.", 400);

    const sale = await saleByStatusToken(token);
    if (!sale) return errorJson("Pagamento não encontrado.", 404);

    let status = String(sale.status || "pending");
    let detail = String(sale.status_detail || "");
    const paymentId = String(sale.gateway_payment_id || "");

    if ((data.force || status === "pending" || status === "in_process") && paymentId) {
      const payment = await fetchEfiPayment(paymentId);
      if (payment) {
        detail = String(payment.status || detail || "PENDING");
        status = normalizeStatus(detail);
        await updateSaleStatusByPayment(paymentId, status, detail);
      }
    }

    const approved = status === "approved";
    const rejected = status === "rejected";

    return json({
      sucesso: true,
      status,
      status_detail: detail,
      approved,
      aprovado: approved,
      rejected,
      encerrado: approved || rejected,
      id: paymentId,
      total: Number(sale.valor_total || 0),
      payment_method: sale.payment_method || null,
    });
  } catch (error) {
    console.error("Erro em consulta de status do pagamento", error);
    return errorJson("Falha ao consultar status do pagamento.", 500);
  }
}
