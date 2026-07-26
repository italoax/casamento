import { NextResponse } from "next/server";
import { requirePainelPermission } from "@/lib/painel-auth";
import { listarConvidados } from "@/lib/painel-data";
import { contarIdades } from "@/lib/painel-utils";
import { derivarPresenca } from "@/app/painel/utils/guest-helpers";
import { gerarXlsx } from "@/lib/xlsx";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await requirePainelPermission("export_data"))) return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  const url = new URL(request.url);
  const busca = url.searchParams.get("busca") || "";
  const presenca = url.searchParams.get("presenca_convidado") || "";
  const lista = url.searchParams.get("lista_convidado") || "";
  const comCrianca = url.searchParams.get("com_crianca") === "1";
  // A planilha respeita os filtros ativos (quais linhas), mas sai SEMPRE em
  // ordem alfabética por nome (A-Z), independente da ordenação da tela.
  const data = await listarConvidados(busca, "az", 1, 10000, { presenca, lista, comCrianca });

  const header = [
    "Nome",
    "Telefone",
    "Email",
    "Status",
    "Lista (padrinho/madrinha)",
    "Pessoas Disponíveis",
    "Pessoas Confirmadas",
    "Nomes da Lista",
    "Nomes Confirmados",
    "Nomes que Não Vão",
    "Nomes Aguardando (sem resposta)",
    "Adultos (total)",
    "Crianças 0-5 (total)",
    "Crianças 6-10 (total)",
    "Adultos Confirmados",
    "Crianças 0-5 Confirmados",
    "Crianças 6-10 Confirmados",
  ];
  const rows: Array<Array<string | number>> = [];
  for (const c of data.rows) {
    const idTotal = contarIdades(c.nomes_lista);
    const idConf = c.status === "confirmado" ? contarIdades(c.nomes_confirmados) : { adulto: 0, c0_5: 0, c6_10: 0 };
    // Mesma derivação que o painel usa: num convite que já respondeu, quem está
    // na lista mas não nos confirmados = "não vai"; se ainda não respondeu, todos aguardando.
    const presenca = derivarPresenca(c);

    rows.push([
      String(c.nome ?? ""),
      String(c.telefone ?? ""),
      String(c.email ?? ""),
      c.status === "confirmado" ? "Confirmado" : c.status === "recusado" ? "Recusado" : "Pendente",
      String(c.lista ?? ""),
      Number(c.convites_disponiveis || 0),
      Number(c.convites_confirmados || 0),
      String(c.nomes_lista ?? ""),
      String(c.nomes_confirmados ?? ""),
      presenca.naoVao.join(", "),
      presenca.pendentes.join(", "),
      idTotal.adulto,
      idTotal.c0_5,
      idTotal.c6_10,
      idConf.adulto,
      idConf.c0_5,
      idConf.c6_10,
    ]);
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const xlsx = gerarXlsx("Convidados", header, rows);
  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="convidados-${hoje}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
