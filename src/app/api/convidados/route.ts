import { SignJWT, jwtVerify } from "jose";
import { db, queryOne, queryRows, columnExists, tableExists } from "@/lib/db";
import { json, errorJson, cleanText, clientIp } from "@/lib/http";
import { env } from "@/lib/env";
import { logPayment } from "@/lib/payment";
import { Security, SafeLog } from "@/lib/security";
import { enviarAvisoAdminRsvp, enviarConfirmacaoPresenca } from "@/lib/site-emails";

export const runtime = "nodejs";

type Convidado = Record<string, unknown> & {
  id: number;
  nome: string;
  telefone?: string;
  convites_disponiveis?: number;
  visibilidade?: string;
};

type Attempt = { count: number; resetAt: number; lockedUntil: number };
const rsvpAttempts = new Map<string, Attempt>();
const RSVP_WINDOW_MS = 15 * 60 * 1000;
const RSVP_LOCK_MS = 15 * 60 * 1000;
const RSVP_MAX_ATTEMPTS = 5;

function getRsvpSecret() {
  const value = env("RSVP_TOKEN_SECRET");
  const insecurePatterns = [
    /^(.)\1+$/,
    /^(0123|1234|abc)/i,
    /dev|test|troque|change/i,
    /password|secret|token/i,
    /^123|^000|^111/,
  ];

  if (!value || value.length < 64 || insecurePatterns.some((pattern) => pattern.test(value))) {
    SafeLog.error("RSVP", "RSVP_TOKEN_SECRET ausente ou fraca");
    throw new Error("Configuração de segurança ausente");
  }
  return new TextEncoder().encode(value);
}

function rsvpRateKey(request: Request, id: number) {
  return `${clientIp(request) || "unknown"}:${id}`;
}

function checkRsvpRateLimit(request: Request, id: number) {
  const now = Date.now();
  const key = rsvpRateKey(request, id);
  const current = rsvpAttempts.get(key);
  if (!current) return true;
  if (current.lockedUntil > now) return false;
  if (current.resetAt <= now) rsvpAttempts.delete(key);
  return true;
}

function registerRsvpFailure(request: Request, id: number) {
  const now = Date.now();
  const key = rsvpRateKey(request, id);
  const current = rsvpAttempts.get(key);
  const next: Attempt = current && current.resetAt > now
    ? { ...current, count: current.count + 1 }
    : { count: 1, resetAt: now + RSVP_WINDOW_MS, lockedUntil: 0 };
  if (next.count >= RSVP_MAX_ATTEMPTS) next.lockedUntil = now + RSVP_LOCK_MS;
  rsvpAttempts.set(key, next);
}

function clearRsvpFailures(request: Request, id: number) {
  rsvpAttempts.delete(rsvpRateKey(request, id));
}

/**
 * Debounce do log de busca por IP.
 *
 * Com a busca ao vivo, cada pausa na digitação vira uma consulta. Para não
 * poluir a aba "Logs" com termos parciais ("mar", "maria", "maria santos"),
 * só gravamos a ÚLTIMA busca de cada sequência: ao receber uma busca, agendamos
 * o log; se chegar outra do mesmo IP dentro da janela, cancelamos e reagendamos.
 * Estado em memória (servidor único na Hostinger), igual ao rate-limit acima.
 */
type PendingSearchLog = {
  timer: ReturnType<typeof setTimeout>;
  nome: string;
  resultados: number;
  itens: string;
  userAgent: string | null;
  referer: string | null;
};
const pendingSearchLogs = new Map<string, PendingSearchLog>();
const SEARCH_LOG_DEBOUNCE_MS = 4000;

function scheduleSearchLog(ip: string, data: Omit<PendingSearchLog, "timer">) {
  const existing = pendingSearchLogs.get(ip);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    const pend = pendingSearchLogs.get(ip);
    pendingSearchLogs.delete(ip);
    if (!pend) return;
    void logPayment({
      tipo: "busca",
      status: "info",
      mensagem: `Busca na lista de convidados: "${pend.nome}" · ${pend.resultados} resultado(s) · IP ${ip}`,
      nome_comprador: pend.nome,
      itens: pend.itens || "Nenhum resultado",
      payload: {
        termo: pend.nome,
        resultados: pend.resultados,
        ip,
        userAgent: pend.userAgent,
        referer: pend.referer,
      },
    }).catch(() => undefined);
  }, SEARCH_LOG_DEBOUNCE_MS);
  pendingSearchLogs.set(ip, { timer, ...data });
}

function maskPhone(phone: unknown) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 2) return null;
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  const first = rest.slice(0, 5).padEnd(5, "X");
  return `(${ddd}) ${first}-XXXX`;
}

/**
 * Escape caracteres especiais do LIKE para prevenir SQL injection avançada
 */
function escapeLikeTerm(term: string): string {
  return term.replace(/[%_\\]/g, "\\$&");
}

function publicConvidado(c: Convidado) {
  return {
    id: Number(c.id),
    nome: String(c.nome || ""),
    status: String(c.status || ""),
    convites_disponiveis: Number(c.convites_disponiveis || 0),
    telefone: maskPhone(c.telefone) || undefined,
  };
}

async function hasVisibility() {
  return columnExists("convidados", "visibilidade").catch(() => false);
}

function parseRsvpDeadline(value: string) {
  const raw = value.trim();
  const normalized = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(raw)
    ? `${raw.replace(" ", "T")}Z`
    : raw;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRsvpDeadline(date: Date) {
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(",", "");
}

async function getRsvpStatus() {
  if (!(await tableExists("rsvp_config").catch(() => false))) {
    return { encerrado: false, aberto: true, data_limite: null, data_limite_texto: null, mensagem: null };
  }
  const row = await queryOne<{ valor: string }>("SELECT valor FROM rsvp_config WHERE chave = 'rsvp_deadline_utc' LIMIT 1");
  const dataLimite = typeof row?.valor === "string" && row.valor.trim() ? row.valor.trim() : null;
  if (!dataLimite) {
    return { encerrado: false, aberto: true, data_limite: null, data_limite_texto: null, mensagem: null };
  }
  const deadline = parseRsvpDeadline(dataLimite);
  if (!deadline) {
    return { encerrado: false, aberto: true, data_limite: null, data_limite_texto: null, mensagem: null };
  }
  const texto = formatRsvpDeadline(deadline);
  const encerrado = Date.now() > deadline.getTime();
  return {
    encerrado,
    aberto: !encerrado,
    data_limite: deadline.toISOString(),
    data_limite_texto: texto,
    mensagem: encerrado ? "As confirmações de presença foram encerradas." : null,
  };
}

async function createToken(id: number) {
  return new SignJWT({ id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getRsvpSecret());
}

async function verifyToken(token: string, id: number) {
  try {
    const { payload } = await jwtVerify(token, getRsvpSecret());
    return Number(payload.id) === id;
  } catch {
    return false;
  }
}

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

  try {
    const url = new URL(request.url);
    const acao = url.searchParams.get("acao") || "";

    if (acao === "status") {
      return json({ sucesso: true, ...(await getRsvpStatus()) }, { headers: corsHeaders });
    }

    const rsvpStatus = await getRsvpStatus();
    if (rsvpStatus.encerrado) {
      return json({ erro: rsvpStatus.mensagem, ...rsvpStatus }, { headers: corsHeaders });
    }

    if (acao === "buscar") {
      const nome = cleanText(url.searchParams.get("nome"), 80);
      // Aceita letras, espaços e os sinais comuns em nomes (apóstrofo e hífen),
      // ex.: "Sant'Ana", "Ana-Júlia".
      if (nome.length < 3 || !/^[\p{L}\s'-]+$/u.test(nome)) return json({ erro: "Nome inválido." }, { headers: corsHeaders });
      const visibility = await hasVisibility();
      const whereVisibility = visibility ? " AND (visibilidade IS NULL OR visibilidade = '' OR visibilidade = 'disponivel')" : "";

      // Busca por PONTUAÇÃO no NOME DO CONVITE apenas: cada palavra digitada vale
      // 1 ponto se aparecer no nome do convite. Somamos os pontos e trazemos
      // primeiro quem mais bateu, em vez de exigir que TODAS as palavras apareçam
      // (o antigo AND dava "zero" quando uma palavra a mais, um sobrenome, não
      // batia). Assim "Lazaro Rivera Valido" ainda encontra "Lázaro Rivera" (2 de
      // 3 palavras). NÃO casa mais com a lista de acompanhantes (nomes_lista): a
      // busca é só pelo título do convite. Limita a 4 palavras para não montar uma
      // query gigante; cada termo é escapado para o LIKE e a query é parametrizada.
      const palavras = nome.split(/\s+/).map((p) => p.trim()).filter((p) => p.length > 0).slice(0, 4);
      const termos = palavras.length > 0 ? palavras : [nome];
      // Uma parcela por palavra: bate no nome do convite → 1, senão 0.
      const scoreExpr = termos
        .map(() => "(nome LIKE ? ESCAPE '\\\\')")
        .join(" + ");
      const params = termos.map((p) => `%${escapeLikeTerm(p)}%`);
      const convidados = await queryRows<Convidado>(
        `SELECT id, nome, status, convites_disponiveis, telefone, (${scoreExpr}) AS score
           FROM convidados
          WHERE 1=1${whereVisibility}
         HAVING score > 0
          ORDER BY score DESC, nome ASC
          LIMIT 10`,
        params,
      );

      // Registra a busca nos logs do painel (agrupando termos parciais da mesma
      // digitação: só a última busca de cada sequência por IP é gravada).
      const ipBusca = Security.clientIp(request);
      scheduleSearchLog(ipBusca, {
        nome,
        resultados: convidados.length,
        itens: convidados.map((c) => String(c.nome)).join(", "),
        userAgent: request.headers.get("user-agent") || null,
        referer: request.headers.get("referer") || null,
      });

      return json(convidados.map(publicConvidado), { headers: corsHeaders });
    }

    if (acao === "validar") {
      const id = Number(url.searchParams.get("id") || 0);
      const digitos = String(url.searchParams.get("digitos") || "").replace(/\D/g, "");
      if (!id || digitos.length !== 4) return json({ erro: "Dados inválidos." }, { headers: corsHeaders });
      if (!checkRsvpRateLimit(request, id)) return json({ erro: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429, headers: corsHeaders });
      const convidado = await queryOne<Convidado>("SELECT id, nome, status, convites_disponiveis, telefone, visibilidade, nomes_lista FROM convidados WHERE id = ?", [id]);
      if (!convidado) return json({ erro: "Convite não encontrado." }, { headers: corsHeaders });
      if ((convidado.visibilidade || "") === "oculto") return json({ erro: "Convite indisponível." }, { headers: corsHeaders });
      const phoneDigits = String(convidado.telefone || "").replace(/\D/g, "");
      if (phoneDigits.slice(-4) !== digitos) {
        registerRsvpFailure(request, id);
        return json({ erro: "Os dígitos não conferem. Tente novamente." }, { headers: corsHeaders });
      }
      clearRsvpFailures(request, id);
      const token = await createToken(id);
      // nomes_lista só é liberado após validar o telefone (não na busca pública),
      // pois é usado para pré-preencher os nomes dos convidados no formulário.
      return json({ sucesso: true, dados: { ...publicConvidado(convidado), nomes_lista: String(convidado.nomes_lista || "") }, token }, { headers: corsHeaders });
    }

    return errorJson("ação inválida.", 400, { headers: corsHeaders });
  } catch (error) {
    SafeLog.error("GET /api/convidados", error);
    return errorJson("Falha temporária na confirmação de presença.", 500, { headers: corsHeaders });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);

  if (!Security.isAllowedOrigin(origin, request.url)) {
    return errorJson("Origem não autorizada.", 403, { headers: corsHeaders });
  }

  try {
    const ip = Security.clientIp(request);
    if (!Security.checkRateLimit(`POST:convidados:${ip}`, 10, 300)) {
      return errorJson("Muitas confirmações. Aguarde alguns minutos.", 429, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const acao = url.searchParams.get("acao") || "";
    if (acao !== "confirmar") return errorJson("ação inválida.", 400, { headers: corsHeaders });

    const rsvpStatus = await getRsvpStatus();
    if (rsvpStatus.encerrado) {
      return json({ erro: rsvpStatus.mensagem, ...rsvpStatus }, { headers: corsHeaders });
    }

    const data = await request.json().catch(() => ({}));
    const id = Number(data.id || 0);
    const token = String(data.token || "");
    const qtd = Number(data.qtd || 0);
    const nomes = cleanText(data.nomes_confirmados, 2000);
    const email = cleanText(data.email, 160);

    if (!id || qtd <= 0) return json({ erro: "ID inválido" }, { headers: corsHeaders });
    if (!(await verifyToken(token, id))) return json({ erro: "Validação expirada. Refaça a validação do telefone." }, { headers: corsHeaders });

    const visibility = await hasVisibility();
    const convidado = await queryOne<Convidado>("SELECT nome, convites_disponiveis, visibilidade FROM convidados WHERE id = ?", [id]);
    if (!convidado) return json({ erro: "Convite não encontrado." }, { headers: corsHeaders });
    if (visibility && convidado.visibilidade === "oculto") return json({ erro: "Convite indisponível." }, { headers: corsHeaders });
    const limite = Number(convidado.convites_disponiveis || 0);
    if (limite >= 0 && qtd > limite) return json({ erro: "Quantidade acima do limite do convite." }, { headers: corsHeaders });

    const whereVisibility = visibility ? " AND (visibilidade IS NULL OR visibilidade = '' OR visibilidade = 'disponivel')" : "";
    await db().execute(
      `UPDATE convidados SET status = 'confirmado', convites_confirmados = ?, nomes_confirmados = ? WHERE id = ?${whereVisibility}`,
      [qtd, nomes, id],
    );
    const observacoes = cleanText(data.observacoes || data.resumo?.observacoes, 600);
    if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && await columnExists("convidados", "email")) {
      await db().execute("UPDATE convidados SET email = ? WHERE id = ?", [email, id]);
      // Aguardamos o envio (sendSafe já trata erros internamente) para garantir que
      // o e-mail seja realmente disparado antes de responder — sem fire-and-forget.
      await enviarConfirmacaoPresenca({
        email,
        nomeConvite: String(convidado.nome || "Convidado"),
        qtd,
        nomesConfirmados: nomes,
        observacoes,
      });
    }
    await enviarAvisoAdminRsvp({
      email,
      nomeConvite: String(convidado.nome || "Convidado"),
      qtd,
      nomesConfirmados: nomes,
      observacoes,
    });
    // Registra no painel (aba Logs) que o convite confirmou presença.
    void logPayment({
      tipo: "confirmacao",
      status: "sucesso",
      mensagem: `Confirmação de presença: "${convidado.nome}" · ${qtd} lugar(es) confirmado(s)`,
      nome_comprador: String(convidado.nome || "Convidado"),
      email: email || null,
      itens: nomes || `${qtd} lugar(es) confirmado(s)`,
      payload: { convidadoId: id, qtd, nomesConfirmados: nomes, observacoes },
    }).catch(() => undefined);
    return json({ sucesso: true }, { headers: corsHeaders });
  } catch (error) {
    SafeLog.error("POST /api/convidados", error);
    return errorJson("Falha temporária ao confirmar presença.", 500, { headers: corsHeaders });
  }
}
