import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { db, tableExists } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE() {
  if (!(await requirePainelPermission("view_painel"))) return errorJson("Acesso negado.", 403);
  if (await tableExists("site_logs")) {
    await db().execute("TRUNCATE TABLE site_logs");
  }
  return json({ sucesso: true, mensagem: "Logs do site removidos com sucesso." });
}
