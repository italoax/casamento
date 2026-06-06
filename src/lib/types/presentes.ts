/**
 * Tipos relacionados a presentes/lista de presentes
 */

export interface PresenteCotas {
  id: string | number;
  quantidade_disponivel: number;
  quantidade_vendida?: number;
  quantidade_reservada?: number;
  preco_total_referencia?: number;
}

export interface Presente {
  id: string | number;
  nome: string;
  descricao?: string;
  imagem?: string;
  preco: number;
  preco_unitario?: number;
  quantidade_disponivel?: number;
  quantidade_vendida?: number;
  quantidade_reservada?: number;
  preco_total_referencia?: number;
  status: 'disponivel' | 'indisponivel' | 'esgotado';
  usa_cotas?: boolean;
  categoria?: string;
  url?: string;
}

export interface ResumoEstoque {
  limiteDefinido: boolean;
  qtdDisponivel: number | null;
  qtdVendida: number;
  qtdReservada: number;
  qtdReservadaConsiderada: number;
  qtdComprometida: number;
  saldoDisponivel: number;
  esgotado: boolean;
  indisponivelPorEstoque: boolean;
}

export interface ItemCarrinho {
  produto: Presente;
  quantidade: number;
  preco_unitario: number;
  preco_total: number;
  cartao?: {
    id: string;
    modelo: string;
    mensagem?: string;
  };
}

export interface FiltroPresentes {
  ordenacao?: 'nome' | 'preco' | 'recente';
  categoria?: string;
  apenas_disponiveis?: boolean;
}

export interface PresenteApiResponse {
  sucesso: boolean;
  presentes?: Presente[];
  erro?: string;
}
