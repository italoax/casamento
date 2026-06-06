import { columnExists, queryRows, queryOne, tableExists } from "./db";
import { decryptCPF, decryptEmail, decryptPhone } from "./encryption";
import { contarIdades } from "./painel-utils";

export type Row = Record<string, unknown>;

const STATUS_PAGO = "'approved','paid','received','confirmed','received_in_cash'";
const STATUS_PENDENTE = "'pending','in_process'";

export function condicaoVendasPainel() {
  return `(status IN (${STATUS_PAGO}) OR status IN (${STATUS_PENDENTE}))`;
}

export function condicaoVendasPendentes() {
  return `status IN (${STATUS_PENDENTE}) AND (date_of_expiration IS NULL OR date_of_expiration > NOW())`;
}

function maybeDecryptEmail(value: unknown) {
  const email = String(value || "").trim();
  if (!email) return email;
  if (email.includes("@")) return email;
  if (!/^[a-f0-9]+$/i.test(email) || email.length < 64 || email.length % 2 !== 0) return email;
  try {
    return decryptEmail(email);
  } catch {
    return email;
  }
}

function maybeDecryptCpf(value: unknown) {
  const cpf = String(value || "").trim();
  if (!cpf) return cpf;
  if (!/^[a-f0-9]+$/i.test(cpf) || cpf.length < 64 || cpf.length % 2 !== 0) return cpf;
  try {
    return decryptCPF(cpf);
  } catch {
    return cpf;
  }
}

function maybeDecryptPhone(value: unknown) {
  const phone = String(value || "").trim();
  if (!phone) return phone;
  if (!/^[a-f0-9]+$/i.test(phone) || phone.length < 64 || phone.length % 2 !== 0) return phone;
  try {
    return decryptPhone(phone);
  } catch {
    return phone;
  }
}

function formatCpf(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 11) return String(value || "");
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return String(value || "");
}

function decryptSensitiveFields<T extends Row>(rows: T[]) {
  return rows.map((row) => ({
    ...row,
    email: maybeDecryptEmail(row.email),
    cpf: formatCpf(maybeDecryptCpf(row.cpf)),
    telefone: formatPhone(maybeDecryptPhone(row.telefone)),
  }));
}

export async function getDashboardData() {
  const [kpisConv] = await queryRows<Row>(
    "SELECT COUNT(*) total_grupos, COALESCE(SUM(convites_disponiveis),0) total_pessoas, COALESCE(SUM(convites_confirmados),0) total_confirmados FROM convidados",
  );
  const nomes = await queryRows<{ nomes_lista: string }>("SELECT nomes_lista FROM convidados");
  const idades = { adulto: 0, c0_5: 0, c6_10: 0 };
  for (const row of nomes) {
    const c = contarIdades(row.nomes_lista);
    idades.adulto += c.adulto;
    idades.c0_5 += c.c0_5;
    idades.c6_10 += c.c6_10;
  }

  const presentesExiste = await tableExists("presentes");
  const vendasExiste = await tableExists("vendas");
  const taxa = await getTaxaPresentes();
  const kpiPresentes = { total_geral: 0, qtd_vendidos: 0, total_vendido: 0, total_pendente: 0, qtd_vendido: 0, qtd_pendente: 0, taxa_atual: taxa };
  if (presentesExiste) {
    const [p] = await queryRows<Row>("SELECT COALESCE(SUM(preco),0) total_geral, COALESCE(SUM(quantidade_vendida),0) qtd_vendidos FROM presentes");
    kpiPresentes.total_geral = Number(p?.total_geral || 0);
    kpiPresentes.qtd_vendidos = Number(p?.qtd_vendidos || 0);
  }
  if (vendasExiste) {
    const [v] = await queryRows<Row>(`SELECT
      COALESCE(SUM(CASE WHEN status IN (${STATUS_PAGO}) THEN valor_total ELSE 0 END),0) total_vendido,
      COALESCE(SUM(CASE WHEN status IN (${STATUS_PAGO}) THEN 1 ELSE 0 END),0) qtd_vendido,
      COALESCE(SUM(CASE WHEN ${condicaoVendasPendentes()} THEN valor_total ELSE 0 END),0) total_pendente,
      COALESCE(SUM(CASE WHEN ${condicaoVendasPendentes()} THEN 1 ELSE 0 END),0) qtd_pendente
      FROM vendas`);
    kpiPresentes.total_vendido = Number(v?.total_vendido || 0);
    kpiPresentes.qtd_vendido = Number(v?.qtd_vendido || 0);
    kpiPresentes.total_pendente = Number(v?.total_pendente || 0);
    kpiPresentes.qtd_pendente = Number(v?.qtd_pendente || 0);
  }

  return { convidados: kpisConv || {}, idades, presentes: kpiPresentes };
}

export async function listarConvidados(busca = "", ordem = "recentes", pagina = 1, limite = 20) {
  const params: unknown[] = [];
  let where = "WHERE 1=1";
  if (busca.trim()) {
    where += " AND (nome LIKE ? OR telefone LIKE ? OR email LIKE ?)";
    const like = `%${busca.trim()}%`;
    params.push(like, like, like);
  }
  let order = "id DESC";
  if (ordem === "az") order = "nome ASC";
  if (ordem === "za") order = "nome DESC";
  if (ordem === "status_asc") order = "CASE status WHEN 'confirmado' THEN 1 WHEN 'pendente' THEN 2 WHEN 'recusado' THEN 3 ELSE 4 END, id DESC";
  if (ordem === "status_desc") order = "CASE status WHEN 'recusado' THEN 1 WHEN 'pendente' THEN 2 WHEN 'confirmado' THEN 3 ELSE 4 END, id DESC";
  const idadeOrdem = ["adultos_desc", "adultos_asc", "c0_5_desc", "c0_5_asc", "c6_10_desc", "c6_10_asc"].includes(ordem);
  const offset = (Math.max(1, pagina) - 1) * limite;
  const hasVisibilidade = await columnExists("convidados", "visibilidade");
  const [count] = await queryRows<Row>(`SELECT COUNT(*) total FROM convidados ${where}`, params);
  let rows = await queryRows<Row>(`SELECT id, nome, telefone, email, nomes_lista, nomes_confirmados, convites_disponiveis, convites_confirmados, status${hasVisibilidade ? ", visibilidade" : ""} FROM convidados ${where} ORDER BY ${idadeOrdem ? "nome ASC" : order}${idadeOrdem ? "" : " LIMIT ? OFFSET ?"}`, idadeOrdem ? params : [...params, limite, offset]);
  if (idadeOrdem) {
    const [bucket, dir] = ordem.split("_").length === 3 ? [ordem.split("_").slice(0, 2).join("_"), ordem.split("_")[2]] : ["adulto", ordem.split("_")[1]];
    const key = bucket === "adultos" ? "adulto" : bucket;
    rows = rows.sort((a, b) => {
      const ca = contarIdades(String(a.nomes_lista || ""))[key as "adulto" | "c0_5" | "c6_10"] || 0;
      const cb = contarIdades(String(b.nomes_lista || ""))[key as "adulto" | "c0_5" | "c6_10"] || 0;
      return dir === "asc" ? ca - cb : cb - ca;
    }).slice(offset, offset + limite);
  }
  return { rows, total: Number(count?.total || 0), pagina: Math.max(1, pagina), limite, hasVisibilidade };
}

export async function listarPresentes(busca = "", ordem = "recentes") {
  if (!(await tableExists("presentes"))) return [];
  const params: unknown[] = [];
  let where = "WHERE 1=1";
  if (busca.trim()) {
    where += " AND (nome LIKE ? OR categoria LIKE ?)";
    const like = `%${busca.trim()}%`;
    params.push(like, like);
  }
  let order = "id DESC";
  if (ordem === "az") order = "nome ASC";
  if (ordem === "za") order = "nome DESC";
  if (ordem === "menor_valor") order = "preco ASC";
  if (ordem === "maior_valor") order = "preco DESC";
  return queryRows<Row>(`SELECT id, nome, categoria, preco, preco_base, preco_total_referencia, status, imagem, imagem_thumb, quantidade_disponivel, quantidade_vendida, quantidade_reservada, modo_exibicao FROM presentes ${where} ORDER BY ${order}`, params);
}

export async function listarVendas(pagina = 1, limite = 20, busca = "", status = "") {
  if (!(await tableExists("vendas"))) return { rows: [], total: 0, pagina, limite };
  const params: unknown[] = [];
  let where = `WHERE ${condicaoVendasPainel()}`;
  if (busca.trim()) {
    where += " AND (nome_comprador LIKE ? OR email LIKE ? OR cpf LIKE ? OR telefone LIKE ? OR external_reference LIKE ? OR gateway_payment_id LIKE ?)";
    const like = `%${busca.trim()}%`;
    params.push(like, like, like, like, like, like);
  }
  if (status === "pagos") where += ` AND status IN (${STATUS_PAGO})`;
  if (status === "pendentes") where += ` AND ${condicaoVendasPendentes()}`;
  const offset = (Math.max(1, pagina) - 1) * limite;
  const [count] = await queryRows<Row>(`SELECT COUNT(*) total FROM vendas ${where}`, params);
  const rows = await queryRows<Row>(`SELECT id, data_compra, nome_comprador, mensagem, email, cpf, telefone, cep, numero_endereco, itens, valor_total, payment_method, status, gateway_payment_id, external_reference, date_of_expiration FROM vendas ${where} ORDER BY data_compra DESC, id DESC LIMIT ? OFFSET ?`, [...params, limite, offset]);
  return { rows: decryptSensitiveFields(rows), total: Number(count?.total || 0), pagina: Math.max(1, pagina), limite };
}

export async function listarRecados() {
  if (!(await tableExists("recados"))) return [];
  return queryRows<Row>("SELECT id, nome, email, mensagem, aprovado, created_at FROM recados ORDER BY aprovado ASC, created_at DESC LIMIT 100");
}

export async function listarLogs(pagina = 1, limite = 50, busca = "", tipo = "", status = "") {
  const [siteLogsExiste, vendasExiste] = await Promise.all([
    tableExists("site_logs"),
    tableExists("vendas"),
  ]);

  const fontes: string[] = [];
  const validadePixLogSql = vendasExiste
    ? `(
        SELECT v.date_of_expiration
        FROM vendas v
        WHERE (sl.gateway_payment_id IS NOT NULL AND sl.gateway_payment_id <> '' AND v.gateway_payment_id = sl.gateway_payment_id)
           OR (sl.external_reference IS NOT NULL AND sl.external_reference <> '' AND v.external_reference = sl.external_reference)
        ORDER BY v.id DESC
        LIMIT 1
      )`
    : "NULL";
  const esconderLogsDuplicadosSql = vendasExiste
    ? `WHERE NOT EXISTS (
        SELECT 1
        FROM vendas v
        WHERE (sl.gateway_payment_id IS NOT NULL AND sl.gateway_payment_id <> '' AND v.gateway_payment_id = sl.gateway_payment_id)
           OR (sl.external_reference IS NOT NULL AND sl.external_reference <> '' AND v.external_reference = sl.external_reference)
      )`
    : "";
  if (siteLogsExiste) {
    fontes.push(`SELECT
      CONCAT('log-', sl.id) id,
      sl.tipo,
      sl.status,
      sl.mensagem,
      sl.nome_comprador,
      sl.email,
      sl.cpf,
      sl.telefone,
      sl.itens,
      sl.valor,
      sl.gateway_payment_id,
      sl.external_reference,
      ${validadePixLogSql} date_of_expiration,
      sl.created_at
      FROM site_logs sl
      ${esconderLogsDuplicadosSql}`);
  }
  if (vendasExiste) {
    fontes.push(`SELECT
      CONCAT('venda-', id) id,
      COALESCE(payment_method, 'pagamento') tipo,
      CASE
        WHEN status IN (${STATUS_PAGO}) THEN 'sucesso'
        WHEN ${condicaoVendasPendentes()} THEN 'pendente'
        WHEN status IN ('rejected', 'cancelled', 'canceled', 'expired', 'failed') THEN 'erro'
        ELSE status
      END status,
      COALESCE(NULLIF(mensagem, ''), CONCAT('Pagamento ', COALESCE(payment_method, 'registrado'), ' registrado em vendas.')) mensagem,
      nome_comprador,
      email,
      cpf,
      telefone,
      itens,
      valor_total valor,
      gateway_payment_id,
      external_reference,
      date_of_expiration,
      data_compra created_at
      FROM vendas`);
  }

  if (!fontes.length) return { rows: [], total: 0, pagina, limite };

  const origem = `(${fontes.join(" UNION ALL ")}) logs_unificados`;
  const params: unknown[] = [];
  let where = "WHERE 1=1";
  if (busca.trim()) {
    where += " AND (mensagem LIKE ? OR email LIKE ? OR nome_comprador LIKE ? OR external_reference LIKE ? OR gateway_payment_id LIKE ?)";
    const like = `%${busca.trim()}%`;
    params.push(like, like, like, like, like);
  }
  if (tipo) { where += " AND tipo = ?"; params.push(tipo); }
  if (status) { where += " AND status = ?"; params.push(status); }
  const offset = (Math.max(1, pagina) - 1) * limite;
  const [count] = await queryRows<Row>(`SELECT COUNT(*) total FROM ${origem} ${where}`, params);
  const rows = await queryRows<Row>(`SELECT id, tipo, status, mensagem, nome_comprador, email, cpf, telefone, itens, valor, gateway_payment_id, external_reference, date_of_expiration, created_at FROM ${origem} ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`, [...params, limite, offset]);
  return { rows: decryptSensitiveFields(rows), total: Number(count?.total || 0), pagina: Math.max(1, pagina), limite };
}

export async function getRsvpDeadline() {
  if (!(await tableExists("rsvp_config"))) return null;
  const row = await queryOne<{ valor: string }>("SELECT valor FROM rsvp_config WHERE chave = 'rsvp_deadline_utc' LIMIT 1");
  return row?.valor || null;
}

export async function getTaxaPresentes() {
  if (!(await tableExists("presentes_precificacao"))) return 0;
  const row = await queryOne<{ taxa_percentual: string | number }>("SELECT taxa_percentual FROM presentes_precificacao WHERE id = 1 LIMIT 1");
  return Number(row?.taxa_percentual || 0);
}
