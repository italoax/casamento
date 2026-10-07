import { handlePaymentStatusRequest } from "@/lib/payment/payment-status";
export const runtime = "nodejs";
// Endpoint canônico de status de pagamento (pix/cartão).
export const POST = handlePaymentStatusRequest;
