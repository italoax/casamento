import { errorJson, json } from "@/lib/http";
import { env } from "@/lib/env";
import { backupFeitoHoje, gerarBackup } from "@/lib/backup";
import { SafeLog } from "@/lib/security";

export const runtime = "nodejs";

/**
 * CRON — backup diário do banco.
 *
 * Gera um dump .sql (mesma lógica do botão "Gerar backup agora" do painel) e
 * mantém só os 2 mais recentes. Por padrão só gera 1x por dia (trava por data);
 * use ?force=1 para gerar sob demanda.
 *
 * Roda no processo do site (mesmo diretório do painel), então o backup aparece
 * na lista. Isso é mais confiável que os timers do server.js em hospedagem
 * compartilhada (o Passenger "dorme" o app e o timer não dispara).
 *
 * Proteção: header `x-api-token` (ou query `?key=`) = LOGS_API_KEY (ou CRON_SECRET
 * / EMAIL_API_TOKEN). Cadastre na Hostinger um cron 1x/dia, ex.:
 *   curl -s -H "x-api-token: SUA_LOGS_API_KEY" https://emanuelleitalo.com/api/cron/backup
 */
async function executar(request: Request) {
  const expected = env("CRON_SECRET") || env("LOGS_API_KEY") || env("EMAIL_API_TOKEN");
  if (!expected) return errorJson("Cron desabilitado: configure LOGS_API_KEY.", 503);

  const url = new URL(request.url);
  const enviado = request.headers.get("x-api-token") || url.searchParams.get("key") || "";
  if (enviado !== expected) return errorJson("Não autorizado.", 403);

  try {
    const forcar = url.searchParams.get("force") === "1";
    if (!forcar && backupFeitoHoje()) {
      return json({ sucesso: true, jaFeitoHoje: true });
    }
    const resultado = await gerarBackup();
    return json({ sucesso: true, ...resultado });
  } catch (error) {
    SafeLog.error("GET /api/cron/backup", error);
    return errorJson(`Falha ao gerar backup: ${(error as Error).message}`, 500);
  }
}

export async function GET(request: Request) {
  return executar(request);
}

export async function POST(request: Request) {
  return executar(request);
}
