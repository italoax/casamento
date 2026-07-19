import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { listarEnvios, idsJaEnviados, limparEnvios } from "@/lib/whatsapp-log";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requirePainelPermission("manage_convidados"))) return errorJson("Acesso negado.", 403);
  const [envios, enviadosIds] = await Promise.all([listarEnvios(500), idsJaEnviados()]);
  return json({ sucesso: true, envios, enviadosIds });
}

export async function DELETE() {
  if (!(await requirePainelPermission("manage_convidados"))) return errorJson("Acesso negado.", 403);
  await limparEnvios();
  return json({ sucesso: true });
}
