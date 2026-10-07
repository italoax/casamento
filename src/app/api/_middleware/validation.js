/**
 * Middleware para validação de requisições
 */
export async function parseJSON(request) {
    try {
        return await request.json();
    }
    catch (error) {
        throw new Error("Invalid JSON body");
    }
}
export function validarMethod(method, permitidos) {
    return permitidos.includes(method.toUpperCase());
}
export function validarCamposObrigatorios(dados, campos) {
    const erros = [];
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
export function validarTipos(dados, schema) {
    const erros = [];
    Object.entries(schema).forEach(([campo, tipo]) => {
        const valor = dados[campo];
        if (valor === null || valor === undefined)
            return;
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
export function validarComSchema(dados, validadores) {
    const erros = [];
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
export function verificarErrosValidacao(erros) {
    const errors = {};
    erros.forEach((erro) => {
        errors[erro.field] = erro.message;
    });
    return {
        valid: erros.length === 0,
        errors,
    };
}
