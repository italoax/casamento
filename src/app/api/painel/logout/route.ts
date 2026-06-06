import { json } from "@/lib/http";
import { PAINEL_COOKIE } from "@/lib/painel-auth";

export const runtime = "nodejs";

export async function POST() {
  const response = json({ sucesso: true });
  response.cookies.set(PAINEL_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
