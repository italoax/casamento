import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { SafeLog } from "@/lib/security";
import { acaoJob } from "@/lib/whatsapp-queue";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await requirePainelPermission("manage_convidados"))) return errorJson("Acesso negado.", 403);
  const body = await request.json().catch(() => ({}));
  const jobId = Number(body.jobId || 0);
  const acao = String(body.acao || "");
  if (!jobId) return errorJson("Job inválido.", 422);
  if (acao !== "pausar" && acao !== "retomar" && acao !== "cancelar") return errorJson("Ação inválida.", 422);

  try {
    await acaoJob(jobId, acao);
    return json({ sucesso: true });
  } catch (error) {
    SafeLog.error(`POST /api/painel/whatsapp/fila/acao (${acao})`, error);
    return errorJson((error as Error).message || "Falha ao atualizar o disparo.", 500);
  }
}
