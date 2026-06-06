/**
 * Tipos relacionados a pagamentos e checkout
 */

export type PaymentMethod = 'cartao' | 'pix';

export interface CartaoCheckout {
  id: string;
  modelo: 'padrao' | 'classico' | 'floral' | 'folhagem' | 'minimal' | 'rustico' | 'romantico';
  selecionado: boolean;
  mensagem?: string;
}

export interface PixFormData {
  nomeCompleto: string;
  email: string;
  cpf: string;
  telefone: string;
  termos: boolean;
}

export interface CartaoFormData {
  nomeCompleto: string;
  email: string;
  modeloCartao: CartaoCheckout['modelo'];
  mensagem: string;
  termos: boolean;
}

export interface CheckoutState {
  cartaoSelecionado: boolean;
  modeloCartao: CartaoCheckout['modelo'];
  nome: string;
  mensagem: string;
}

export interface PagamentoEfi {
  id?: string;
  amount: number;
  method: PaymentMethod;
  customer: {
    name: string;
    email: string;
    cpf?: string;
    phone?: string;
  };
  description?: string;
  externalReference?: string;
}

export interface PagamentoResponse {
  sucesso: boolean;
  id?: string;
  status?: string;
  qr_code?: string;
  link_pagamento?: string;
  erro?: string;
}

export interface WebhookPagamento {
  id: string;
  status: 'paid' | 'pending' | 'failed' | 'cancelled';
  amount: number;
  customer: {
    name: string;
    email: string;
  };
  createdAt: string;
}
