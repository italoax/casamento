import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { getDashboardData, getRsvpDeadline, listarConvidados, listarLogs, listarPresentes, listarRecados, listarVendas } from "@/lib/painel-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requirePainelPermission("view_painel");
  if (!session) return errorJson("Acesso negado.", 403);

  const url = new URL(request.url);
  const busca = url.searchParams.get("busca") || "";
  const ordem = url.searchParams.get("ordem") || "recentes";
  const presencaConvidado = url.searchParams.get("presenca_convidado") || "";
  const listaConvidado = url.searchParams.get("lista_convidado") || "";
  const comCrianca = url.searchParams.get("com_crianca") === "1";
  const buscaPresente = url.searchParams.get("busca_presente") || "";
  const ordemPresente = url.searchParams.get("ordem_presente") || "recentes";
  const categoriaPresente = url.searchParams.get("categoria_presente") || "";
  const dispPresente = url.searchParams.get("disp_presente") || "";
  const pagina = Number(url.searchParams.get("pagina") || "1");
  const buscaVenda = url.searchParams.get("busca_venda") || "";
  const statusVenda = url.searchParams.get("status_venda") || "";
  const paginaVenda = Number(url.searchParams.get("pagina_venda") || "1");
  const buscaLog = url.searchParams.get("busca_log") || "";
  const tipoLog = url.searchParams.get("tipo_log") || "";
  const statusLog = url.searchParams.get("status_log") || "";
  const paginaLog = Number(url.searchParams.get("pagina_log") || "1");

  const [dashboard, convidados, presentes, vendas, recados, logs, rsvpDeadline] = await Promise.all([
    getDashboardData(),
    listarConvidados(busca, ordem, pagina, 20, { presenca: presencaConvidado, lista: listaConvidado, comCrianca }),
    listarPresentes(buscaPresente, ordemPresente, { categoria: categoriaPresente, disponibilidade: dispPresente }),
    listarVendas(paginaVenda, 20, buscaVenda, statusVenda),
    listarRecados(),
    listarLogs(paginaLog, 50, buscaLog, tipoLog, statusLog),
    getRsvpDeadline(),
  ]);

  return json({ sucesso: true, session, dashboard, convidados, presentes, vendas, recados, logs, rsvpDeadline });
}
