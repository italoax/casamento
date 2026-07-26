import * as bcrypt from "bcryptjs";
import { queryOne } from "@/lib/db";
import { verifyTotp } from "@/lib/totp";
import { errorJson, json } from "@/lib/http";
import { criarPainelToken, PAINEL_COOKIE } from "@/lib/painel-auth";
import { Security } from "@/lib/security";
import { registrarLogSeguranca } from "@/lib/security-log";

export const runtime = "nodejs";

type UsuarioRow = {
  id: number;
  usuario: string;
  senha: string;
  role?: string | null;
  permissoes?: string | null;
  ativo?: number | string | null;
  twofa_secret?: string | null;
  twofa_enabled?: number | string | null;
};

/** Lê permissões do banco (JSON, CSV ou null) para um array. */
function parsePermissoes(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch {
      return value.split(",").map((part) => part.trim()).filter(Boolean);
    }
  }
  return undefined;
}

export async function POST(request: Request) {
  try {
    const ip = Security.clientIp(request);
    if (!Security.checkRateLimit(`painel-login:${ip}`, 20, 300)) {
      await registrarLogSeguranca({ status: "alerta", mensagem: "Rate-limit de login do painel estourado", request });
      return errorJson("Muitas tentativas. Tente novamente mais tarde.", 429);
    }

    const body = await request.json().catch(() => ({}));
    const usuario = Security.sanitizeInput(body.usuario, 50);
    const senha = String(body.senha || "");
    const twofaCode = String(body.twofa_code || "").replace(/\D+/g, "");

    if (!usuario || !senha) return errorJson("Preencha usuário e senha.", 422);

    const user = await queryOne<UsuarioRow>(
      "SELECT id, usuario, senha, role, permissoes, ativo, twofa_secret, twofa_enabled FROM usuarios WHERE usuario = ? LIMIT 1",
      [usuario],
    );
    if (!user || !(await bcrypt.compare(senha, String(user.senha || "")))) {
      await registrarLogSeguranca({ status: "erro", mensagem: "Falha de login no painel (credenciais inválidas)", request, usuario });
      return errorJson("Credenciais inválidas.", 401);
    }

    // Bloqueia usuários desativados (coluna ativo = 0).
    if (user.ativo != null && Number(user.ativo) === 0) {
      await registrarLogSeguranca({ status: "erro", mensagem: "Tentativa de login com usuário desativado", request, usuario });
      return errorJson("Usuário desativado. Procure o administrador.", 403);
    }

    const has2fa = Boolean(user.twofa_secret) && Number(user.twofa_enabled || 0) === 1;
    if (has2fa) {
      if (!twofaCode) return json({ sucesso: false, requires2fa: true, erro: "Informe o código do Google Authenticator." }, 401);
      const twofaValid = verifyTotp(String(user.twofa_secret), twofaCode);
      if (!twofaValid) {
        await registrarLogSeguranca({ status: "erro", mensagem: "Falha de login no painel (código 2FA inválido)", request, usuario });
        return errorJson("Código 2FA inválido.", 401);
      }
    }

    // Aplica papel e permissões do banco (RBAC). criarPainelToken normaliza/valida.
    const token = await criarPainelToken({
      id: Number(user.id),
      usuario: String(user.usuario),
      role: user.role,
      permissoes: parsePermissoes(user.permissoes),
    });
    await registrarLogSeguranca({ status: "sucesso", mensagem: "Login no painel realizado", request, usuario });
    const response = json({ sucesso: true });
    response.cookies.set(PAINEL_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch (error) {
    console.error("Erro no login do painel", error);
    return errorJson("Não foi possível entrar no painel.", 500);
  }
}
