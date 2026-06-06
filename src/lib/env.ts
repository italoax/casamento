/**
 * ENVIRONMENT VARIABLES - Carregamento de Configurações
 * 
 * Este arquivo carrega variáveis de ambiente do arquivo .env na raiz do projeto.
 * Variáveis já definidas em process.env (ex.: do ambiente da Hostinger) têm
 * prioridade e NÃO são sobrescritas pelo .env.
 * 
 * Exemplo de uso:
 * const dbHost = env("DB_HOST", "localhost");  // Usa fallback se não encontrar
 * const isProduction = envBool("PRODUCTION", false);
 */

import * as fs from "node:fs";
import * as path from "node:path";

let loaded = false;

/**
 * Parse de arquivo .env e carregamento em process.env
 * Suporta:
 * - Comentários com #
 * - Valores com ou sem aspas
 * - Format: KEY=value
 */
function parseEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    const name = key.trim();
    if (!name || process.env[name]) continue; // Não sobrescreve variáveis já definidas
    let value = rest.join("=").trim();
    // Remove aspas do valor se existirem
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[name] = value;
  }
}

export function loadEnv() {
  if (loaded) return; // Carrega apenas uma vez (singleton)
  loaded = true;
  
  const root = process.cwd();
  // Tenta carregar de múltiplos locais em ordem de prioridade
  const candidates = [
    path.join(root, ".env"), // Arquivo único de ambiente
  ];
  for (const file of candidates) parseEnvFile(file);
}

/**
 * Obtém variável de ambiente string
 * @param name Nome da variável
 * @param fallback Valor padrão se não encontrar
 * @returns Valor da variável ou fallback
 */
export function env(name: string, fallback = "") {
  loadEnv();
  return (process.env[name] || fallback).trim();
}

/**
 * Obtém variável de ambiente como booleano
 * @param name Nome da variável
 * @param fallback Valor padrão se não encontrar
 * @returns true se valor for: 1, true, yes, on (case-insensitive)
 */
export function envBool(name: string, fallback = false) {
  const value = env(name).toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value);
}
