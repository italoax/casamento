import addressparser from "nodemailer/lib/addressparser";
import { normalizarEmail } from "./email-address.mjs";

export function prepararEnderecos(valor, campo) {
    if (typeof valor !== "string" || /[\r\n\x00]/.test(valor)) throw new Error(`Endereço inválido em ${campo}.`);
    const entradas = addressparser(valor).flatMap(item => item.group || [item]);
    if (!entradas.length) throw new Error(`Informe um endereço válido em ${campo}.`);
    return entradas.map(item => {
        const address = normalizarEmail(item.address);
        if (!address) throw new Error(`Endereço inválido em ${campo}: use um e-mail sem acentos antes do @. Nomes de exibição podem conter acentos.`);
        return { name: item.name || "", address };
    });
}

export function prepararRemetente(from, user) {
    if (/[\r\n\x00]/.test(from || "")) throw new Error("SMTP_FROM contém quebra de linha inválida.");
    // Também aceita SMTP_FROM como nome, usando a conta SMTP como endereço.
    if (from && !from.includes("@")) {
        const address = normalizarEmail(user);
        if (!address) throw new Error("SMTP_USER precisa ser um endereço válido sem acentos antes do @.");
        return { name: from.trim(), address };
    }
    const remetentes = prepararEnderecos(from || user, "SMTP_FROM");
    if (remetentes.length !== 1) throw new Error("SMTP_FROM deve conter apenas um remetente.");
    return remetentes[0];
}
