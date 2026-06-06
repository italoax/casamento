const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");

const port = process.env.PORT || "3000";
const host = process.env.HOST || "0.0.0.0";
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const logFile = path.join(process.cwd(), "server.log");

process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.NEXT_TELEMETRY_DISABLED = process.env.NEXT_TELEMETRY_DISABLED || "1";

let logStream = null;
try {
  logStream = fs.createWriteStream(logFile, { flags: "a" });
} catch (error) {
  console.error(`[server.js] Nao foi possivel abrir server.log: ${error.message}`);
}

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[server.js] [${timestamp}] ${message}`;
  console.log(line);
  if (logStream) logStream.write(`${line}\n`);
}

log("========================================");
log(`Iniciando wrapper Hostinger em ${host}:${port}`);
log(`Node version: ${process.version}`);
log(`Environment: ${process.env.NODE_ENV}`);
log(`Working directory: ${process.cwd()}`);
log(`Next binary: ${nextBin}`);
log(`DB_HOST: ${process.env.DB_HOST || "NAO_CONFIGURADA"}`);
log("========================================");

if (!fs.existsSync(nextBin)) {
  log(`[WARN] Next.js nao encontrado em ${nextBin}. Tentando instalar dependencias de producao...`);
  const install = spawnSync("npm", ["ci", "--omit=dev", "--no-audit", "--no-fund"], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (install.status !== 0 || !fs.existsSync(nextBin)) {
    const detail = install.error ? ` (${install.error.message})` : "";
    log(`[FATAL] Next.js nao encontrado apos npm ci --omit=dev. Codigo: ${install.status ?? "desconhecido"}${detail}`);
    process.exit(1);
  }

  log("Dependencias de producao instaladas com sucesso.");
}

process.on("uncaughtException", (error) => {
  log(`[FATAL] uncaughtException: ${error.stack || error.message}`);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  const detail = reason instanceof Error ? reason.stack || reason.message : String(reason);
  log(`[FATAL] unhandledRejection: ${detail}`);
  process.exit(1);
});

const child = spawn(process.execPath, [nextBin, "start", "-H", host, "-p", port], {
  stdio: ["ignore", "pipe", "pipe"],
  env: process.env,
  shell: false,
});

function pipeChildOutput(stream, level) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      log(`[next:${level}] ${line}`);
    }
  });
  stream.on("end", () => {
    if (buffer.trim()) log(`[next:${level}] ${buffer}`);
  });
}

if (child.stdout) pipeChildOutput(child.stdout, "stdout");
if (child.stderr) pipeChildOutput(child.stderr, "stderr");

child.on("exit", (code, signal) => {
  if (signal) {
    log(`[EXIT] Next.js terminou por sinal: ${signal}`);
    process.kill(process.pid, signal);
    return;
  }

  log(`[EXIT] Next.js terminou com codigo: ${code}`);
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  log(`[FATAL] Falha ao iniciar Next.js: ${error.message}`);
  process.exit(1);
});

process.on("SIGTERM", () => {
  log("[SIGNAL] Recebido SIGTERM, encerrando Next.js...");
  child.kill("SIGTERM");
});

process.on("SIGINT", () => {
  log("[SIGNAL] Recebido SIGINT, encerrando Next.js...");
  child.kill("SIGINT");
});
