/**
 * Empacota o CÓDIGO-FONTE para deploy na Hostinger (Web App Node.js / Next.js).
 *
 * A Hostinger compila no servidor: ela roda `npm install` + `npm run build`
 * (saída em `.next`) e inicia o app via Passenger (server.js). Por isso este ZIP
 * NÃO inclui `.next` nem `node_modules`.
 *
 * Estrutura do ZIP (tudo na raiz, sem pasta dentro de pasta):
 *   package.json, package-lock.json, next.config.ts, tsconfig.json, next-env.d.ts,
 *   server.js, src/, public/
 * NÃO incluso: node_modules/, .next/, .git/, .env, certificates/, scripts/
 *
 * Uso: npm run deploy  ->  gera deploys/casamento-hostinger.zip
 * Suba em: hPanel -> Deployments -> Settings and redeploy.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const deployDir = path.join(root, "deploys");
const zipPath = path.join(deployDir, "casamento-hostinger.zip");

// Versão dos módulos JS deste build (cache-busting). Injetada nos `import` dos
// arquivos public/js para que uma alteração force o navegador/Cloudflare a baixar
// a versão nova (a URL do módulo muda). Muda a cada `npm run deploy`.
const JS_ASSET_VERSION = Date.now().toString(36);

/**
 * Acrescenta `?v=<versão>` aos specifiers relativos (./x.js, ../y.js) dos imports
 * de um módulo JS, para invalidar o cache a cada deploy. Cobre:
 *   import ... from "./x.js" | export ... from "./x.js" | import "./x.js"
 */
function transformJsImports(rel, buf) {
  if (!(rel.startsWith("public/js/") && rel.endsWith(".js"))) return buf;
  const v = `?v=${JS_ASSET_VERSION}`;
  let code = buf.toString("utf8");
  code = code.replace(
    /\bfrom(\s*)(['"])(\.{1,2}\/[^'"]+?\.js)\2/g,
    (_m, s, q, spec) => `from${s}${q}${spec}${v}${q}`
  );
  code = code.replace(
    /\bimport(\s+)(['"])(\.{1,2}\/[^'"]+?\.js)\2/g,
    (_m, s, q, spec) => `import${s}${q}${spec}${v}${q}`
  );
  return Buffer.from(code, "utf8");
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function shouldSkip(rel) {
  const p = rel.replaceAll("\\", "/");
  const name = path.posix.basename(p);
  if (!p) return true;
  // Gerado/instalado pela Hostinger no servidor — não enviar.
  if (p === ".next" || p.startsWith(".next/")) return true;
  if (p === "node_modules" || p.startsWith("node_modules/")) return true;
  if (p === "out" || p.startsWith("out/")) return true;
  // Pastas que não fazem parte do app.
  if (p === "deploys" || p.startsWith("deploys/")) return true;
  // Backups do banco (dados pessoais) — nunca enviar no deploy.
  if (p === "backups" || p.startsWith("backups/")) return true;
  if (p === ".git" || p.startsWith(".git/")) return true;
  // Exceção: o script de backup precisa ir pro servidor (rodado diariamente pelo app).
  // NÃO pulamos a pasta "scripts" inteira (senão o coletor nem entraria nela);
  // mantemos só o backup-db.mjs e pulamos os demais arquivos de scripts/.
  if (p === "scripts/backup-db.mjs") return false;
  if (p.startsWith("scripts/")) return true;
  // Scripts de setup do banco (schema.sql, criar-admin) — não fazem parte do runtime.
  if (p === "database" || p.startsWith("database/")) return true;
  if (p === ".claude" || p.startsWith(".claude/")) return true;
  if (p === ".vscode" || p.startsWith(".vscode/")) return true;
  if (p === ".github" || p.startsWith(".github/")) return true;
  // Certificados de desenvolvimento (dev:https) — nunca enviar (segurança).
  if (p === "certificates" || p.startsWith("certificates/")) return true;
  // Segredos e lixo de build/dev.
  if (name.startsWith(".env")) return true;
  if (p.endsWith(".log") || p === "server.log") return true;
  if (name.endsWith(".zip")) return true;
  if (name === ".deploy-version.json") return true;
  if (name === "tsconfig.tsbuildinfo") return true;
  if (name === ".gitignore" || name === ".gitattributes") return true;
  if (name === "README.md") return true;
  // Exports com dados pessoais de convidados (LGPD) — nunca enviar no deploy.
  // O app não lê CSV em runtime; o import roda via scripts/ (já ignorado).
  if (name.endsWith(".csv")) return true;
  return false;
}

function collectFiles(dir = root, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(root, abs).replaceAll("\\", "/");
    if (shouldSkip(rel)) continue;
    if (entry.isDirectory()) collectFiles(abs, out);
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

function fileBuffer(rel) {
  return fs.readFileSync(path.join(root, rel));
}

function writeUInt16(buf, value, offset) { buf.writeUInt16LE(value & 0xffff, offset); }
function writeUInt32(buf, value, offset) { buf.writeUInt32LE(value >>> 0, offset); }

function createZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const rel of files) {
    const data = transformJsImports(rel, fileBuffer(rel));
    const name = Buffer.from(rel, "utf8");
    const crc = crc32(data);
    const stat = fs.statSync(path.join(root, rel));
    const { dosTime, dosDate } = dosDateTime(stat.mtime);

    const local = Buffer.alloc(30 + name.length);
    writeUInt32(local, 0x04034b50, 0);
    writeUInt16(local, 20, 4);
    writeUInt16(local, 0x0800, 6);
    writeUInt16(local, 0, 8);
    writeUInt16(local, dosTime, 10);
    writeUInt16(local, dosDate, 12);
    writeUInt32(local, crc, 14);
    writeUInt32(local, data.length, 18);
    writeUInt32(local, data.length, 22);
    writeUInt16(local, name.length, 26);
    writeUInt16(local, 0, 28);
    name.copy(local, 30);
    chunks.push(local, data);

    const c = Buffer.alloc(46 + name.length);
    writeUInt32(c, 0x02014b50, 0);
    writeUInt16(c, 20, 4);
    writeUInt16(c, 20, 6);
    writeUInt16(c, 0x0800, 8);
    writeUInt16(c, 0, 10);
    writeUInt16(c, dosTime, 12);
    writeUInt16(c, dosDate, 14);
    writeUInt32(c, crc, 16);
    writeUInt32(c, data.length, 20);
    writeUInt32(c, data.length, 24);
    writeUInt16(c, name.length, 28);
    writeUInt16(c, 0, 30);
    writeUInt16(c, 0, 32);
    writeUInt16(c, 0, 34);
    writeUInt16(c, 0, 36);
    writeUInt32(c, 0, 38);
    writeUInt32(c, offset, 42);
    name.copy(c, 46);
    central.push(c);
    offset += local.length + data.length;
  }

  const centralSize = central.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  writeUInt32(end, 0x06054b50, 0);
  writeUInt16(end, 0, 4);
  writeUInt16(end, 0, 6);
  writeUInt16(end, files.length, 8);
  writeUInt16(end, files.length, 10);
  writeUInt32(end, centralSize, 12);
  writeUInt32(end, offset, 16);
  writeUInt16(end, 0, 20);
  fs.mkdirSync(deployDir, { recursive: true });
  fs.writeFileSync(zipPath, Buffer.concat([...chunks, ...central, end]));
}

const files = collectFiles().sort();

// Arquivos que o build da Hostinger precisa.
for (const required of [
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
  "server.js",
  "public/painel/css/painel.css",
]) {
  if (!files.includes(required)) throw new Error(`Arquivo obrigatorio ausente no ZIP: ${required}`);
}
if (!files.some((f) => f.startsWith("src/"))) throw new Error("Codigo-fonte (src/) ausente no ZIP.");
if (files.some((f) => f === ".next" || f.startsWith(".next/"))) throw new Error("O ZIP nao deve conter .next (a Hostinger compila no servidor).");

createZip(files);

const sizeMb = fs.statSync(zipPath).size / 1024 / 1024;
console.log(`[deploy] ZIP de codigo-fonte criado: ${zipPath}`);
console.log(`[deploy] Arquivos: ${files.length}`);
console.log(`[deploy] Tamanho: ${sizeMb.toFixed(2)} MB`);
console.log(`[deploy] Versao dos modulos JS (cache-busting): ${JS_ASSET_VERSION}`);
console.log(`[deploy] A Hostinger vai rodar: npm install + npm run build (saida .next).`);
