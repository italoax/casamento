import { execute, queryRows } from "@/lib/db";

/** Um registro de envio de mensagem do WhatsApp (histórico persistente). */
export type EnvioWhatsapp = {
  id: number;
  criado_em: string;
  convidado_id: number | null;
  nome: string;
  telefone: string;
  lista: string | null;
  sucesso: number; // 0 | 1
  erro: string | null;
  anexou_pdf: number; // 0 | 1
};

let tabelaGarantida = false;

async function ensureTabela() {
  if (tabelaGarantida) return;
  await execute(`CREATE TABLE IF NOT EXISTS whatsapp_envios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    convidado_id INT NULL,
    nome VARCHAR(120) NOT NULL,
    telefone VARCHAR(30) NOT NULL,
    lista VARCHAR(40) NULL,
    sucesso TINYINT(1) NOT NULL DEFAULT 0,
    erro VARCHAR(255) NULL,
    anexou_pdf TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_criado_em (criado_em),
    INDEX idx_convidado (convidado_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  tabelaGarantida = true;
}

/** Registra uma tentativa de envio (sucesso ou falha). Nunca lança. */
export async function registrarEnvio(dados: {
  convidadoId?: number | null;
  nome: string;
  telefone: string;
  lista?: string | null;
  sucesso: boolean;
  erro?: string | null;
  anexouPdf?: boolean;
}) {
  try {
    await ensureTabela();
    await execute(
      `INSERT INTO whatsapp_envios (convidado_id, nome, telefone, lista, sucesso, erro, anexou_pdf)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        dados.convidadoId || null,
        String(dados.nome || "").slice(0, 120),
        String(dados.telefone || "").slice(0, 30),
        dados.lista ? String(dados.lista).slice(0, 40) : null,
        dados.sucesso ? 1 : 0,
        dados.erro ? String(dados.erro).slice(0, 255) : null,
        dados.anexouPdf ? 1 : 0,
      ],
    );
  } catch {
    /* o log não pode quebrar o envio */
  }
}

/** Lista os envios mais recentes. */
export async function listarEnvios(limite = 500): Promise<EnvioWhatsapp[]> {
  await ensureTabela();
  const lim = Math.min(Math.max(1, limite), 2000);
  return queryRows<EnvioWhatsapp>(
    `SELECT id, criado_em, convidado_id, nome, telefone, lista, sucesso, erro, anexou_pdf
     FROM whatsapp_envios ORDER BY id DESC LIMIT ${lim}`,
  );
}

/** IDs de convidados que já receberam mensagem com SUCESSO (para marcar "já enviado"). */
export async function idsJaEnviados(): Promise<number[]> {
  await ensureTabela();
  const rows = await queryRows<{ convidado_id: number }>(
    `SELECT DISTINCT convidado_id FROM whatsapp_envios WHERE sucesso = 1 AND convidado_id IS NOT NULL`,
  );
  return rows.map((r) => r.convidado_id);
}

/** True se este convidado já recebeu mensagem com SUCESSO (bloqueio anti-duplicado). */
export async function jaEnviouConvidado(convidadoId: number): Promise<boolean> {
  if (!convidadoId) return false;
  try {
    await ensureTabela();
    const rows = await queryRows<{ n: number }>(
      `SELECT 1 AS n FROM whatsapp_envios WHERE sucesso = 1 AND convidado_id = ? LIMIT 1`,
      [convidadoId],
    );
    return rows.length > 0;
  } catch {
    return false; // em caso de erro, não bloqueia o envio
  }
}

/** Apaga todo o histórico de envios. */
export async function limparEnvios() {
  await ensureTabela();
  await execute("DELETE FROM whatsapp_envios");
}
