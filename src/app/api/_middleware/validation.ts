/**
 * Middleware para validação de requisições
 */

import { NextRequest } from "next/server";
import type { ValidationError, ValidationResult } from "@/lib/types/api";

export async function parseJSON<T = any>(request: NextRequest): Promise<T> {
  try {
    return await request.json();
  } catch (error) {
    throw new Error("Invalid JSON body");
  }
}

export function validarMethod(
  method: string,
  permitidos: string[]
): boolean {
  return permitidos.includes(method.toUpperCase());
}

export function validarCamposObrigatorios(
  dados: Record<string, any>,
  campos: string[]
): ValidationError[] {
  const erros: ValidationError[] = [];

  campos.forEach((campo) => {
    const valor = dados[campo];
    if (valor === null || valor === undefined || valor === "") {
      erros.push({
        field: campo,
        message: `${campo} é obrigatório`,
      });
    }
  });

  return erros;
}

export function validarTipos(
  dados: Record<string, any>,
  schema: Record<string, string>
): ValidationError[] {
  const erros: ValidationError[] = [];

  Object.entries(schema).forEach(([campo, tipo]) => {
    const valor = dados[campo];
    if (valor === null || valor === undefined) return;

    const tipoReal = Array.isArray(valor) ? "array" : typeof valor;
    if (tipoReal !== tipo) {
      erros.push({
        field: campo,
        message: `${campo} deve ser do tipo ${tipo}, recebido ${tipoReal}`,
      });
    }
  });

  return erros;
}

export function validarComSchema<T = any>(
  dados: any,
  validadores: Record<string, (valor: any) => string | true>
): ValidationResult {
  const erros: ValidationError[] = [];

  Object.entries(validadores).forEach(([campo, validador]) => {
    const resultado = validador(dados[campo]);
    if (resultado !== true) {
      erros.push({
        field: campo,
        message: resultado,
      });
    }
  });

  return {
    valid: erros.length === 0,
    errors: erros,
  };
}

export function verificarErrosValidacao(
  erros: ValidationError[]
): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  erros.forEach((erro) => {
    errors[erro.field] = erro.message;
  });

  return {
    valid: erros.length === 0,
    errors,
  };
}
