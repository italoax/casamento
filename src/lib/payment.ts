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
// Validação
// ============================================
export { validateRecaptcha } from "./payment/payment-validation";

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
export { customerDataFromPayload, createEfiCustomer } from "./efi";

// ============================================
// Vendas
// ============================================
export { insertSale, logPayment, newRefs, saleByStatusToken, updateSaleStatusByPayment, parseIds } from "./payment/payment-sales";

// ============================================
// Efí Pay
// ============================================
export { clientIp, cardExpiration } from "./payment/payment-card-utils";
export { fetchEfiPayment, createEfiPixCharge, createEfiCardCharge, configureEfiPixWebhook } from "./efi";

