import { json } from "@/lib/http";
import { Security, SafeLog } from "@/lib/security";
import { calcularFase, getEventoConfig, EVENTO_DEFAULTS } from "@/lib/evento-fases";

export const runtime = "nodejs";

/**
 * Fase atual do evento, consumida pelo bloco do contador na home.
 *
 * Público e sem dados sensíveis: devolve só a fase vigente e o texto dela. Numa
 * falha, responde "contagem" — o pior cenário é o contador continuar aparecendo,
 * nunca a home ficar quebrada.
 */
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: Security.corsHeaders(request.headers.get("origin"), request.url),
  });
}

export async function GET(request: Request) {
  const corsHeaders = Security.corsHeaders(request.headers.get("origin"), request.url);
  try {
    const config = await getEventoConfig();
    const fase = calcularFase(config);
    // "encerrado" usa os mesmos textos de "agradecimento": é a mesma mensagem,
    // só que ocupando o site inteiro em vez do topo da home.
    const usaAgradecimento = fase === "agradecimento" || fase === "encerrado";
    const titulo = fase === "acontecendo" ? config.acontecendoTitulo : usaAgradecimento ? config.agradecimentoTitulo : "";
    const mensagem = fase === "acontecendo" ? config.acontecendoMensagem : usaAgradecimento ? config.agradecimentoMensagem : "";
    return json({ sucesso: true, fase, titulo, mensagem }, { headers: corsHeaders });
  } catch (error) {
    SafeLog.error("GET /api/evento", error);
    return json(
      { sucesso: true, fase: "contagem", titulo: "", mensagem: "", padrao: EVENTO_DEFAULTS.modo },
      { headers: corsHeaders },
    );
  }
}
