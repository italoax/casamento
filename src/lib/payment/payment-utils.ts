/**
 * Utilitários de formatação e validação de strings
 * Funções puras de transformação de dados
 */

export function digits(value: unknown): string {
  return String(value || "").replace(/\D/g, "");
}

export function clean(value: unknown, max = 255): string {
  return String(value ?? "").replace(/<[^>]*>/g, "").trim().slice(0, max);
}

export function normalizeStatus(status: unknown): "approved" | "rejected" | "pending" {
  const s = String(status || "").toUpperCase();
  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "APPROVED", "PAID", "CONCLUIDA", "SETTLED", "PAID_OUT"].includes(s)) return "approved";
  if (["REFUNDED", "CHARGEBACK", "CANCELED", "CANCELLED", "OVERDUE", "PAYMENT_DELETED", "REJECTED", "REPROVED", "DECLINED", "REFUSED", "FAILED", "REMOVIDA_PELO_USUARIO_RECEBEDOR", "REMOVIDA_PELO_PSP"].includes(s)) return "rejected";
  return "pending";
}
