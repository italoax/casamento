import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const deployDir = path.join(root, "deploys");
const zipPath = path.join(deployDir, "casamento-hostinger.zip");

function run(command) {
  console.log(`[deploy] ${command}`);
  const result = spawnSync(command, { cwd: root, stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
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
  if (p === "deploys" || p.startsWith("deploys/")) return true;
  if (p === "node_modules" || p.startsWith("node_modules/")) return true;
  if (p === ".git" || p.startsWith(".git/")) return true;
  if (p === ".next/cache" || p.startsWith(".next/cache/")) return true;
  if (p === ".next/dev" || p.startsWith(".next/dev/")) return true;
  if (p.endsWith(".log") || p === "server.log") return true;
  if (name.startsWith(".env")) return true;
  if (name.endsWith(".zip")) return true;
  if (name === ".deploy-version.json") return true;
  if (name === "tsconfig.tsbuildinfo") return true;
  if (name === "lista_convidados_26-04-2026_16-58.csv") return true;
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

function packageJsonBuffer() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  pkg.scripts = {
    ...pkg.scripts,
    build: "node -e \"console.log('Build ja incluido em .next/')\"",
    start: "node server.js",
  };
  pkg.main = "server.js";
  return Buffer.from(`${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

function fileBuffer(rel) {
  if (rel === "package.json") return packageJsonBuffer();
  return fs.readFileSync(path.join(root, rel));
}

function writeUInt16(buf, value, offset) { buf.writeUInt16LE(value & 0xffff, offset); }
function writeUInt32(buf, value, offset) { buf.writeUInt32LE(value >>> 0, offset); }

function createZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const rel of files) {
    const data = fileBuffer(rel);
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

run("npm run build");
const files = collectFiles().sort();
for (const required of ["package.json", "package-lock.json", "server.js", "app.js", "public/painel/css/painel-next.css", "public/painel/css/painel.css"]) {
  if (!files.includes(required)) throw new Error(`Arquivo obrigatorio ausente no ZIP: ${required}`);
}
if (!files.some((f) => f.startsWith(".next/"))) throw new Error("Build .next nao encontrado para empacotar.");
createZip(files);

const sizeMb = fs.statSync(zipPath).size / 1024 / 1024;
console.log(`[deploy] ZIP criado: ${zipPath}`);
console.log(`[deploy] Arquivos: ${files.length}`);
console.log(`[deploy] Tamanho: ${sizeMb.toFixed(2)} MB`);
