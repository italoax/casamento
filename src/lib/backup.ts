/**
 * BACKUP DO BANCO — dump .sql restaurável (Node puro, sem mysqldump).
 *
 * Usado tanto pelo painel (POST /api/painel/backups) quanto pelo cron
 * (/api/cron/backup). Rodar em ambos pelo MESMO código garante que o arquivo
 * é escrito no mesmo lugar (process.cwd()/backups) e aparece na listagem.
 */
import { env } from "./env";
import * as fs from "node:fs";
import * as path from "node:path";
import { createConnection } from "mysql2/promise";

export const BACKUPS_DIR = path.join(process.cwd(), "backups");
const MANTER = 2;

export function listarBackups() {
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  return fs.readdirSync(BACKUPS_DIR)
    .filter((nome) => /^backup-.*\.sql$/.test(nome))
    .map((nome) => {
      const st = fs.statSync(path.join(BACKUPS_DIR, nome));
      return { nome, tamanho: st.size, data: st.mtime.toISOString() };
    })
    .sort((a, b) => b.data.localeCompare(a.data));
}

/** Já existe um backup com a data de hoje (UTC)? Trava do "1x por dia". */
export function backupFeitoHoje(): boolean {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) return false;
    const hoje = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return fs.readdirSync(BACKUPS_DIR)
      .some((nome) => nome.startsWith("backup-") && nome.includes(hoje) && nome.endsWith(".sql"));
  } catch {
    return false;
  }
}

function dbSsl(): Record<string, unknown> | undefined {
  const mode = String(env("DB_SSL", "")).trim().toLowerCase();
  if (!mode || ["false", "0", "off", "no"].includes(mode)) return undefined;
  if (["skip-verify", "insecure"].includes(mode)) return { rejectUnauthorized: false };
  const ca = env("DB_SSL_CA", "");
  return ca ? { ca } : {};
}

function dbConfig() {
  return {
    host: env("DB_HOST", "127.0.0.1"),
    port: Number(env("DB_PORT", "3306")),
    user: env("DB_USER"),
    password: env("DB_PASSWORD"),
    database: env("DB_NAME"),
    charset: "utf8mb4" as const,
    ssl: dbSsl(),
    dateStrings: true as const,
  };
}

function esc(conn: Awaited<ReturnType<typeof createConnection>>, v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (Buffer.isBuffer(v)) return conn.escape(v);
  if (typeof v === "object") return conn.escape(JSON.stringify(v));
  return conn.escape(v);
}

export async function gerarBackup(): Promise<{ tabelas: number; linhas: number; arquivo: string }> {
  const config = dbConfig();
  const conn = await createConnection(config);
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    const outFile = path.join(BACKUPS_DIR, `backup-${config.database || "db"}-${stamp}.sql`);

    const out: string[] = [];
    out.push(`-- Backup do banco "${config.database}" gerado em ${new Date().toISOString()}`);
    out.push("SET NAMES utf8mb4;");
    out.push("SET FOREIGN_KEY_CHECKS=0;");
    out.push("");

    const [tablesRaw] = await conn.query("SHOW TABLES") as [Record<string, string>[], unknown];
    const tables = tablesRaw.map((r) => Object.values(r)[0]);

    let totalRows = 0;
    for (const table of tables) {
      const [createRows] = await conn.query(`SHOW CREATE TABLE \`${table}\``) as [Record<string, string>[], unknown];
      const createSql = createRows[0]["Create Table"] || createRows[0]["Create View"];

      out.push(`-- ${table}`);
      out.push(`DROP TABLE IF EXISTS \`${table}\`;`);
      out.push(`${createSql};`);
      out.push("");

      const [rows] = await conn.query(`SELECT * FROM \`${table}\``) as [Record<string, unknown>[], unknown];
      if (rows.length) {
        const cols = Object.keys(rows[0]).map((c) => `\`${c}\``).join(", ");
        const BATCH = 100;
        for (let i = 0; i < rows.length; i += BATCH) {
          const chunk = rows.slice(i, i + BATCH);
          const values = chunk.map((row) => `(${Object.values(row).map((v) => esc(conn, v)).join(", ")})`).join(",\n");
          out.push(`INSERT INTO \`${table}\` (${cols}) VALUES\n${values};`);
        }
        out.push("");
      }
      totalRows += rows.length;
    }

    out.push("SET FOREIGN_KEY_CHECKS=1;");
    fs.writeFileSync(outFile, out.join("\n"), "utf8");

    // Retenção: mantém só os MANTER mais recentes.
    try {
      const antigos = fs.readdirSync(BACKUPS_DIR)
        .filter((n) => /^backup-.*\.sql$/.test(n))
        .map((n) => ({ n, t: fs.statSync(path.join(BACKUPS_DIR, n)).mtimeMs }))
        .sort((a, b) => b.t - a.t)
        .slice(MANTER);
      for (const velho of antigos) fs.unlinkSync(path.join(BACKUPS_DIR, velho.n));
    } catch { /* retenção não-crítica */ }

    return { tabelas: tables.length, linhas: totalRows, arquivo: path.basename(outFile) };
  } finally {
    await conn.end().catch(() => undefined);
  }
}
