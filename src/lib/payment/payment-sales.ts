/**
 * Operações de vendas e logs de pagamento
 * Insere vendas no banco, registra logs e atualiza status
 */

import { randomBytes } from "node:crypto";
import { db, queryOne, queryRows } from "../db";
import { encryptCPF, encryptEmail, encryptPhone, decryptEmail } from "../encryption";
import { normalizeStatus } from "./payment-utils";
import { settleStockForPayment } from "./payment-stock";
import { enviarPixExpirado } from "../site-emails";
import type { DbRow, SaleData } from "./payment-types";

const SALE_COLUMNS = [
  "id",
  "ids_produtos",
  "valor_total",
  "nome_comprador",
  "email",
  "itens",
  "gateway_payment_id",
  "status",
  "status_detail",
  "payment_method",
  "external_reference",
  "comprovante_enviado",
].join(", ");

async function ensureSalesTable() {
  await db().execute(`CREATE TABLE IF NOT EXISTS vendas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_comprador VARCHAR(255),
    mensagem TEXT,
    itens TEXT,
    ids_produtos TEXT,
    valor_total DECIMAL(10,2),
    email VARCHAR(255),
    cpf VARCHAR(255),
    telefone VARCHAR(255),
    cep VARCHAR(12) NULL,
    numero_endereco VARCHAR(20) NULL,
    data_compra DATETIME DEFAULT CURRENT_TIMESTAMP,
    gateway_payment_id VARCHAR(80),
    status VARCHAR(50),
    status_detail VARCHAR(80) NULL,
    comprovante_enviado TINYINT(1) DEFAULT 0,
    status_token VARCHAR(64) NULL,
    pix_qr_code_id VARCHAR(80) NULL,
    qr_code TEXT NULL,
    qr_code_base64 MEDIUMTEXT NULL,
    date_of_expiration DATETIME NULL,
    payment_method VARCHAR(20) NULL,
    external_reference VARCHAR(80) NULL,
    INDEX idx_gateway_payment_id (gateway_payment_id),
    INDEX idx_status_token (status_token),
    INDEX idx_external_reference (external_reference)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await ampliarColunasSensiveis("vendas");
}

// CPF/telefone são guardados criptografados (~78 chars). Versões antigas das
// tabelas criaram essas colunas como VARCHAR(20), o que TRUNCAVA o valor cifrado
// e o tornava impossível de descriptografar. Aqui ampliamos para VARCHAR(255)
// nas tabelas já existentes (idempotente; roda uma vez por processo por tabela).
const colunasAmpliadas = new Set<string>();
async function ampliarColunasSensiveis(tabela: "vendas" | "site_logs") {
  if (colunasAmpliadas.has(tabela)) return;
  colunasAmpliadas.add(tabela);
  await db().execute(`ALTER TABLE ${tabela} MODIFY cpf VARCHAR(255) NULL`).catch(() => undefined);
  await db().execute(`ALTER TABLE ${tabela} MODIFY telefone VARCHAR(255) NULL`).catch(() => undefined);
}

export async function insertSale(sale: SaleData): Promise<void> {
  await ensureSalesTable();
  
  // Encriptar dados sensíveis (LGPD compliance)
  const encryptedEmail = sale.email ? encryptEmail(sale.email) : '';
  const encryptedCpf = sale.cpf ? encryptCPF(sale.cpf) : '';
  const encryptedPhone = sale.telefone ? encryptPhone(sale.telefone) : '';
  
  await db().execute(
    `INSERT INTO vendas (nome_comprador, mensagem, itens, ids_produtos, valor_total, email, cpf, telefone, cep, numero_endereco, data_compra, gateway_payment_id, status, status_detail, status_token, pix_qr_code_id, qr_code, qr_code_base64, date_of_expiration, payment_method, external_reference)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sale.nome,
      sale.mensagem,
      sale.itens,
      JSON.stringify(sale.idsProdutos),
      sale.valor,
      encryptedEmail,
      encryptedCpf,
      encryptedPhone,
      sale.cep || null,
      sale.numeroEndereco || null,
      sale.gatewayPaymentId,
      sale.status,
      sale.statusDetail,
      sale.statusToken,
      sale.pixQrCodeId || null,
      sale.qrCode || null,
      sale.qrCodeBase64 || null,
      sale.dateOfExpiration || null,
      sale.paymentMethod,
      sale.externalReference,
    ],
  );
}

export async function logPayment(data: DbRow): Promise<void> {
  // Grava em site_logs (a tabela que o painel exibe na aba "Logs").
  await db().execute(`CREATE TABLE IF NOT EXISTS site_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tipo VARCHAR(30), status VARCHAR(30), mensagem TEXT,
    nome_comprador VARCHAR(255) NULL, email VARCHAR(255) NULL, cpf VARCHAR(255) NULL, telefone VARCHAR(255) NULL,
    itens TEXT NULL, valor DECIMAL(10,2) NULL,
    gateway_payment_id VARCHAR(80) NULL, external_reference VARCHAR(80) NULL, payload JSON NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch(() => undefined);
  await ampliarColunasSensiveis("site_logs");

  const values: Array<string | number | null> = [
    data.tipo ? String(data.tipo) : null,
    data.status ? String(data.status) : null,
    data.mensagem ? String(data.mensagem) : null,
    data.nome_comprador ? String(data.nome_comprador) : null,
    data.email ? String(data.email) : null,
    data.cpf ? String(data.cpf) : null,
    data.telefone ? String(data.telefone) : null,
    data.itens ? String(data.itens) : null,
    data.valor === null || data.valor === undefined ? null : Number(data.valor),
    data.gateway_payment_id ? String(data.gateway_payment_id) : null,
    data.external_reference ? String(data.external_reference) : null,
    data.payload ? JSON.stringify(data.payload) : null,
  ];

  await db()
    .execute(
      "INSERT INTO site_logs (tipo, status, mensagem, nome_comprador, email, cpf, telefone, itens, valor, gateway_payment_id, external_reference, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      values
    )
    .catch(() => undefined);
}

export function newRefs() {
  return {
    externalReference: `venda_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}_${randomBytes(4).toString("hex")}`,
    statusToken: randomBytes(16).toString("hex"),
  };
}

export async function saleByStatusToken(token: string): Promise<DbRow | null> {
  await ensureSalesTable();
  return queryOne<DbRow>(`SELECT ${SALE_COLUMNS} FROM vendas WHERE status_token = ? LIMIT 1`, [token]);
}

export async function updateSaleStatusByPayment(
  paymentId: string,
  status: string,
  statusDetail: string
): Promise<DbRow | null> {
  await ensureSalesTable();
  const normalized = normalizeStatus(status);
  // Lê o estado anterior para detectar a transição (envio único de e-mail).
  const anterior = await queryOne<DbRow>(`SELECT ${SALE_COLUMNS} FROM vendas WHERE gateway_payment_id = ? LIMIT 1`, [paymentId]);
  await db().execute("UPDATE vendas SET status = ?, status_detail = ? WHERE gateway_payment_id = ?", [normalized, statusDetail, paymentId]);

  // Liquida o estoque de forma idempotente sempre que o status muda para final.
  // Centralizar aqui garante que webhook E consulta de status (polling) tratem o estoque,
  // sem depender de sincronização manual.
  if (normalized === "approved") {
    await settleStockForPayment(paymentId, "convert").catch(() => undefined);
  } else if (normalized === "rejected") {
    await settleStockForPayment(paymentId, "release").catch(() => undefined);
    // Pix que expirou sem pagamento: avisa o convidado uma única vez
    // (apenas na transição a partir de um estado pendente).
    void notificarPixExpirado(anterior, normalized);
  }

  return queryOne<DbRow>(`SELECT ${SALE_COLUMNS} FROM vendas WHERE gateway_payment_id = ? LIMIT 1`, [paymentId]);
}

/**
 * Dispara o e-mail de "Pix expirado" só quando o pagamento sai de um estado
 * pendente para rejeitado/expirado e o método é Pix. O próprio uso do status
 * anterior garante o envio único (chamadas repetidas do polling já encontram
 * o status como "rejected"). Nunca quebra o fluxo de pagamento.
 */
async function notificarPixExpirado(anterior: DbRow | null, novoStatus: string): Promise<void> {
  try {
    if (!anterior || novoStatus !== "rejected") return;
    const statusAnterior = String(anterior.status || "").toLowerCase();
    if (!["pending", "in_process", ""].includes(statusAnterior)) return;
    const metodo = String(anterior.payment_method || "").toLowerCase();
    if (metodo && metodo !== "pix") return; // cartão recusado é tratado no webhook
    if (!anterior.email) return;
    let email = "";
    try {
      email = decryptEmail(String(anterior.email));
    } catch {
      email = String(anterior.email || "");
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    await enviarPixExpirado({
      email,
      nome: String(anterior.nome_comprador || "Convidado"),
      itens: anterior.itens,
      total: Number(anterior.valor_total || 0),
    });
  } catch {
    // E-mail é best-effort: nunca interrompe a atualização de status.
  }
}

/**
 * IDs de cobranças (gateway_payment_id) de Pix ainda pendentes e já vencidos,
 * para apagá-las no Asaas (o cron de expiração faz a limpeza). Limita o lote.
 */
export async function pendingExpiredPixPaymentIds(limite = 200): Promise<string[]> {
  await ensureSalesTable();
  const lim = Math.min(Math.max(1, Math.trunc(limite)), 500);
  const rows = await queryRows<{ gateway_payment_id: string }>(
    `SELECT gateway_payment_id FROM vendas
     WHERE (status IS NULL OR status = '' OR status = 'pending' OR status = 'in_process')
       AND date_of_expiration IS NOT NULL
       AND date_of_expiration < NOW()
       AND payment_method = 'pix'
       AND gateway_payment_id IS NOT NULL AND gateway_payment_id <> ''
     LIMIT ${lim}`,
  ).catch(() => [] as { gateway_payment_id: string }[]);
  return rows.map((r) => String(r.gateway_payment_id)).filter(Boolean);
}

export async function parseIds(value: unknown): Promise<number[]> {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  } catch {
    return [];
  }
}
