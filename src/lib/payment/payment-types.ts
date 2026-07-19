/**
 * Tipos relacionados a pagamentos
 */

export type CheckoutPayload = {
  transaction_amount?: number;
  description?: string;
  installments?: number;
  payer?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    identification?: { number?: string };
    phone?: { number?: string };
    address?: { zip_code?: string; number?: string };
  };
  card?: { number?: string; holder_name?: string; expiration?: string; ccv?: string };
  metadata?: { ids_produtos?: unknown; mensagem?: string; cartao_personalizado?: unknown; modelo_cartao?: string };
  recaptchaToken?: string;
};

export type SaleData = {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  cep?: string;
  numeroEndereco?: string;
  mensagem: string;
  itens: string;
  idsProdutos: number[];
  valor: number;
  gatewayPaymentId: string;
  status: string;
  statusDetail: string;
  paymentMethod: "pix" | "cartao";
  externalReference: string;
  statusToken: string;
  qrCode?: string;
  qrCodeBase64?: string;
  pixQrCodeId?: string;
  dateOfExpiration?: string;
};

export type DbRow = Record<string, unknown>;

export type CustomerData = {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  cep?: string;
  numeroEndereco?: string;
};
