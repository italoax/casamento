export const FOTOS_EMAIL_DEFAULTS = {
    assunto: "As fotos do nosso casamento já estão disponíveis!",
    mensagem: "Que alegria reviver esse dia com vocês!\n\nAs fotos do nosso casamento já estão disponíveis no site. Você pode ver o álbum e baixar suas fotos favoritas.\n\nObrigado por fazer parte da nossa história.\n\nCom carinho,\nEmanuelle e Ítalo",
    url: "https://emanuelleitalo.com/#album-fotos",
};

export function emailValido(valor) {
    return typeof valor === "string" && valor.length <= 150 && /^[^\s<>@,;()"\\\x00-\x1f]+@[^\s<>@,;()"\\]+\.[^\s<>@,;()"\\]+$/.test(valor);
}

export function prepararDestinatarios(linhas) {
    const emails = new Set();
    let invalidos = 0, repetidos = 0;
    const destinatarios = [];
    for (const linha of linhas) {
        const email = String(linha.email || "").trim().toLowerCase();
        if (!emailValido(email)) { invalidos++; continue; }
        if (emails.has(email)) { repetidos++; continue; }
        emails.add(email);
        destinatarios.push({ id: Number(linha.id), nome: String(linha.nome), email });
    }
    return { destinatarios, invalidos, repetidos };
}

export function validarAvisoFotos(body) {
    const assunto = String(body?.assunto || "").trim();
    const mensagem = String(body?.mensagem || "").trim();
    const url = String(body?.url || "").trim();
    if (!assunto || assunto.length > 150 || /[\r\n]/.test(assunto)) throw new Error("Informe um assunto de até 150 caracteres, sem quebras de linha.");
    if (!mensagem || mensagem.length > 3000) throw new Error("Informe uma mensagem de até 3.000 caracteres.");
    let parsed;
    try { parsed = new URL(url); } catch { throw new Error("Informe um link válido para as fotos."); }
    if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password || url.length > 500) throw new Error("O link das fotos precisa começar com https:// ou http://.");
    const ids = Array.isArray(body?.ids) ? [...new Set(body.ids.map(Number))] : [];
    if (!ids.length || ids.length > 3000 || ids.some(id => !Number.isSafeInteger(id) || id < 1)) throw new Error("Selecione pelo menos um convidado.");
    return { assunto, mensagem, url: parsed.href, ids };
}
