import { errorJson, json } from "@/lib/http";
import { requirePainelRole } from "@/lib/painel-auth";
import { db, queryRows, queryOne } from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requirePainelRole("admin"))) return errorJson("Acesso negado.", 403);
  const usuarios = await queryRows<Record<string, unknown>>(
    "SELECT id, usuario, role, ativo, twofa_enabled, created_at FROM usuarios ORDER BY id",
  );
  return json({ sucesso: true, usuarios });
}

export async function POST(request: Request) {
  const session = await requirePainelRole("admin");
  if (!session) return errorJson("Acesso negado.", 403);

  const body = await request.json().catch(() => ({}));
  const acao = String(body.acao || "criar");

  if (acao === "criar") {
    const usuario = String(body.usuario || "").trim().toLowerCase();
    const senha = String(body.senha || "");
    const role = String(body.role || "assistente");

    if (!usuario || usuario.length < 3) return errorJson("Usuário deve ter pelo menos 3 caracteres.", 422);
    if (senha.length < 8) return errorJson("Senha deve ter pelo menos 8 caracteres.", 422);
    if (!["gerente", "assistente"].includes(role)) return errorJson("Role inválido.", 422);

    const existe = await queryOne<{ id: number }>("SELECT id FROM usuarios WHERE usuario = ?", [usuario]);
    if (existe) return errorJson("Já existe um usuário com esse nome.", 409);

    const hash = bcrypt.hashSync(senha, 10);
    await db().execute(
      "INSERT INTO usuarios (usuario, senha, role, ativo, twofa_enabled) VALUES (?, ?, ?, 1, 0)",
      [usuario, hash, role],
    );
    return json({ sucesso: true });
  }

  if (acao === "alternar_ativo") {
    const id = Number(body.id);
    if (!id) return errorJson("ID inválido.", 422);
    if (id === session.id) return errorJson("Você não pode desativar a si mesmo.", 422);
    await db().execute("UPDATE usuarios SET ativo = NOT ativo WHERE id = ?", [id]);
    return json({ sucesso: true });
  }

  if (acao === "alterar_role") {
    const id = Number(body.id);
    const role = String(body.role || "");
    if (!id) return errorJson("ID inválido.", 422);
    if (id === session.id) return errorJson("Você não pode alterar seu próprio role.", 422);
    if (!["admin", "gerente", "assistente"].includes(role)) return errorJson("Role inválido.", 422);
    await db().execute("UPDATE usuarios SET role = ? WHERE id = ?", [role, id]);
    return json({ sucesso: true });
  }

  if (acao === "resetar_senha") {
    const id = Number(body.id);
    const senha = String(body.senha || "");
    if (!id) return errorJson("ID inválido.", 422);
    if (senha.length < 8) return errorJson("Senha deve ter pelo menos 8 caracteres.", 422);
    const hash = bcrypt.hashSync(senha, 10);
    await db().execute("UPDATE usuarios SET senha = ? WHERE id = ?", [hash, id]);
    return json({ sucesso: true });
  }

  if (acao === "excluir") {
    const id = Number(body.id);
    if (!id) return errorJson("ID inválido.", 422);
    if (id === session.id) return errorJson("Você não pode excluir a si mesmo.", 422);
    await db().execute("DELETE FROM usuarios WHERE id = ?", [id]);
    return json({ sucesso: true });
  }

  return errorJson("Ação inválida.", 400);
}
