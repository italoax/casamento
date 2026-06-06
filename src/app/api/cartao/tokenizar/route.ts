import { errorJson, json } from "@/lib/http";
import { env, envBool } from "@/lib/env";
import { Security } from "@/lib/security";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new Response(null, {
    status: 204,
    headers: Security.corsHeaders(origin, request.url),
  });
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);

  if (!Security.isAllowedOrigin(origin, request.url)) {
    return errorJson("Origem não autorizada.", 403, { headers: corsHeaders });
  }

  const accountId = env("EFI_ACCOUNT_ID") || env("EFI_PAYEE_CODE") || env("EFIPAY_ACCOUNT_ID") || env("EFIPAY_PAYEE_CODE");
  if (!accountId) {
    return errorJson("Identificador de conta Efí não configurado. Informe EFI_ACCOUNT_ID no ambiente.", 500, { headers: corsHeaders });
  }

  return json({
    sucesso: true,
    account_id: accountId,
    environment: envBool("EFI_SANDBOX", false) ? "sandbox" : "production",
  }, 200, { headers: corsHeaders });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);

  if (!Security.isAllowedOrigin(origin, request.url)) {
    return errorJson("Origem não autorizada.", 403, { headers: corsHeaders });
  }

  return errorJson(
    "Tokenização de cartão migrada para o checkout transparente da Efí no navegador. Use GET /api/cartao/tokenizar para obter a configuração pública e envie o payment_token para /api/cartao.",
    410,
    { headers: corsHeaders },
  );
}
