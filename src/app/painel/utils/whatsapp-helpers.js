// Helpers de variáveis das mensagens de WhatsApp (usados no painel).
/** Saudação conforme o horário de Brasília: Bom dia / Boa tarde / Boa noite. */
export function saudacaoAgora() {
    const hora = Number(new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        hour12: false,
    }).format(new Date()));
    if (hora < 12)
        return "Bom dia";
    if (hora < 18)
        return "Boa tarde";
    return "Boa noite";
}
/**
 * Substitui as variáveis suportadas no texto da mensagem:
 *  {{nome}}          -> nome completo do convidado
 *  {{primeiro_nome}} -> primeiro nome
 *  {{saudacao}}      -> Bom dia / Boa tarde / Boa noite (horário de Brasília)
 */
export function aplicarVariaveis(template, nome) {
    const limpo = String(nome || "").trim();
    const primeiro = limpo.split(/\s+/)[0] || limpo;
    return String(template || "")
        .replace(/\{\{\s*saudacao\s*\}\}/gi, saudacaoAgora())
        .replace(/\{\{\s*primeiro_nome\s*\}\}/gi, primeiro)
        .replace(/\{\{\s*nome\s*\}\}/gi, limpo);
}
/** Texto de ajuda das variáveis (mostrado nas telas de envio). */
export const VARIAVEIS_AJUDA = "{{nome}} · {{primeiro_nome}} · {{saudacao}}";
export const LISTAS = [
    { key: "italo", label: "Ítalo", slot: "1" },
    { key: "emanuelle", label: "Emanuelle", slot: "2" },
    { key: "jandira", label: "Jandira", slot: "3" },
];
export function listaPorChave(chave) {
    return LISTAS.find((l) => l.key === String(chave || "").toLowerCase());
}
export function nomeNumero(slot) {
    return LISTAS.find((l) => l.slot === slot)?.label || `Número ${slot}`;
}
