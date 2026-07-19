/**
 * Validação de variáveis de ambiente
 * Executada na inicialização da aplicação em produção
 */

import { env } from "./env";

let validated = false;

export function validateEnvironment() {
  // Não validar em desenvolvimento
  if (process.env.NODE_ENV !== "production" || validated) {
    return;
  }

  validated = true;

  // Variáveis obrigatórias
  const required = [
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "BASE_URL",
    "ASAAS_ENV",
    "TURNSTILE_SECRET",
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASS",
    "SESSION_SECRET",
    "RSVP_TOKEN_SECRET",
    "ENCRYPTION_KEY",
  ];

  // Verificar variáveis obrigatórias
  const missing = required.filter((key) => !env(key));

  // A chave do Asaas pode vir como ASAAS_API_KEY ou ASAAS_API_KEY_B64 (base64,
  // usada quando o "$" inicial é corrompido pelo ambiente). Basta uma delas.
  if (!env("ASAAS_API_KEY") && !env("ASAAS_API_KEY_B64")) {
    missing.push("ASAAS_API_KEY");
  }

  if (missing.length > 0) {
    throw new Error(
      `❌ ERRO: Variáveis de ambiente obrigatórias ausentes: ${missing.join(", ")}`
    );
  }

  // ENCRYPTION_KEY precisa ter exatamente 64 caracteres hexadecimais (256 bits)
  // para o AES-256-GCM usado em src/lib/encryption.ts (dados sensíveis: e-mail, CPF, telefone).
  const encryptionKey = env("ENCRYPTION_KEY");
  if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
    throw new Error(
      "❌ ERRO: ENCRYPTION_KEY deve ter exatamente 64 caracteres hexadecimais (256 bits). " +
        'Gere com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Validar força dos secrets (mínimo 64 caracteres e sem placeholders)
  const secrets = [
    "SESSION_SECRET",
    "RSVP_TOKEN_SECRET",
  ];

  for (const secret of secrets) {
    const value = env(secret);
    const insecurePatterns = [
      /^(.)\1+$/,
      /^(0123|1234|abc)/i,
      /dev|test|troque|change/i,
      /password|secret|token/i,
      /^123|^000|^111/,
    ];

    if (value.length < 64 || insecurePatterns.some((pattern) => pattern.test(value))) {
      throw new Error(
        `❌ ERRO: ${secret} muito fraca ou placeholder (mínimo 64 caracteres)`
      );
    }
  }

  // ASAAS_WEBHOOK_TOKEN é definido no painel do Asaas (não é um segredo gerado por nós);
  // exigimos só um mínimo razoável e a ausência de placeholders óbvios.
  const asaasWebhookToken = env("ASAAS_WEBHOOK_TOKEN");
  if (asaasWebhookToken && (asaasWebhookToken.length < 16 || /troque|change|placeholder|exemplo/i.test(asaasWebhookToken))) {
    throw new Error("❌ ERRO: ASAAS_WEBHOOK_TOKEN inválido (mínimo 16 caracteres, sem placeholder)");
  }

  // Validar URL base
  try {
    new URL(env("BASE_URL"));
  } catch {
    throw new Error(
      `❌ ERRO: BASE_URL inválida. Verificar formato https://`
    );
  }

  // Validar porta do banco
  const port = Number(env("DB_PORT", "3306"));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`❌ ERRO: DB_PORT inválida (atual: ${port})`);
  }

  console.log("✅ Validação de ambiente OK");
}
