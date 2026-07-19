import { errorJson, json } from "@/lib/http";
import { requirePainelPermission } from "@/lib/painel-auth";
import { getCartaoValor, parseCartaoValor, setCartaoValor } from "@/lib/cartao-config";

export const runtime = "nodejs";

export async function GET() {
  if (!(await requirePainelPermission("manage_presentes"))) return errorJson("Acesso negado.", 403);
  return json({ sucesso: true, valor: await getCartaoValor() });
}

export async function POST(request: Request) {
  if (!(await requirePainelPermission("manage_presentes"))) return errorJson("Acesso negado.", 403);
  const body = await request.json().catch(() => ({}));
  const valor = parseCartaoValor(body.valor ?? body.cartao_valor);
  if (!Number.isFinite(valor)) return errorJson("Valor inválido.", 400);
  await setCartaoValor(valor);
  return json({ sucesso: true, valor });
}
