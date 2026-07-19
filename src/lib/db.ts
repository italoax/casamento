/**
 * DATABASE - Gerenciamento de Conexão MySQL
 *
 * Este arquivo centraliza toda a comunicação com o banco de dados MySQL.
 * Usa pool de conexões para reutilizar conexões e melhorar performance.
 *
 * Pool = conjunto de conexões pré-abertas que são reutilizadas
 * Evita criar/fechar conexão a cada query (que é lento)
 */

import { createPool, type Pool } from "mysql2/promise";
import { env } from "./env";
import { validateEnvironment } from "./env-validation";

type DbGlobalCache = typeof globalThis & {
  __casamentoDbPool?: Pool;
  __casamentoTableExistsCache?: Map<string, Promise<boolean>>;
  __casamentoColumnExistsCache?: Map<string, Promise<boolean>>;
};

const dbGlobal = globalThis as DbGlobalCache;

function schemaCacheKey(...parts: string[]) {
  return parts.map((part) => part.replace(/`/g, "").toLowerCase()).join(".");
}

/**
 * Configuração de SSL/TLS para o MySQL (necessária em bancos externos).
 * - DB_SSL ausente/false/0/off  -> sem SSL (ex.: localhost na própria hospedagem)
 * - DB_SSL=true|require|on      -> SSL verificando o certificado (provedores como TiDB, Aiven, Railway)
 * - DB_SSL=skip-verify          -> SSL sem validar o certificado (último recurso)
 * - DB_SSL_CA                   -> conteúdo de um certificado CA específico (se o provedor exigir)
 */
function dbSslOption() {
  const mode = env("DB_SSL").trim().toLowerCase();
  if (!mode || ["false", "0", "off", "no"].includes(mode)) return undefined;
  const ssl: Record<string, unknown> = {
    minVersion: "TLSv1.2",
    rejectUnauthorized: mode !== "skip-verify",
  };
  const ca = env("DB_SSL_CA");
  if (ca) ssl.ca = ca;
  return ssl;
}

/**
 * Obtém a pool de conexões.
 *
 * Em desenvolvimento, o Next.js recompila módulos com frequência. Se a pool ficar
 * apenas em uma variável local do módulo, cada recarregamento pode criar novas
 * conexões no MySQL. Guardar a pool em globalThis ajuda a reaproveitar a mesma
 * conexão durante o dev server e reduz o risco de bater limite da Hostinger.
 */
export function db() {
  if (!dbGlobal.__casamentoDbPool) {
    // Validar variáveis de ambiente antes de conectar
    validateEnvironment();

    // Cria pool com configurações de produção/desenvolvimento compartilhado.
    // Default baixo para evitar estourar max_connections_per_hour em MySQL de hospedagem compartilhada.
    dbGlobal.__casamentoDbPool = createPool({
      host: env("DB_HOST", "127.0.0.1"),
      port: Number(env("DB_PORT", "3306")),
      user: env("DB_USER"),
      password: env("DB_PASSWORD"),
      database: env("DB_NAME"),
      ssl: dbSslOption(),
      waitForConnections: true,
      connectionLimit: Number(env("DB_CONNECTION_LIMIT", "2")),
      namedPlaceholders: true,
      charset: "utf8mb4",
      dateStrings: true, // Mantém DATETIME como texto do MySQL; evita deslocar +3h/-3h no painel.
      // Mantém a conexão TCP viva e recicla conexões ociosas antes que o MySQL
      // remoto (ex.: Hostinger) as derrube por wait_timeout — evita ECONNRESET
      // ao reaproveitar uma conexão "zumbi" do pool.
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      idleTimeout: 60000,
    });
  }
  return dbGlobal.__casamentoDbPool;
}

/**
 * Erros transitórios de conexão (conexão derrubada pelo servidor remoto, timeout
 * de socket, etc.). Quando ocorrem, refazer a query costuma resolver, pois o pool
 * abre uma conexão nova no lugar da que morreu.
 */
const TRANSIENT_DB_ERRORS = new Set([
  "ECONNRESET",
  "PROTOCOL_CONNECTION_LOST",
  "ETIMEDOUT",
  "EPIPE",
  "ECONNREFUSED",
]);

function isTransientDbError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return typeof code === "string" && TRANSIENT_DB_ERRORS.has(code);
}

/**
 * Executa uma operação no banco refazendo-a UMA vez se o erro for transitório de
 * conexão (conexão zumbi do pool). A segunda tentativa pega uma conexão nova.
 */
async function runWithRetry<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    return await op();
  }
}

export async function queryRows<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  // Executa query e retorna TODAS as linhas
  // Exemplo: "SELECT * FROM usuarios" retorna array de usuários
  return runWithRetry(async () => {
    const [rows] = await db().query(sql, params);
    return rows as T[];
  });
}

/**
 * Executa um comando (INSERT/UPDATE/DELETE/DDL) com retry em erro transitório de
 * conexão. Use no lugar de `db().execute(...)` em caminhos sensíveis a ECONNRESET.
 */
export async function execute(sql: string, params: unknown[] = []) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return runWithRetry(() => db().execute(sql, params as any[]));
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  // Executa query e retorna APENAS a primeira linha ou null
  // Útil para: "SELECT * FROM usuarios WHERE id = ?"
  const rows = await queryRows<T>(sql, params);
  return rows[0] || null;
}

export async function tableExists(table: string) {
  // Verifica se uma tabela existe no banco de dados.
  // Cacheia a Promise para evitar repetir SHOW TABLES em todo refresh do painel.
  const cache = dbGlobal.__casamentoTableExistsCache ??= new Map<string, Promise<boolean>>();
  const key = schemaCacheKey(table);
  if (!cache.has(key)) {
    cache.set(key, queryRows("SHOW TABLES LIKE ?", [table]).then((rows) => rows.length > 0));
  }
  return cache.get(key)!;
}

export async function columnExists(table: string, column: string) {
  // Verifica se uma coluna existe em uma tabela.
  // Cacheia a Promise para reduzir consultas de introspecção no painel e APIs.
  const cache = dbGlobal.__casamentoColumnExistsCache ??= new Map<string, Promise<boolean>>();
  const safeTable = table.replace(/`/g, "");
  const key = schemaCacheKey(safeTable, column);
  if (!cache.has(key)) {
    cache.set(key, queryRows(`SHOW COLUMNS FROM \`${safeTable}\` LIKE ?`, [column]).then((rows) => rows.length > 0));
  }
  return cache.get(key)!;
}
