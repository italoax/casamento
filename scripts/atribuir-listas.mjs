/**
 * Atribui a coluna `lista` (quem convida) aos convidados JÁ cadastrados,
 * casando pelo nome do convite.
 *
 * Coloque os nomes (um por linha) em:
 *   scripts/listas/italo.txt
 *   scripts/listas/emanuelle.txt
 *   scripts/listas/jandira.txt
 *
 * Uso:
 *   node scripts/atribuir-listas.mjs            # dry-run: mostra o que casa e o que NÃO casa
 *   node scripts/atribuir-listas.mjs --execute  # grava no banco
 *
 * Observações:
 *  - O casamento é por nome normalizado (sem acento, minúsculo, espaços colapsados).
 *  - Nomes não encontrados ou ambíguos (mais de um convidado com o mesmo nome)
 *    NÃO são gravados — eles aparecem no relatório pra você corrigir.
 *  - Convidados que não estão em nenhuma lista ficam intactos.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const LISTAS = ["italo", "emanuelle", "jandira"];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const listasDir = path.join(__dirname, "listas");

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

/** Normaliza nome para casar: sem acento, minúsculo, espaços colapsados. */
function norm(nome) {
  return String(nome || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function lerLista(chave) {
  const arquivo = path.join(listasDir, `${chave}.txt`);
  if (!fs.existsSync(arquivo)) return [];
  return fs
    .readFileSync(arquivo, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

const mode = process.argv.includes("--execute") ? "execute" : "dry-run";
const env = { ...process.env, ...loadEnv() };

const conn = await mysql.createConnection({
  host: env.DB_HOST || "127.0.0.1",
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  charset: "utf8mb4",
  ssl: dbSslOptions(env),
});

// Garante a coluna `lista`.
const [cols] = await conn.execute("SHOW COLUMNS FROM convidados LIKE 'lista'");
if (!cols.length) {
  await conn.execute("ALTER TABLE convidados ADD COLUMN lista VARCHAR(40) NULL");
  console.log("[info] coluna `lista` criada.");
}

// Índice de convidados por nome normalizado.
const [rows] = await conn.execute("SELECT id, nome FROM convidados");
const porNome = new Map();
for (const r of rows) {
  const k = norm(r.nome);
  if (!porNome.has(k)) porNome.set(k, []);
  porNome.get(k).push(r);
}

const planoUpdates = []; // { id, nome, lista }
const relatorio = {};

for (const chave of LISTAS) {
  const nomes = lerLista(chave);
  const r = { total: nomes.length, casados: [], naoEncontrados: [], ambiguos: [] };
  for (const nome of nomes) {
    const achados = porNome.get(norm(nome)) || [];
    if (achados.length === 0) r.naoEncontrados.push(nome);
    else if (achados.length > 1) r.ambiguos.push({ nome, ids: achados.map((a) => a.id) });
    else {
      r.casados.push({ id: achados[0].id, nome: achados[0].nome });
      planoUpdates.push({ id: achados[0].id, nome: achados[0].nome, lista: chave });
    }
  }
  relatorio[chave] = r;
}

// Relatório legível.
for (const chave of LISTAS) {
  const r = relatorio[chave];
  console.log(`\n=== Lista "${chave}" — ${r.total} nome(s) no arquivo ===`);
  console.log(`  ✔ casados: ${r.casados.length}`);
  if (r.naoEncontrados.length) console.log(`  ✖ NÃO encontrados (${r.naoEncontrados.length}):\n     - ${r.naoEncontrados.join("\n     - ")}`);
  if (r.ambiguos.length) console.log(`  ⚠ ambíguos (${r.ambiguos.length}):\n     - ${r.ambiguos.map((a) => `${a.nome} -> ids ${a.ids.join(", ")}`).join("\n     - ")}`);
}

if (mode !== "execute") {
  console.log(`\n[dry-run] ${planoUpdates.length} convidado(s) seriam atualizados. Rode com --execute para gravar.`);
  await conn.end();
  process.exit(0);
}

await conn.beginTransaction();
let atualizados = 0;
try {
  for (const u of planoUpdates) {
    await conn.execute("UPDATE convidados SET lista = ? WHERE id = ?", [u.lista, u.id]);
    atualizados++;
  }
  await conn.commit();
} catch (error) {
  await conn.rollback();
  await conn.end();
  throw error;
}
await conn.end();
console.log(`\n[execute] ${atualizados} convidado(s) atualizados com sua lista.`);
