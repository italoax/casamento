/**
 * Tipos relacionados a usuários e convidados
 */

export interface ConvidadoConfirmacao {
  id?: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  presenca: 'confirmado' | 'nao-confirmado' | 'cancelado';
  adultos?: number;
  criancas?: number;
  observacoes?: string;
  data_confirmacao?: string;
}

export interface ResumoConfirmacao {
  total_adultos: number;
  total_criancas: number;
  total_confirmados: number;
  adultos_confirmados: number;
  criancas_confirmadas: number;
  adultos_cancelados: number;
  criancas_canceladas: number;
  observacoes?: string;
}

export interface DadosComprador {
  nome_completo: string;
  email: string;
  cpf?: string;
  telefone?: string;
  endereco?: string;
}

export interface UsuarioAutenticado {
  id: string;
  email: string;
  nome?: string;
  role: 'admin' | 'guest' | 'user';
  iat: number;
  exp: number;
}
