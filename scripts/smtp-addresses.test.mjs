import test from "node:test";
import assert from "node:assert/strict";
import { normalizarEmail } from "../src/lib/email/email-address.mjs";
import { prepararEnderecos, prepararRemetente } from "../src/lib/email/smtp-addresses.mjs";
import { prepararDestinatarios } from "../src/lib/email/fotos-mail.mjs";
import MailComposer from "nodemailer/lib/mail-composer";

test("não transforma um usuário com acentos em outro endereço", () => {
    assert.equal(normalizarEmail("ítalo@example.com"), null);
    assert.equal(normalizarEmail("ana\u200b@example.com"), null);
    assert.equal(normalizarEmail("ana@example.com"), "ana@example.com");
    for (const valor of ["a..b@example.com", ".ana@example.com", "ana@example.com/path", "ana@example.com:80", "a@example.com,b@example.com", "a@example.com\r\nBcc: b@example.com"]) assert.equal(normalizarEmail(valor), null);
});

test("domínios internacionais são convertidos e deduplicados", () => {
    assert.equal(normalizarEmail("ana@exemplo.com.br"), "ana@exemplo.com.br");
    assert.equal(normalizarEmail("ana@café.com"), "ana@xn--caf-dma.com");
    const data = prepararDestinatarios([
        { id: 1, nome: "Ana", email: "ana@café.com" },
        { id: 2, nome: "Ana", email: "ana@xn--caf-dma.com" },
        { id: 3, nome: "Ítalo", email: "ítalo@example.com" },
    ]);
    assert.equal(data.destinatarios.length, 1);
    assert.equal(data.repetidos, 1);
    assert.equal(data.invalidos, 1);
});

test("nome do remetente pode conter acentos sem contaminar o envelope SMTP", async () => {
    for (const valor of ["Emanuelle & Ítalo <suporte@example.com>", "Emanuelle & Ítalo"]) {
        const from = prepararRemetente(valor, "suporte@example.com");
        assert.equal(from.name, "Emanuelle & Ítalo");
        assert.equal(from.address, "suporte@example.com");
        const to = prepararEnderecos("José <jose@café.com>", "destinatário");
        const mail = new MailComposer({ from, to, envelope: { from: from.address, to: to.map(item => item.address) }, subject: "Fotos disponíveis", text: "Olá, José!" }).compile();
        const envelope = mail.getEnvelope();
        assert.equal(envelope.from, "suporte@example.com");
        assert.deepEqual(envelope.to, ["jose@xn--caf-dma.com"]);
        assert.doesNotMatch(envelope.from + envelope.to.join(""), /[^\x00-\x7f]/);
        const message = (await mail.build()).toString();
        assert.match(message, /Subject:/);
    }
});

test("rejeita remetente inválido, destinatário Unicode e injeção de cabeçalho", () => {
    assert.throws(() => prepararRemetente("Ítalo <ítalo@example.com>", "suporte@example.com"), /SMTP_FROM/);
    assert.throws(() => prepararEnderecos("ítalo@example.com", "destinatário"), /sem acentos/);
    assert.throws(() => prepararRemetente("Nome\r\nBcc: outro@example.com", "suporte@example.com"));
    assert.throws(() => prepararRemetente("a@example.com,b@example.com", "suporte@example.com"));
});
