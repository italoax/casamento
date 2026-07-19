import fs from 'fs';
import mysql from 'mysql2/promise';

function loadEnv(file = '.env') {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

function dbSslOptions(env) {
  const mode = String(env.DB_SSL || '').trim().toLowerCase();
  if (!mode || ['false', '0', 'off', 'no'].includes(mode)) return undefined;
  if (['skip-verify', 'insecure'].includes(mode)) return { rejectUnauthorized: false };
  if (env.DB_SSL_CA) return { ca: env.DB_SSL_CA };
  return {};
}

const env = { ...process.env, ...loadEnv() };
const conn = await mysql.createConnection({
  host: env.DB_HOST || '127.0.0.1',
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  charset: 'utf8mb4',
  ssl: dbSslOptions(env),
});

const [totals] = await conn.execute(`
  SELECT
    COUNT(*) AS total_grupos,
    COALESCE(SUM(convites_disponiveis), 0) AS total_pessoas,
    COALESCE(SUM(convites_confirmados), 0) AS total_confirmados,
    SUM(CASE WHEN telefone IS NOT NULL AND telefone <> '' THEN 1 ELSE 0 END) AS grupos_com_telefone
  FROM convidados
`);
const [status] = await conn.execute('SELECT status, COUNT(*) AS total FROM convidados GROUP BY status ORDER BY status');
const [samples] = await conn.execute(`
  SELECT nome, convites_disponiveis, convites_confirmados, status
  FROM convidados
  ORDER BY nome ASC
  LIMIT 8
`);
await conn.end();
console.log(JSON.stringify({ totals: totals[0], status, samples }, null, 2));
