/**
 * Payment Module
 * 
 * Agrupa todas as operações relacionadas a pagamentos e checkout.
 * Exports consolidados dos submodulos especializados.
 */

// ============================================
// Tipos
// ============================================
export type { CheckoutPayload, SaleData, DbRow, CustomerData } from "./payment/payment-types";

// ============================================
// Utilitários e Formatação
// ============================================
export { digits, clean, normalizeStatus } from "./payment/payment-utils";

// ============================================
// Validação (captcha)
// ============================================
export { validateCaptcha } from "./captcha";

// ============================================
// Checkout e Presentes
// ============================================
export { extractIds, checkoutItems } from "./payment/payment-checkout";

// ============================================
// Estoque
// ============================================
export { reserveStock, reserveStockAtomic, convertStock, releaseStock, settleStockForSale, settleStockForPayment, releaseExpiredReservations } from "./payment/payment-stock";

// ============================================
// Cliente
// ============================================
export { customerDataFromPayload, createAsaasCustomer } from "./asaas";

// ============================================
// Vendas
// ============================================
export { insertSale, logPayment, newRefs, saleByStatusToken, updateSaleStatusByPayment, parseIds, pendingExpiredPixPaymentIds } from "./payment/payment-sales";

// ============================================
// Gateway de pagamento (Asaas)
// ============================================
export { clientIp, cardExpiration } from "./payment/payment-card-utils";
export { fetchAsaasPayment, createAsaasPixCharge, createAsaasCardCharge, configureAsaasWebhook, deleteAsaasPayment } from "./asaas";

