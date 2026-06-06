/**
 * Tipos relacionados a recados
 */

export interface Recado {
  id?: string;
  nome: string;
  email: string;
  mensagem: string;
  aprovado?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RecadoSubmit extends Omit<Recado, 'id' | 'aprovado' | 'created_at' | 'updated_at'> {
  recaptchaToken: string;
}

export interface RecadoResponse {
  sucesso: boolean;
  recados?: Recado[];
  erro?: string;
}

export interface RecadoSubmitResponse {
  sucesso: boolean;
  id?: string;
  mensagem?: string;
  erro?: string;
}
