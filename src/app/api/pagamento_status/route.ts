import { handlePaymentStatusRequest } from "@/lib/payment-status";

export const runtime = "nodejs";

// Compatibilidade com clientes antigos que ainda chamam /api/pagamento_status.
export const POST = handlePaymentStatusRequest;
