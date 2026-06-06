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
    "EFI_CLIENT_ID",
    "EFI_CLIENT_SECRET",
    "EFI_PIX_KEY",
    "EFI_ACCOUNT_ID",
    "RECAPTCHA_SECRET",
    "SMTP_HOST",
    "SMTP_USER",
    "SMTP_PASS",
    "SESSION_SECRET",
    "RSVP_TOKEN_SECRET",
    "ENCRYPTION_KEY",
  ];

  // Verificar variáveis obrigatórias
  const missing = required.filter((key) => !env(key));

  if (!env("EFI_CERTIFICATE_BASE64") && !env("EFI_CERTIFICATE_PATH")) {
    missing.push("EFI_CERTIFICATE_BASE64 ou EFI_CERTIFICATE_PATH");
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
    "EFI_WEBHOOK_TOKEN",
  ];

  for (const secret of secrets) {
    const value = env(secret);
    if (!value && secret === "EFI_WEBHOOK_TOKEN") continue;
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
