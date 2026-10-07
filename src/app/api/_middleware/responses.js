/**
 * Utilitários para respostas de API
 */
import { NextResponse } from "next/server";
export function json(data, options) {
    return NextResponse.json({ sucesso: true, data }, {
        status: options?.status || 200,
        headers: options?.headers,
    });
}
export function erro(mensagem, options) {
    return NextResponse.json({
        sucesso: false,
        erro: mensagem,
        code: options?.code || "ERROR",
    }, {
        status: options?.status || 500,
        headers: options?.headers,
    });
}
export function validacaoErro(erros, options) {
    return NextResponse.json({
        sucesso: false,
        erro: "Erro de validação",
        code: "VALIDATION_ERROR",
        erros,
    }, {
        status: 400,
        headers: options?.headers,
    });
}
export function naoEncontrado(recurso = "Recurso") {
    return NextResponse.json({
        sucesso: false,
        erro: `${recurso} não encontrado`,
        code: "NOT_FOUND",
    }, {
        status: 404,
    });
}
export function naoPAutorizado() {
    return NextResponse.json({
        sucesso: false,
        erro: "Não autorizado",
        code: "UNAUTHORIZED",
    }, {
        status: 401,
    });
}
export function proibido() {
    return NextResponse.json({
        sucesso: false,
        erro: "Acesso proibido",
        code: "FORBIDDEN",
    }, {
        status: 403,
    });
}
export function metodoNaoPermitido() {
    return NextResponse.json({
        sucesso: false,
        erro: "Método não permitido",
        code: "METHOD_NOT_ALLOWED",
    }, {
        status: 405,
    });
}
export function erroInterno(mensagem = "Erro interno do servidor") {
    return NextResponse.json({
        sucesso: false,
        erro: mensagem,
        code: "INTERNAL_ERROR",
    }, {
        status: 500,
    });
}
