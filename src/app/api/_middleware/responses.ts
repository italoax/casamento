/**
 * Utilitários para respostas de API
 */

import { NextResponse } from "next/server";
import type { ApiResponse, ApiError } from "@/lib/types/api";

export function json<T = any>(
  data: T,
  options?: { status?: number; headers?: Record<string, string> }
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { sucesso: true, data },
    {
      status: options?.status || 200,
      headers: options?.headers,
    }
  );
}

export function erro(
  mensagem: string,
  options?: { status?: number; code?: string; headers?: Record<string, string> }
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      sucesso: false,
      erro: mensagem,
      code: options?.code || "ERROR",
    },
    {
      status: options?.status || 500,
      headers: options?.headers,
    }
  );
}

export function validacaoErro(
  erros: Record<string, string>,
  options?: { headers?: Record<string, string> }
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      sucesso: false,
      erro: "Erro de validação",
      code: "VALIDATION_ERROR",
      erros,
    },
    {
      status: 400,
      headers: options?.headers,
    }
  );
}

export function naoEncontrado(
  recurso = "Recurso"
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      sucesso: false,
      erro: `${recurso} não encontrado`,
      code: "NOT_FOUND",
    },
    {
      status: 404,
    }
  );
}

export function naoPAutorizado(): NextResponse<ApiError> {
  return NextResponse.json(
    {
      sucesso: false,
      erro: "Não autorizado",
      code: "UNAUTHORIZED",
    },
    {
      status: 401,
    }
  );
}

export function proibido(): NextResponse<ApiError> {
  return NextResponse.json(
    {
      sucesso: false,
      erro: "Acesso proibido",
      code: "FORBIDDEN",
    },
    {
      status: 403,
    }
  );
}

export function metodoNaoPermitido(): NextResponse<ApiError> {
  return NextResponse.json(
    {
      sucesso: false,
      erro: "Método não permitido",
      code: "METHOD_NOT_ALLOWED",
    },
    {
      status: 405,
    }
  );
}

export function erroInterno(
  mensagem = "Erro interno do servidor"
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      sucesso: false,
      erro: mensagem,
      code: "INTERNAL_ERROR",
    },
    {
      status: 500,
    }
  );
}
