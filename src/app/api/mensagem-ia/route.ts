import { errorJson, json } from "@/lib/http";
import { Security, SafeLog } from "@/lib/security";
import { clean } from "@/lib/payment";
import { gerarMensagemNoivos } from "@/lib/ai-mensagem";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new Response(null, { status: 204, headers: Security.corsHeaders(origin, request.url) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);

  if (!Security.isAllowedOrigin(origin, request.url)) {
    return errorJson("Origem não autorizada.", 403, { headers: corsHeaders });
  }

  // Endpoint pago (chama a IA): limite mais estrito por IP.
  const ip = Security.clientIp(request);
  if (!Security.checkRateLimit(`POST:mensagem-ia:${ip}`, 8, 300)) {
    return errorJson("Muitas gerações em pouco tempo. Aguarde alguns minutos.", 429, { headers: corsHeaders });
  }
  // Teto GLOBAL (todas as origens somadas): limita o custo total de IA mesmo que
  // um atacante troque de IP para furar o limite por IP acima. 40/hora é folgado
  // para o uso real de um site de casamento.
  if (!Security.checkRateLimit("POST:mensagem-ia:global", 40, 3600)) {
    return errorJson("Limite de gerações atingido. Tente novamente mais tarde.", 429, { headers: corsHeaders });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { nome?: string } | null;
    const nome = clean(body?.nome, 80);
    const mensagem = await gerarMensagemNoivos({ nome });
    return json({ sucesso: true, mensagem }, 200, { headers: corsHeaders });
  } catch (error) {
    // Sem chave configurada é estado esperado (IA desligada): não polui os logs.
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("não configurada")) {
      SafeLog.info("POST /api/mensagem-ia", "IA desativada (sem ANTHROPIC_API_KEY).");
    } else {
      SafeLog.error("POST /api/mensagem-ia", error);
    }
    // O front cai no gerador local.
    return errorJson("IA indisponível no momento.", 503, { headers: corsHeaders });
  }
}
