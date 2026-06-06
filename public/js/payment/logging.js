import { calcularTotalFinal } from "../cart/checkout.js";

function registrarLogPagamentoCliente(tipo, status, mensagem, extra = {}) {
  const token = window.siteConfig?.apiLogToken || "";
  if (!token) return;
  const headers = {
    "Content-Type": "application/json"
  };
  headers["X-Api-Token"] = token;
  fetch("/api/logs", {
    method: "POST",
    headers: headers,
    keepalive: true,
    body: JSON.stringify({
      kind: "payment",
      tipo: tipo,
      status: status,
      mensagem: mensagem,
      payload: extra,
      valor: calcularTotalFinal(),
      email: tipo === "cartao" ? window.cartaoFormData?.email || "" : window.pixFormData?.email || ""
    })
  }).catch(() => {});
}

window.registrarLogPagamentoCliente = registrarLogPagamentoCliente;

export { registrarLogPagamentoCliente };
