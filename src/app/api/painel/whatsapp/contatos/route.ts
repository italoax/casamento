import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { columnExists, queryRows } from "@/lib/db";
import { normalizarTelefone } from "@/lib/whatsapp";

export const runtime = "nodejs";

type ConvidadoRow = {
  id: number;
  nome: string;
  telefone: string | null;
  status: string | null;
  lista: string | null;
};

export async function GET() {
  if (!(await requirePainelPermission("manage_convidados"))) return errorJson("Acesso negado.", 403);

  const temLista = await columnExists("convidados", "lista").catch(() => false);
  const rows = await queryRows<ConvidadoRow>(
    `SELECT id, nome, telefone, status, ${temLista ? "lista" : "NULL AS lista"} FROM convidados ORDER BY nome ASC`,
  );

  const contatos = rows
    .map((c) => ({
      id: c.id,
      nome: String(c.nome || "").trim(),
      telefone: String(c.telefone || "").trim(),
      telefoneValido: Boolean(normalizarTelefone(c.telefone)),
      status: String(c.status || "pendente"),
      lista: String(c.lista || "").toLowerCase(),
    }))
    .filter((c) => c.nome);

  return json({ sucesso: true, contatos });
}
