import { NextResponse } from "next/server";
import { requirePainelPermission } from "@/lib/painel-auth";
import { listarConvidados } from "@/lib/painel-data";
import { contarIdades } from "@/lib/painel-utils";

export const runtime = "nodejs";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  if (!(await requirePainelPermission("export_data"))) return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  const url = new URL(request.url);
  const busca = url.searchParams.get("busca") || "";
  const ordem = url.searchParams.get("ordem") || "az";
  const presenca = url.searchParams.get("presenca_convidado") || "";
  const lista = url.searchParams.get("lista_convidado") || "";
  const comCrianca = url.searchParams.get("com_crianca") === "1";
  // A exportação respeita os filtros ativos na tela (mesmos parâmetros).
  const data = await listarConvidados(busca, ordem, 1, 10000, { presenca, lista, comCrianca });

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
    "Adultos (total)",
    "Crianças 0-5 (total)",
    "Crianças 6-10 (total)",
    "Adultos Confirmados",
    "Crianças 0-5 Confirmados",
    "Crianças 6-10 Confirmados",
  ];
  const lines = [header.map(csvCell).join(";")];

  for (const c of data.rows) {
    const idTotal = contarIdades(c.nomes_lista);
    const idConf = c.status === "confirmado" ? contarIdades(c.nomes_confirmados) : { adulto: 0, c0_5: 0, c6_10: 0 };

    lines.push([
      c.nome,
      c.telefone,
      c.email,
      c.status === "confirmado" ? "Confirmado" : c.status === "recusado" ? "Recusado" : "Pendente",
      c.lista || "",
      c.convites_disponiveis,
      c.convites_confirmados,
      c.nomes_lista,
      c.nomes_confirmados || "",
      idTotal.adulto,
      idTotal.c0_5,
      idTotal.c6_10,
      idConf.adulto,
      idConf.c0_5,
      idConf.c6_10,
    ].map(csvCell).join(";"));
  }

  const hoje = new Date().toISOString().slice(0, 10);
  return new NextResponse(`﻿${lines.join("\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="convidados-${hoje}.csv"`,
    },
  });
}
