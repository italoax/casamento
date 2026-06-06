/**
 * Utilitários para tratamento de erros e resposta de API
 */

import type { ApiResponse, ApiError } from "@/lib/types/api";

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string = "INTERNAL_ERROR",
    public status: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function criarResposta<T>(
  sucesso: boolean,
  data?: T,
  erro?: string
): ApiResponse<T> {
  return {
    sucesso,
    ...(data !== undefined && { data }),
    ...(erro && { erro }),
  };
}

export function criarErro(
  erro: string,
  code = "INTERNAL_ERROR",
  status = 500
): ApiError {
  return {
    sucesso: false,
    erro,
    code,
    status,
  };
}

export function tratarErroAPI(erro: any): ApiError {
  if (erro instanceof AppError) {
    return {
      sucesso: false,
      erro: erro.message,
      code: erro.code,
      status: erro.status,
    };
  }

  if (erro instanceof Error) {
    return {
      sucesso: false,
      erro: erro.message,
      code: "INTERNAL_ERROR",
      status: 500,
    };
  }

  return {
    sucesso: false,
    erro: "Erro desconhecido",
    code: "UNKNOWN_ERROR",
    status: 500,
  };
}

export function isAppError(erro: any): erro is AppError {
  return erro instanceof AppError;
}

export function logErro(erro: any, contexto?: string): void {
  if (typeof window !== "undefined") {
    // Cliente
    console.error(`[${contexto || "APP"}]`, erro);
  } else {
    // Servidor
    console.error(`[${contexto || "API"}]`, erro);
  }
}

export async function tratarErroResponse(response: Response): Promise<ApiError> {
  let erro: ApiError;

  try {
    const data = await response.json();
    erro = data as ApiError;
  } catch {
    erro = criarErro("Erro ao processar resposta", "PARSE_ERROR", response.status);
  }

  return erro;
}

export function assertaDefined<T>(
  valor: T | undefined | null,
  mensagem: string
): T {
  if (valor === undefined || valor === null) {
    throw new AppError(mensagem, "VALIDATION_ERROR", 400);
  }
  return valor;
}

export function assertaString(valor: any, campo: string): string {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new AppError(`${campo} deve ser uma string`, "VALIDATION_ERROR", 400);
  }
  return valor;
}

export function assertaNumber(valor: any, campo: string): number {
  const num = Number(valor);
  if (isNaN(num)) {
    throw new AppError(`${campo} deve ser um número`, "VALIDATION_ERROR", 400);
  }
  return num;
}
