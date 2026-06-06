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
      waitForConnections: true,
      connectionLimit: Number(env("DB_CONNECTION_LIMIT", "2")),
      namedPlaceholders: true,
      charset: "utf8mb4",
      dateStrings: true, // Mantém DATETIME como texto do MySQL; evita deslocar +3h/-3h no painel.
    });
  }
  return dbGlobal.__casamentoDbPool;
}

export async function queryRows<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  // Executa query e retorna TODAS as linhas
  // Exemplo: "SELECT * FROM usuarios" retorna array de usuários
  const [rows] = await db().query(sql, params);
  return rows as T[];
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
