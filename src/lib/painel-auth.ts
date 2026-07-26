/**
 * PAINEL AUTHENTICATION - Sessões e Autorização
 * 
 * Gerencia:
 * - Autenticação de usuários do painel administrativo
 * - JWT tokens com sessões de 8 horas
 * - RBAC (Role-Based Access Control) com 3 roles: admin, gerente, assistente
 * - Permissões granulares por role
 * 
 * Fluxo:
 * 1. Usuário faz login (verificando TOTP)
 * 2. criarPainelToken() gera JWT com role e permissões
 * 3. Token é armazenado em cookie (PAINEL_COOKIE)
 * 4. Nas rotas protegidas, validamos com getPainelSession()
 */

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";
import { registrarLogSeguranca } from "./security-log";

export const PAINEL_COOKIE = "painel_session";

// ===== TIPOS DE AUTORIZAÇÃO =====

export type PainelRole = "admin" | "gerente" | "assistente";

export type PainelPermission =
  | "view_painel"           // Pode acessar o painel
  | "manage_convidados"     // Pode gerenciar convidados
  | "manage_presentes"      // Pode gerenciar presentes
  | "manage_recados"        // Pode gerenciar recados
  | "manage_rsvp"           // Pode gerenciar confirmações de presença
  | "sync_vendas"           // Pode sincronizar vendas com a Efí
  | "export_data";          // Pode exportar dados

export type PainelSession = {
  id: number;
  usuario: string;
  role: PainelRole;
  permissoes: PainelPermission[];
};

/**
 * Mapeamento de roles para permissões
 * - Admin: acesso total
 * - Gerente: acesso total (mesmos que admin)
 * - Assistente: acesso limitado (convidados e recados)
 */
const ROLE_PERMISSIONS: Record<PainelRole, PainelPermission[]> = {
  admin: ["view_painel", "manage_convidados", "manage_presentes", "manage_recados", "manage_rsvp", "sync_vendas", "export_data"],
  gerente: ["view_painel", "manage_convidados", "manage_presentes", "manage_recados", "manage_rsvp", "sync_vendas", "export_data"],
  assistente: ["view_painel", "manage_convidados", "manage_recados"],
};

const WEAK_SECRET_PATTERNS = [/change-me/i, /dev-secret/i, /secret-change/i, /default/i, /placeholder/i];

/**
 * Verifica se a chave secreta é fraca
 * - Deve ter pelo menos 32 caracteres
 * - Não deve conter padrões padrão/genéricos
 */
function isWeakSecret(secret: string) {
  return secret.length < 32 || WEAK_SECRET_PATTERNS.some((pattern) => pattern.test(secret));
}

/**
 * Obtém a chave secreta de assinatura do JWT
 * Tenta em ordem:
 * 1. PAINEL_SESSION_SECRET (prioridade)
 * 2. NEXTAUTH_SECRET
 * 3. APP_KEY
 * 4. WEBHOOK_SECRET
 */
function secretKey() {
  const secret = env("PAINEL_SESSION_SECRET") || env("NEXTAUTH_SECRET") || env("APP_KEY") || env("WEBHOOK_SECRET");
  if (!secret || isWeakSecret(secret)) {
    throw new Error("PAINEL_SESSION_SECRET obrigatório e forte para assinar a sessão do painel.");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Normaliza/valida o role do usuário.
 * Padrão = "assistente" (MENOR privilégio) se inválido — falha segura. Um role
 * inválido só ocorreria em token corrompido/adulterado (que já é barrado pela
 * verificação de assinatura); ainda assim, na dúvida damos o menor acesso.
 * Os usuários reais têm role explícito no banco, então isto não rebaixa ninguém.
 */
function normalizeRole(value: unknown): PainelRole {
  return value === "gerente" || value === "assistente" || value === "admin" ? value : "assistente";
}

/**
 * Normaliza/valida as permissões baseado no role
 * Remove permissões não autorizado para o role
 */
function normalizePermissions(role: PainelRole, value: unknown): PainelPermission[] {
  const allowed = new Set(ROLE_PERMISSIONS[role]);
  if (!Array.isArray(value)) return ROLE_PERMISSIONS[role];
  const perms = value.filter((perm): perm is PainelPermission => typeof perm === "string" && allowed.has(perm as PainelPermission));
  return perms.length ? perms : ROLE_PERMISSIONS[role];
}

export async function criarPainelToken(session: { id: number; usuario: string; role?: unknown; permissoes?: unknown }) {
  // Normaliza role e permissões (segurança: impede privilege escalation)
  const role = normalizeRole(session.role);
  const permissoes = normalizePermissions(role, session.permissoes);
  
  // Cria JWT assinado com HS256
  return new SignJWT({ usuario: session.usuario, role, permissoes })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(session.id))              // sub = user ID
    .setIssuedAt()                               // iat = emitido agora
    .setExpirationTime("8h")                     // exp = expira em 8 horas
    .sign(secretKey());
}

/**
 * Valida um JWT e retorna a sessão do usuário
 * @param token JWT da sessão
 * @returns PainelSession se válido, null se inválido ou expirado
 */
export async function validarPainelToken(token?: string | null): Promise<PainelSession | null> {
  if (!token) return null;
  try {
    // Verifica assinatura e validade do JWT
    const { payload } = await jwtVerify(token, secretKey());
    const id = Number(payload.sub || 0);
    const usuario = String(payload.usuario || "");
    if (!id || !usuario) return null;
    const role = normalizeRole(payload.role);
    return { id, usuario, role, permissoes: normalizePermissions(role, payload.permissoes) };
  } catch {
    return null; // Token inválido ou expirado
  }
}

/**
 * Obtém a sessão do usuário atual a partir do cookie
 */
export async function getPainelSession() {
  const store = await cookies();
  return validarPainelToken(store.get(PAINEL_COOKIE)?.value);
}

/**
 * Middleware: Requer uma permissão específica
 * @returns Session se tem permissão, null caso contrário
 */
export async function requirePainelPermission(permission: PainelPermission): Promise<PainelSession | null> {
  const session = await getPainelSession();
  if (!session) return null;
  if (!session.permissoes.includes(permission)) {
    // Sessão válida tentando ação sem permissão = escalonamento; vale registrar.
    await registrarLogSeguranca({ status: "alerta", mensagem: `Acesso negado no painel: sem a permissão "${permission}"`, usuario: session.usuario });
    return null;
  }
  return session;
}

/**
 * Middleware: Requer um dos roles especificados
 * @returns Session se tem o role, null caso contrário
 */
export async function requirePainelRole(...roles: PainelRole[]): Promise<PainelSession | null> {
  const session = await getPainelSession();
  if (!session) return null;
  if (!roles.includes(session.role)) {
    await registrarLogSeguranca({ status: "alerta", mensagem: `Acesso negado no painel: papel "${session.role}" sem autorização`, usuario: session.usuario });
    return null;
  }
  return session;
}
