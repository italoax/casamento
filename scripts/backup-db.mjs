/**
 * BACKUP DO BANCO DE DADOS — dump .sql restaurável (puro Node, sem mysqldump)
 *
 * Gera um arquivo backups/backup-<banco>-<data>.sql com a estrutura (CREATE TABLE)
 * e todos os dados (INSERT) de todas as tabelas. Dá pra restaurar importando esse
 * arquivo no phpMyAdmin ou via: mysql -u USER -p NOME_DO_BANCO < arquivo.sql
 *
 * Pode ser usado de duas formas:
 *  1) Linha de comando:  npm run backup
 *  2) Importado pelo app: `import { gerarBackup } from ".../backup-db.mjs"` e
 *     chamando `await gerarBackup()`. Assim o backup roda DENTRO do processo do
 *     site (sem abrir um processo-filho), o que é mais confiável em hospedagem
 *     compartilhada (Passenger/Hostinger) e permite ver o erro real se falhar.
 *
 * Onde guardar: rode periodicamente e guarde os .sql num lugar seguro (Google Drive,
 * etc). NÃO versione no git — contém dados pessoais de convidados e vendas (LGPD).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

// Carrega o mysql2 via require (CommonJS) em vez de `import ... from "mysql2/promise"`.
// Motivo: este arquivo é carregado como módulo solto (import dinâmico pelo app e
// pelo server.js). A resolução ESM de pacote ignora o NODE_PATH que a Hostinger
// usa para expor os node_modules, causando "Cannot find package 'mysql2'".
// O require do createRequire respeita o NODE_PATH e também funciona localmente.
const require = createRequire(import.meta.url);
const mysql = require("mysql2/promise");

function loadEnv(file = ".env") {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

function dbSslOptions(env) {
  const mode = String(env.DB_SSL || "").trim().toLowerCase();
  if (!mode || ["false", "0", "off", "no"].includes(mode)) return undefined;
  if (["skip-verify", "insecure"].includes(mode)) return { rejectUnauthorized: false };
  if (env.DB_SSL_CA) return { ca: env.DB_SSL_CA };
  return {};
}

/**
 * Gera um backup .sql completo do banco e aplica a retenção (mantém só os 2 mais
 * recentes). Funciona dentro do processo do app — não abre processo-filho.
 *
 * @param {object} [opts]
 * @param {(msg: string) => void} [opts.log] Função de log (padrão: console.log).
 * @returns {Promise<{ outFile: string, tabelas: number, linhas: number, tamanhoKb: number }>}
 */
export async function gerarBackup({ log = console.log } = {}) {
  const env = { ...process.env, ...loadEnv() };

  const conn = await mysql.createConnection({
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: "utf8mb4",
    ssl: dbSslOptions(env),
    dateStrings: true, // mantém DATETIME como texto do MySQL (sem deslocar fuso)
  });

  /** Escapa um valor respeitando o tipo (NULL, JSON, Buffer, data, número, texto). */
  const esc = (v) => {
    if (v === null || v === undefined) return "NULL";
    if (Buffer.isBuffer(v)) return conn.escape(v);
    // Colunas JSON voltam como objeto/array — serializa pra texto antes de escapar.
    if (typeof v === "object") return conn.escape(JSON.stringify(v));
    return conn.escape(v);
  };

  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const outDir = path.join(process.cwd(), "backups");
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `backup-${env.DB_NAME || "db"}-${stamp}.sql`);

    const out = [];
    out.push(`-- Backup do banco "${env.DB_NAME}" gerado em ${new Date().toISOString()}`);
    out.push("-- Restaurar com: mysql -u USUARIO -p NOME_DO_BANCO < este-arquivo.sql");
    out.push("SET NAMES utf8mb4;");
    out.push("SET FOREIGN_KEY_CHECKS=0;");
    out.push("");

    log(`Conectado em ${env.DB_NAME}. Gerando backup...`);

    const [tablesRaw] = await conn.query("SHOW TABLES");
    const tables = tablesRaw.map((r) => Object.values(r)[0]);

    let totalRows = 0;
    for (const table of tables) {
      const [createRows] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
      const createSql = createRows[0]["Create Table"] || createRows[0]["Create View"];

      out.push(`-- ----------------------------------------------------------`);
      out.push(`-- Tabela: ${table}`);
      out.push(`-- ----------------------------------------------------------`);
      out.push(`DROP TABLE IF EXISTS \`${table}\`;`);
      out.push(`${createSql};`);
      out.push("");

      const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
      if (rows.length) {
        const cols = Object.keys(rows[0]).map((c) => `\`${c}\``).join(", ");
        const BATCH = 100;
        for (let i = 0; i < rows.length; i += BATCH) {
          const chunk = rows.slice(i, i + BATCH);
          const values = chunk.map((row) => `(${Object.values(row).map(esc).join(", ")})`).join(",\n");
          out.push(`INSERT INTO \`${table}\` (${cols}) VALUES\n${values};`);
        }
        out.push("");
      }

      totalRows += rows.length;
      log(`  • ${table}: ${rows.length} linha(s)`);
    }

    out.push("SET FOREIGN_KEY_CHECKS=1;");
    fs.writeFileSync(outFile, out.join("\n"), "utf8");

    const sizeKb = Number((fs.statSync(outFile).size / 1024).toFixed(1));
    log(`✅ Backup salvo: ${outFile}`);
    log(`   ${tables.length} tabela(s) · ${totalRows} linha(s) · ${sizeKb} KB`);

    // Retenção: mantém apenas os 2 backups mais recentes (≈ 2 dias).
    const MANTER = 2;
    try {
      const antigos = fs.readdirSync(outDir)
        .filter((n) => /^backup-.*\.sql$/.test(n))
        .map((n) => ({ n, t: fs.statSync(path.join(outDir, n)).mtimeMs }))
        .sort((a, b) => b.t - a.t)
        .slice(MANTER);
      for (const velho of antigos) {
        fs.unlinkSync(path.join(outDir, velho.n));
        log(`   removido (retenção ${MANTER}): ${velho.n}`);
      }
    } catch (e) {
      log(`   [retenção] falha ao limpar backups antigos: ${e.message}`);
    }

    return { outFile, tabelas: tables.length, linhas: totalRows, tamanhoKb: sizeKb };
  } finally {
    await conn.end().catch(() => undefined);
  }
}

// Execução via linha de comando (npm run backup): só roda quando o arquivo é
// chamado diretamente, não quando é importado pelo app.
const executadoDireto = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (executadoDireto) {
  try {
    await gerarBackup();
    console.log("   Guarde esses arquivos num lugar seguro (fora do servidor).");
  } catch (error) {
    console.error("❌ Falha ao gerar backup:", error?.message || error);
    process.exit(1);
  }
}
