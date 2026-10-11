// Guarda o motivo da recusa sem expor credenciais ou endereços no painel.
export function descreverErroSmtp(error, segredos = []) {
    let detalhe = String(error?.response || error?.message || "Falha no envio; confira se chegou antes de reenviar.");
    for (const segredo of segredos.filter(Boolean)) {
        detalhe = detalhe.split(segredo).join("[credencial]");
    }
    detalhe = detalhe
        .replace(/[^\s<>()[\],;:"']+@[^\s<>()[\],;:"']+/g, "[email]")
        .replace(/(password|passwd|secret|token|api[_-]?key)\s*[=:]\s*[^\s&]+/gi, "$1=[credencial]")
        .replace(/[\r\n\x00-\x1f\x7f]+/g, " ")
        .trim();
    const codigo = /^[A-Z0-9_]+$/.test(error?.code || "") ? error.code : "";
    const comando = /^(AUTH(?: [A-Z0-9_-]+)?|MAIL FROM|RCPT TO|DATA|CONN|EHLO|HELO|STARTTLS)$/i.test(error?.command || "") ? error.command : "";
    const status = Number.isInteger(error?.responseCode) ? String(error.responseCode) : "";
    const contexto = [codigo, status, comando].filter(Boolean).join(" / ");
    return `${contexto ? `SMTP (${contexto}): ` : ""}${detalhe}`.slice(0, 255);
}
