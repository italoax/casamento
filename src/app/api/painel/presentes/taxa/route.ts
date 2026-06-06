import { errorJson, json, cleanText } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { db, tableExists } from "@/lib/db";

export const runtime = "nodejs";

function parseTaxa(value: unknown) {
  const n = Number(String(value || "0").replace(/[R$%\s]/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

async function ensureTabela() {
  if (!(await tableExists("presentes_precificacao"))) {
    await db().execute(`CREATE TABLE IF NOT EXISTS presentes_precificacao (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      taxa_percentual DECIMAL(8,4) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }
}

export async function POST(request: Request) {
  if (!(await requirePainelPermission("manage_presentes"))) return errorJson("Acesso negado.", 403);
  const body = await request.json().catch(() => ({}));
  const taxa = parseTaxa(body.taxa_percentual ?? body.taxa);
  await ensureTabela();
  await db().execute("INSERT INTO presentes_precificacao (id, taxa_percentual) VALUES (1, ?) ON DUPLICATE KEY UPDATE taxa_percentual = VALUES(taxa_percentual)", [taxa]);
  if (String(body.recalcular || "1") !== "0") {
    const fator = 1 + taxa / 100;
    await db().execute("UPDATE presentes SET preco = ROUND(COALESCE(preco_base, preco) * ?, 2)", [fator]);
    await db().execute("UPDATE presentes SET preco_total_referencia = ROUND(COALESCE(preco_base, preco) * quantidade_disponivel * ?, 2) WHERE modo_exibicao = 'cotas' AND quantidade_disponivel IS NOT NULL AND quantidade_disponivel > 0", [fator]);
  }
  return json({ sucesso: true, taxa });
}

export async function DELETE() {
  if (!(await requirePainelPermission("manage_presentes"))) return errorJson("Acesso negado.", 403);
  await ensureTabela();
  await db().execute("INSERT INTO presentes_precificacao (id, taxa_percentual) VALUES (1, 0) ON DUPLICATE KEY UPDATE taxa_percentual = 0");
  await db().execute("UPDATE presentes SET preco = COALESCE(preco_base, preco)");
  await db().execute("UPDATE presentes SET preco_total_referencia = ROUND(COALESCE(preco_base, preco) * quantidade_disponivel, 2) WHERE modo_exibicao = 'cotas' AND quantidade_disponivel IS NOT NULL AND quantidade_disponivel > 0");
  return json({ sucesso: true, taxa: 0 });
}
