import { cpSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
if (!existsSync(path.join(standalone, "server.js"))) {
    throw new Error("Build incompleto: .next/standalone/server.js não foi gerado.");
}

// O Next não inclui public e .next/static no pacote standalone automaticamente.
// Inclui também os assets com hash gerados durante a leitura da configuração.
cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });
console.log("Pacote standalone pronto: servidor, public e arquivos estáticos do Next.");
