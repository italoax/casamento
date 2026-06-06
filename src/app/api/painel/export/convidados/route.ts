import { NextResponse } from "next/server";
import { requirePainelPermission } from "@/lib/painel-auth";
import { listarConvidados } from "@/lib/painel-data";

export const runtime = "nodejs";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  if (!(await requirePainelPermission("export_data"))) return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  const url = new URL(request.url);
  const busca = url.searchParams.get("busca") || "";
  const ordem = url.searchParams.get("ordem") || "recentes";
  const data = await listarConvidados(busca, ordem, 1, 10000);
  const header = ["Nome", "Telefone", "Email", "Lista", "Confirmados", "Disponíveis", "Status", "Visibilidade"];
  const lines = [header.map(csvCell).join(";")];
  for (const c of data.rows) {
    lines.push([
      c.nome,
      c.telefone,
      c.email,
      c.nomes_lista,
      c.convites_confirmados,
      c.convites_disponiveis,
      c.status,
      c.visibilidade,
    ].map(csvCell).join(";"));
  }
  return new NextResponse(`\ufeff${lines.join("\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="convidados.csv"`,
    },
  });
}
