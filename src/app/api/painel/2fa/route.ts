/**
 * GERENCIAMENTO DE 2FA DO PAINEL — ativar / confirmar / desativar
 * Rotas: GET e POST /api/painel/2fa
 *
 * Exige sessão de painel válida (o usuário só mexe no próprio 2FA).
 * O login em si já valida o código 2FA — aqui é só o cadastro/remoção.
 *
 * Fluxo de ativação:
 *   1. POST { action: "setup" }  -> gera segredo, salva (enabled=0) e devolve o QR Code
 *   2. usuário escaneia no Google Authenticator / Authy
 *   3. POST { action: "enable", twofa_code } -> confere o código e liga (enabled=1)
 *
 * Desativar:
 *   POST { action: "disable", twofa_code } -> confere o código e remove o segredo
 */

import QRCode from "qrcode";
import { getPainelSession } from "@/lib/painel-auth";
import { queryOne, queryRows } from "@/lib/db";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "@/lib/totp";
import { errorJson, json } from "@/lib/http";
import { Security } from "@/lib/security";

export const runtime = "nodejs";

/** Nome do emissor mostrado no app autenticador (usa o domínio do site quando disponível). */
function issuerName() {
  try {
    return process.env.BASE_URL ? new URL(process.env.BASE_URL).hostname : "Painel Casamento";
  } catch {
    return "Painel Casamento";
  }
}

type UsuarioRow = {
  id: number;
  usuario: string;
  twofa_secret: string | null;
  twofa_enabled: number | string | null;
};

async function carregarUsuario(id: number) {
  return queryOne<UsuarioRow>(
    "SELECT id, usuario, twofa_secret, twofa_enabled FROM usuarios WHERE id = ? LIMIT 1",
    [id],
  );
}

function estaAtivo(user: UsuarioRow | null) {
  return Boolean(user?.twofa_secret) && Number(user?.twofa_enabled || 0) === 1;
}

/** Status atual do 2FA do usuário logado. */
export async function GET() {
  const session = await getPainelSession();
  if (!session) return errorJson("Não autenticado.", 401);

  const user = await carregarUsuario(session.id);
  return json({ enabled: estaAtivo(user) });
}

export async function POST(request: Request) {
  const session = await getPainelSession();
  if (!session) return errorJson("Não autenticado.", 401);

  // Limita tentativas para impedir brute force do código de 6 dígitos.
  const ip = Security.clientIp(request);
  if (!Security.checkRateLimit(`painel-2fa:${session.id}:${ip}`, 15, 300)) {
    return errorJson("Muitas tentativas. Tente novamente mais tarde.", 429);
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const code = String(body.twofa_code || body.code || "").replace(/\D+/g, "");

  const user = await carregarUsuario(session.id);
  if (!user) return errorJson("Usuário não encontrado.", 404);

  const ativo = estaAtivo(user);

  // 1) Gera um novo segredo e o QR Code (ainda desligado: enabled = 0).
  if (action === "setup") {
    if (ativo) return errorJson("O 2FA já está ativo. Desative antes de gerar um novo.", 409);

    const secret = generateTotpSecret();
    await queryRows("UPDATE usuarios SET twofa_secret = ?, twofa_enabled = 0 WHERE id = ?", [secret, user.id]);

    const otpauth = otpauthUrl({ secret, label: user.usuario, issuer: issuerName() });
    const qr = await QRCode.toDataURL(otpauth, { margin: 1, width: 240 });
    return json({ secret, otpauth, qr });
  }

  // 2) Confirma o código do app e liga o 2FA.
  if (action === "enable") {
    if (ativo) return json({ enabled: true });
    if (!user.twofa_secret) return errorJson("Gere o QR Code primeiro.", 409);
    if (!verifyTotp(String(user.twofa_secret), code)) {
      return errorJson("Código inválido. Confira no app e tente de novo.", 401);
    }
    await queryRows("UPDATE usuarios SET twofa_enabled = 1 WHERE id = ?", [user.id]);
    return json({ enabled: true });
  }

  // 3) Desativa: exige o código atual para confirmar que é o dono.
  if (action === "disable") {
    if (!ativo) return json({ enabled: false });
    if (!verifyTotp(String(user.twofa_secret), code)) {
      return errorJson("Código inválido. Confirme o código atual para desativar.", 401);
    }
    await queryRows("UPDATE usuarios SET twofa_secret = NULL, twofa_enabled = 0 WHERE id = ?", [user.id]);
    return json({ enabled: false });
  }

  return errorJson("Ação desconhecida.", 400);
}
