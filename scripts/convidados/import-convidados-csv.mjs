import fs from 'fs';
import path from 'path';
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

function parseCsv(text, delimiter = ';') {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => String(v || '').trim()));
}

function statusDb(value) {
  const s = String(value || '').trim().toLowerCase();
  if (['confirmado', 'confirmada', 'confirmed'].includes(s)) return 'confirmado';
  if (['recusado', 'recusada', 'ausente', 'não vai', 'nao vai'].includes(s)) return 'recusado';
  return 'pendente';
}

function countAgeGroups(lista) {
  const total = { adulto: 0, c0_5: 0, c6_10: 0 };
  String(lista || '')
    .split(/\r?\n|,|;/)
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((p) => {
      const faixaCrianca = p.match(/\((?:crian[cç]a)\s*([^)]*)\)\s*$/i)?.[1]?.toLowerCase() || '';
      if (faixaCrianca) {
        if (faixaCrianca.includes('0-5') || faixaCrianca.includes('0 a 5') || faixaCrianca.includes('0/5')) total.c0_5++;
        else total.c6_10++;
        return;
      }
      const idade = p.match(/(?:^|\D)(\d{1,2})\s*(?:anos?|a\b)/i)?.[1];
      if (!idade) total.adulto++;
      else if (Number(idade) <= 5) total.c0_5++;
      else if (Number(idade) <= 10) total.c6_10++;
      else total.adulto++;
    });
  return total;
}

const csvPath = process.argv[2] || 'lista_convidados_26-04-2026_16-58.csv';
const mode = process.argv.includes('--execute') ? 'execute' : 'dry-run';
const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const [header, ...dataRows] = rows;
const index = Object.fromEntries(header.map((h, i) => [String(h).trim().toLowerCase(), i]));

const convidados = dataRows.map((r) => {
  const nome = String(r[index['nome convite']] || '').trim();
  const telefone = String(r[index['telefone']] || '').replace(/\D+/g, '');
  const email = String(r[index['email']] || '').trim();
  const nomesLista = String(r[index['lista completa']] || '').trim();
  const convites = Number(String(r[index['vagas totais']] || '').replace(/\D+/g, '')) || countAgeGroups(nomesLista).adulto + countAgeGroups(nomesLista).c0_5 + countAgeGroups(nomesLista).c6_10;
  const status = statusDb(r[index['status']]);
  const convitesConfirmados = status === 'confirmado' ? convites : 0;
  const nomesConfirmados = status === 'confirmado' ? nomesLista : '';
  return { nome, telefone, email, nomesLista, convites, status, convitesConfirmados, nomesConfirmados, idades: countAgeGroups(nomesLista) };
}).filter((g) => g.nome && g.nomesLista && g.convites > 0);

const resumo = convidados.reduce((acc, g) => {
  acc.grupos++;
  acc.pessoas += g.convites;
  acc.adultos += g.idades.adulto;
  acc.criancas_0_5 += g.idades.c0_5;
  acc.criancas_6_10 += g.idades.c6_10;
  acc.telefones += g.telefone ? 1 : 0;
  acc.status[g.status] = (acc.status[g.status] || 0) + 1;
  return acc;
}, { grupos: 0, pessoas: 0, adultos: 0, criancas_0_5: 0, criancas_6_10: 0, telefones: 0, status: {} });

if (mode !== 'execute') {
  console.log(JSON.stringify({ mode, csvPath: path.resolve(csvPath), resumo, primeiros: convidados.slice(0, 3) }, null, 2));
  process.exit(0);
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

await conn.beginTransaction();
let inseridos = 0;
let atualizados = 0;
try {
  for (const g of convidados) {
    const [existing] = await conn.execute('SELECT id FROM convidados WHERE nome = ? ORDER BY id ASC LIMIT 1', [g.nome]);
    if (existing.length) {
      await conn.execute(
        `UPDATE convidados
         SET telefone = ?, email = ?, nomes_lista = ?, nomes_confirmados = ?, convites_disponiveis = ?, convites_confirmados = ?, status = ?, visibilidade = 'disponivel'
         WHERE id = ?`,
        [g.telefone || null, g.email || null, g.nomesLista, g.nomesConfirmados || null, g.convites, g.convitesConfirmados, g.status, existing[0].id],
      );
      atualizados++;
    } else {
      await conn.execute(
        `INSERT INTO convidados (nome, telefone, email, nomes_lista, nomes_confirmados, convites_disponiveis, convites_confirmados, status, visibilidade)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'disponivel')`,
        [g.nome, g.telefone || null, g.email || null, g.nomesLista, g.nomesConfirmados || null, g.convites, g.convitesConfirmados, g.status],
      );
      inseridos++;
    }
  }
  await conn.commit();
} catch (error) {
  await conn.rollback();
  throw error;
} finally {
  await conn.end();
}

console.log(JSON.stringify({ mode, inseridos, atualizados, total_processado: convidados.length, resumo }, null, 2));
