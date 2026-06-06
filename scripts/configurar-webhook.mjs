/**
 * Registro ÚNICO do webhook de Pix na Efí.
 *
 * Aponta o webhook para {BASE_URL}/api/webhook?ignorar= (o "?ignorar=" evita que
 * a Efí transforme a URL em .../api/webhook/pix e dê 404). Depois de rodar uma vez
 * com sucesso, o registro fica salvo na Efí e este arquivo pode ser apagado.
 *
 * Uso (na raiz do projeto, com o .env de produção preenchido):
 *   node scripts/configurar-webhook.mjs
 */

import fs from "node:fs";
import path from "node:path";

// Carrega o .env da raiz do mesmo jeito que o app (não sobrescreve o que já existe).
function loadEnv() {
  const file = path.join(process.cwd(), ".env");
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    const name = key.trim();
    if (!name || process.env[name]) continue;
    let value = rest.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[name] = value;
  }
}

const env = (name, fallback = "") => (process.env[name] || fallback).trim();
const envBool = (name, fallback = false) => {
  const v = env(name).toLowerCase();
  return v ? ["1", "true", "yes", "on"].includes(v) : fallback;
};

function certificateOption() {
  const base64 = env("EFI_CERTIFICATE_BASE64") || env("EFIPAY_CERTIFICATE_BASE64");
  if (base64) return { certificate: base64, cert_base64: true };
  const certPath = env("EFI_CERTIFICATE_PATH") || env("EFIPAY_CERTIFICATE_PATH");
  if (certPath) return { certificate: certPath, cert_base64: false };
  return { certificate: "", cert_base64: false };
}

async function main() {
  loadEnv();

  const clientId = env("EFI_CLIENT_ID") || env("EFIPAY_CLIENT_ID");
  const clientSecret = env("EFI_CLIENT_SECRET") || env("EFIPAY_CLIENT_SECRET");
  const chave = env("EFI_PIX_KEY") || env("EFIPAY_PIX_KEY");
  const cert = certificateOption();

  if (!clientId || !clientSecret) throw new Error("Faltam EFI_CLIENT_ID / EFI_CLIENT_SECRET no .env.");
  if (!cert.certificate) throw new Error("Faltam EFI_CERTIFICATE_PATH ou EFI_CERTIFICATE_BASE64 no .env.");
  if (!chave) throw new Error("Falta EFI_PIX_KEY no .env.");

  const base = env("BASE_URL", "https://emanuelleitalo.com").replace(/\/$/, "");
  const webhookUrl = `${base}/api/webhook?ignorar=`;

  if (base.includes("localhost") || base.includes("127.0.0.1")) {
    throw new Error(`BASE_URL aponta para ${base}. A Efí precisa de uma URL pública HTTPS — rode com o domínio de produção.`);
  }

  const { default: EfiPay } = await import("sdk-node-apis-efi");
  const efipay = new EfiPay({
    sandbox: envBool("EFI_SANDBOX", false),
    client_id: clientId,
    client_secret: clientSecret,
    certificate: cert.certificate,
    cert_base64: cert.cert_base64,
    validateMtls: envBool("EFI_VALIDATE_MTLS", false),
  });

  console.log(`Registrando webhook: ${webhookUrl}`);
  const resposta = await efipay.pixConfigWebhook({ chave }, { webhookUrl });
  console.log("Sucesso! Resposta da Efí:");
  console.log(JSON.stringify(resposta, null, 2));
  console.log("\nPronto. Pode apagar este arquivo (scripts/configurar-webhook.mjs).");
}

main().catch((error) => {
  console.error("Falha ao registrar webhook:", error?.mensagem || error?.message || error);
  process.exit(1);
});
