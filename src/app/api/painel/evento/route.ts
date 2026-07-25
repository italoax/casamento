import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { calcularFase, getEventoConfig, setEventoConfig, validarEventoConfig } from "@/lib/evento-fases";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requirePainelPermission("manage_rsvp"))) return errorJson("Acesso negado.", 403);
  const config = await getEventoConfig();
  return json({ sucesso: true, config, faseAtual: calcularFase(config) });
}

export async function POST(request: Request) {
  if (!(await requirePainelPermission("manage_rsvp"))) return errorJson("Acesso negado.", 403);

  const body = await request.json().catch(() => ({}));
  const { dados, erros } = validarEventoConfig(body as Record<string, unknown>);
  if (erros.length) return errorJson(erros.join(" "), 400);
  if (!Object.keys(dados).length) return errorJson("Nada para salvar.", 400);

  // Datas parciais: se só uma vier no corpo, compara com a que já está salva
  // para não gravar um intervalo invertido (término antes do início).
  if (dados.inicio === undefined || dados.fim === undefined) {
    const atual = await getEventoConfig();
    const { erros: errosMesclados } = validarEventoConfig({ ...atual, ...dados } as Record<string, unknown>);
    if (errosMesclados.length) return errorJson(errosMesclados.join(" "), 400);
  }

  const config = await setEventoConfig(dados);
  return json({ sucesso: true, config, faseAtual: calcularFase(config) });
}
