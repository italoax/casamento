/**
 * TYPES - Tipos TypeScript Compartilhados para API
 * 
 * Define interfaces padrão para respostas de API e validações.
 * Garante consistência em toda a aplicação.
 */

/**
 * Resposta genérica de API
 * Todos os endpoints retornam este formato
 * 
 * Exemplo de sucesso:
 * { sucesso: true, data: { id: 1, nome: "João" } }
 * 
 * Exemplo de erro:
 * { sucesso: false, erro: "Usuário não encontrado" }
 */
export interface ApiResponse<T = any> {
  sucesso: boolean;
  data?: T;
  erro?: string;
  message?: string;
}

/**
 * Resposta de erro estruturada
 */
export interface ApiError {
  sucesso: false;
  erro: string;
  code?: string;         // Código interno de erro (para debugging)
  status?: number;       // Status HTTP
  erros?: Record<string, string>;  // Erros por campo (validação)
}

/**
 * Resposta paginada
 * Para endpoints que retornam listas com paginação
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;         // Total de itens (sem paginação)
  limit: number;         // Itens por página
  offset: number;        // Offset atual
}

/**
 * Erro de validação em um campo
 */
export interface ValidationError {
  field: string;         // Nome do campo com erro
  message: string;       // Mensagem de erro
  value?: any;           // Valor inválido (opcional)
}

/**
 * Resultado de validação
 * Retornado por funções de validação
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];  // Array vazio se válido
}
