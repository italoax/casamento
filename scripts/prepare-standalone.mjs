import { cpSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
if (!existsSync(path.join(standalone, "server.js"))) {
    throw new Error("Build incompleto: .next/standalone/server.js não foi gerado.");
}

// A Hostinger inicia este arquivo gerado, não o server.js da raiz.
// Configura os pools antes que o Next abra arquivos e carregue libs nativas.
const bootstrap = 'require("./scripts/runtime-resources.cjs");\n';
const serverPath = path.join(standalone, "server.js");
const server = readFileSync(serverPath, "utf8");
if (!server.startsWith(bootstrap)) writeFileSync(serverPath, bootstrap + server);
mkdirSync(path.join(standalone, "scripts"), { recursive: true });
cpSync(path.join(root, "scripts", "runtime-resources.cjs"), path.join(standalone, "scripts", "runtime-resources.cjs"));

// O Next não inclui public e .next/static no pacote standalone automaticamente.
// Inclui também os assets com hash gerados durante a leitura da configuração.
cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });
console.log("Pacote standalone pronto: servidor, public e arquivos estáticos do Next.");
