import { errorJson, json, cleanText } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { columnExists, db, queryOne } from "@/lib/db";

export const runtime = "nodejs";

async function requireAuth() {
  return Boolean(await requirePainelPermission("manage_convidados"));
}

export async function POST(request: Request) {
  if (!(await requireAuth())) return errorJson("Não autenticado.", 401);
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id || 0);
  const nome = cleanText(body.nome, 120);
  const telefone = cleanText(body.telefone, 30).replace(/\D+/g, "");
  const email = cleanText(body.email, 150);
  const nomesLista = cleanText(body.nomes_lista, 5000);
  const qtd = Math.max(0, Number(body.convites_disponiveis || body.qtd || 0));
  const status = ["pendente", "confirmado", "recusado"].includes(String(body.status)) ? String(body.status) : "pendente";
  const confirmados = Math.max(0, Number(body.convites_confirmados || 0));
  const visibilidade = String(body.visibilidade || "disponivel") === "oculto" ? "oculto" : "disponivel";
  if (!nome || !nomesLista || qtd < 1) return errorJson("Preencha nome, lista e quantidade de convites.", 422);
  const hasVis = await columnExists("convidados", "visibilidade");
  if (id > 0) {
    if (hasVis) {
      await db().execute("UPDATE convidados SET nome=?, telefone=?, email=?, nomes_lista=?, convites_disponiveis=?, status=?, convites_confirmados=?, visibilidade=? WHERE id=?", [nome, telefone, email, nomesLista, qtd, status, confirmados, visibilidade, id]);
    } else {
      await db().execute("UPDATE convidados SET nome=?, telefone=?, email=?, nomes_lista=?, convites_disponiveis=?, status=?, convites_confirmados=? WHERE id=?", [nome, telefone, email, nomesLista, qtd, status, confirmados, id]);
    }
    return json({ sucesso: true });
  }
  if (hasVis) {
    await db().execute("INSERT INTO convidados (nome, telefone, email, nomes_lista, convites_disponiveis, status, convites_confirmados, visibilidade) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [nome, telefone, email, nomesLista, qtd, status, confirmados, visibilidade]);
  } else {
    await db().execute("INSERT INTO convidados (nome, telefone, email, nomes_lista, convites_disponiveis, status, convites_confirmados) VALUES (?, ?, ?, ?, ?, ?, ?)", [nome, telefone, email, nomesLista, qtd, status, confirmados]);
  }
  return json({ sucesso: true });
}

export async function DELETE(request: Request) {
  if (!(await requireAuth())) return errorJson("Não autenticado.", 401);
  const id = Number(new URL(request.url).searchParams.get("id") || 0);
  if (!id) return errorJson("ID inválido.", 422);
  await db().execute("DELETE FROM convidados WHERE id = ?", [id]);
  return json({ sucesso: true });
}

export async function GET(request: Request) {
  if (!(await requireAuth())) return errorJson("Não autenticado.", 401);
  const id = Number(new URL(request.url).searchParams.get("id") || 0);
  if (!id) return errorJson("ID inválido.", 422);
  const row = await queryOne("SELECT * FROM convidados WHERE id = ? LIMIT 1", [id]);
  return json({ sucesso: true, convidado: row });
}
