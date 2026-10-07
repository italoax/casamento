/**
 * Modelo padrão de mensagem do WhatsApp + PDF do convite.
 * Persistido na tabela genérica rsvp_config (chave/valor), editável no painel.
 */
import { db, queryOne, queryRows, tableExists } from "../db";
const CHAVE_MSG = "whatsapp_mensagem";
const CHAVE_PDF = "whatsapp_convite_pdf";
export async function getWhatsappModelo() {
    if (await tableExists("rsvp_config")) {
        const m = await queryOne("SELECT valor FROM rsvp_config WHERE chave = ? LIMIT 1", [CHAVE_MSG]);
        const p = await queryOne("SELECT valor FROM rsvp_config WHERE chave = ? LIMIT 1", [CHAVE_PDF]);
        return { mensagem: m?.valor || "", pdf: p?.valor || "" };
    }
    return { mensagem: "", pdf: "" };
}
async function ensureConfigTable() {
    await db()
        .execute(`CREATE TABLE IF NOT EXISTS rsvp_config (
        chave VARCHAR(120) NOT NULL PRIMARY KEY,
        valor TEXT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
        .catch(() => undefined);
}
async function setConfig(chave, valor) {
    await ensureConfigTable();
    await db().execute("INSERT INTO rsvp_config (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)", [chave, valor]);
}
export async function setWhatsappMensagem(mensagem) {
    await setConfig(CHAVE_MSG, String(mensagem || "").slice(0, 4000));
}
export async function setWhatsappPdf(filename) {
    await setConfig(CHAVE_PDF, String(filename || ""));
}
async function ensureModelosTable() {
    await db()
        .execute(`CREATE TABLE IF NOT EXISTS whatsapp_modelos (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        mensagem TEXT NOT NULL,
        pdf VARCHAR(255) NOT NULL DEFAULT '',
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
        .catch(() => undefined);
    await db()
        .execute("ALTER TABLE whatsapp_modelos ADD COLUMN pdf VARCHAR(255) NOT NULL DEFAULT '' AFTER mensagem")
        .catch(() => undefined);
}
export async function listarModelos() {
    await ensureModelosTable();
    return queryRows("SELECT id, nome, mensagem, pdf FROM whatsapp_modelos ORDER BY nome");
}
export async function obterModelo(id) {
    await ensureModelosTable();
    return queryOne("SELECT id, nome, mensagem, pdf FROM whatsapp_modelos WHERE id = ?", [id]);
}
export async function criarModelo(nome, mensagem, pdf = "") {
    await ensureModelosTable();
    const [result] = await db().execute("INSERT INTO whatsapp_modelos (nome, mensagem, pdf) VALUES (?, ?, ?)", [nome.slice(0, 100), mensagem.slice(0, 4000), pdf]);
    return result.insertId;
}
export async function atualizarModelo(id, nome, mensagem) {
    await ensureModelosTable();
    await db().execute("UPDATE whatsapp_modelos SET nome = ?, mensagem = ? WHERE id = ?", [nome.slice(0, 100), mensagem.slice(0, 4000), id]);
}
export async function setModeloPdf(id, pdf) {
    await ensureModelosTable();
    await db().execute("UPDATE whatsapp_modelos SET pdf = ? WHERE id = ?", [pdf, id]);
}
export async function excluirModelo(id) {
    await ensureModelosTable();
    await db().execute("DELETE FROM whatsapp_modelos WHERE id = ?", [id]);
}
