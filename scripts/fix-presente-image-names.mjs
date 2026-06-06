import { existsSync, readFileSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  const text = requireSafeRead(file);
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function requireSafeRead(file) {
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
}

function slug(valor, fallback = 'presente') {
  const out = String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.(jpe?g|png|webp|gif)$/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return out || fallback;
}

function timestampFromName(nome) {
  const found = String(nome || '').match(/(\d{10,})(?:\.webp)?$/i);
  return found?.[1] || String(Date.now());
}

function needsRename(imagem, nome) {
  if (!imagem || !String(imagem).startsWith('img/presentes/')) return false;
  const current = path.basename(String(imagem));
  const wantedPrefix = slug(nome);
  return !current.startsWith(`${wantedPrefix}-`);
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env'));
  loadEnvFile(path.join(process.cwd(), '.env.local'));

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
  });

  const [rows] = await conn.query("SELECT id, nome, imagem, imagem_thumb FROM presentes WHERE imagem LIKE 'img/presentes/%'");
  let renamed = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!needsRename(row.imagem, row.nome)) {
      skipped += 1;
      continue;
    }

    const oldRel = String(row.imagem);
    const oldAbs = path.join(process.cwd(), 'public', oldRel);
    if (!existsSync(oldAbs)) {
      skipped += 1;
      console.log(`[ignorado] arquivo não encontrado para presente ${row.id}: ${oldRel}`);
      continue;
    }

    const stamp = timestampFromName(oldRel);
    const base = slug(row.nome);
    let nextName = `${base}-${stamp}.webp`;
    let nextRel = `img/presentes/${nextName}`;
    let nextAbs = path.join(process.cwd(), 'public', nextRel);
    let suffix = 2;
    while (existsSync(nextAbs) && path.resolve(nextAbs) !== path.resolve(oldAbs)) {
      nextName = `${base}-${stamp}-${suffix}.webp`;
      nextRel = `img/presentes/${nextName}`;
      nextAbs = path.join(process.cwd(), 'public', nextRel);
      suffix += 1;
    }

    await rename(oldAbs, nextAbs);
    await conn.execute(
      'UPDATE presentes SET imagem = ?, imagem_thumb = CASE WHEN imagem_thumb = ? THEN ? ELSE imagem_thumb END WHERE id = ?',
      [nextRel, oldRel, nextRel, row.id]
    );
    renamed += 1;
    console.log(`[ok] ${row.nome}: ${oldRel} -> ${nextRel}`);
  }

  await conn.end();
  console.log(`Concluído. Renomeados: ${renamed}. Ignorados: ${skipped}.`);
}

main().catch((error) => {
  console.error(`Falha ao renomear imagens: ${error.message}`);
  process.exit(1);
});
