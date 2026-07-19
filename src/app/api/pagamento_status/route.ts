import { handlePaymentStatusRequest } from "@/lib/payment-status";

export const runtime = "nodejs";

// Alias antigo (com "_"): mantido só por compatibilidade com clientes que ainda
// tenham o JS em cache chamando /api/pagamento_status. O caminho oficial agora é
// /api/pagamento-status. Pode ser removido num deploy futuro.
export const POST = handlePaymentStatusRequest;
