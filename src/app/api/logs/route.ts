import { errorJson, json } from "@/lib/http";
import { env } from "@/lib/env";
import { clientIp, clean, logPayment } from "@/lib/payment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const expected = env("LOGS_API_KEY") || env("EMAIL_API_TOKEN");
    if (expected && request.headers.get("x-api-token") !== expected) return errorJson("Não autorizado.", 403);
    const data = await request.json().catch(() => ({}));
    await logPayment({ tipo: clean(data.tipo || data.kind, 30), status: clean(data.status || data.level, 30), mensagem: clean(data.mensagem, 1000), valor: Number(data.valor || 0) || null, email: clean(data.email, 255) || null, ip: clientIp(request), payload: data.payload || data });
    return json({ sucesso: true });
  } catch (error) {
    console.error("Erro em POST /api/logs", error);
    return errorJson("Falha ao registrar log.", 500);
  }
}
