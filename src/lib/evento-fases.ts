/**
 * Fases do evento — o que o bloco do contador exibe na home.
 *
 *   contagem      → contagem regressiva (padrão, antes do casamento começar)
 *   acontecendo   → "o casamento está acontecendo agora"
 *   agradecimento → mensagem de agradecimento, depois que a festa termina
 *
 * Fonte ÚNICA: tabela `rsvp_config` (chaves com prefixo `evento_`), editável na
 * aba "Fases do Evento" do painel. Os DEFAULTS abaixo são só um último recurso
 * caso o banco esteja vazio — não são um ponto de configuração.
 *
 * O modo normal é "auto" (a fase sai do relógio). Os demais forçam uma fase na
 * mão, útil para testar antes ou para corrigir se a cerimônia atrasar.
 */

import { db, queryRows, tableExists } from "./db";

export type FaseEvento = "contagem" | "acontecendo" | "agradecimento" | "encerrado";
export type ModoFase = "auto" | FaseEvento;

export type EventoConfig = {
  modo: ModoFase;
  /** Quando a contagem termina e vira "acontecendo" (horário de Brasília). */
  inicio: string;
  /** Quando "acontecendo" termina e vira "agradecimento" (horário de Brasília). */
  fim: string;
  /** Quando o site INTEIRO passa a ser só a página de agradecimento. */
  encerramento: string;
  acontecendoTitulo: string;
  acontecendoMensagem: string;
  agradecimentoTitulo: string;
  agradecimentoMensagem: string;
};

const MODOS: ReadonlySet<string> = new Set(["auto", "contagem", "acontecendo", "agradecimento", "encerrado"]);

export const EVENTO_DEFAULTS: EventoConfig = {
  modo: "auto",
  inicio: "2026-08-16T15:30",
  fim: "2026-08-17T00:00",
  encerramento: "2026-08-18T00:00",
  acontecendoTitulo: "É hoje!",
  acontecendoMensagem: "Estamos celebrando neste momento. Obrigado por fazer parte deste dia com a gente.",
  agradecimentoTitulo: "Obrigado por celebrar conosco",
  agradecimentoMensagem: "Cada abraço, cada sorriso e cada presença tornaram esse dia inesquecível. Muito obrigado!",
};

/** Mapeia campo do objeto <-> chave na tabela rsvp_config. */
const CHAVES: Record<keyof EventoConfig, string> = {
  modo: "evento_modo",
  inicio: "evento_inicio",
  fim: "evento_fim",
  encerramento: "evento_encerramento",
  acontecendoTitulo: "evento_acontecendo_titulo",
  acontecendoMensagem: "evento_acontecendo_mensagem",
  agradecimentoTitulo: "evento_agradecimento_titulo",
  agradecimentoMensagem: "evento_agradecimento_mensagem",
};

/**
 * Interpreta "2026-08-16T15:30" como horário de Brasília (-03:00).
 *
 * Sem isso, o Node no servidor (que roda em UTC) leria como 15:30 UTC — 3 horas
 * adiantado. Mesma regra do `normalizarDataIsoParaSP` em public/js/utils/date-utils.js.
 */
export function parseDataSP(valor: string): Date | null {
  const texto = String(valor || "").trim();
  if (!texto) return null;
  // Já traz fuso explícito ("Z" ou "+/-HH:MM")? Respeita o que veio.
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(texto)) {
    const comFuso = new Date(texto);
    return Number.isNaN(comFuso.getTime()) ? null : comFuso;
  }
  let base = texto.replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(base)) base = `${base}T00:00`;
  // O <input type="datetime-local"> manda "AAAA-MM-DDTHH:MM" (sem segundos).
  if (/T\d{2}:\d{2}$/.test(base)) base = `${base}:00`;
  const data = new Date(`${base}-03:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** Fase vigente. Com modo != "auto", devolve a fase forçada sem olhar o relógio. */
export function calcularFase(config: EventoConfig, agora: Date = new Date()): FaseEvento {
  if (config.modo !== "auto") return config.modo;

  const inicio = parseDataSP(config.inicio);
  const fim = parseDataSP(config.fim);
  // Datas inválidas não podem "sumir" com o contador: caímos na fase segura.
  if (!inicio || !fim) return "contagem";

  const ms = agora.getTime();
  if (ms < inicio.getTime()) return "contagem";
  if (ms < fim.getTime()) return "acontecendo";

  // Encerramento é opcional: sem data válida, o site fica em "agradecimento"
  // (bloco do hero) indefinidamente, sem nunca esconder as demais seções.
  const encerramento = parseDataSP(config.encerramento);
  if (encerramento && ms >= encerramento.getTime()) return "encerrado";
  return "agradecimento";
}

export async function getEventoConfig(): Promise<EventoConfig> {
  const config: EventoConfig = { ...EVENTO_DEFAULTS };
  if (!(await tableExists("rsvp_config").catch(() => false))) return config;

  const chaves = Object.values(CHAVES);
  const marcadores = chaves.map(() => "?").join(", ");
  const linhas = await queryRows<{ chave: string; valor: string }>(
    `SELECT chave, valor FROM rsvp_config WHERE chave IN (${marcadores})`,
    chaves,
  ).catch(() => []);

  const porChave = new Map(linhas.map((l) => [String(l.chave), String(l.valor ?? "")]));
  for (const [campo, chave] of Object.entries(CHAVES) as [keyof EventoConfig, string][]) {
    const valor = porChave.get(chave);
    if (valor === undefined || valor === "") continue;
    if (campo === "modo") {
      if (MODOS.has(valor)) config.modo = valor as ModoFase;
      continue;
    }
    config[campo] = valor;
  }
  return config;
}

export async function setEventoConfig(parcial: Partial<EventoConfig>): Promise<EventoConfig> {
  await db()
    .execute(
      `CREATE TABLE IF NOT EXISTS rsvp_config (
        chave VARCHAR(120) NOT NULL PRIMARY KEY,
        valor TEXT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    )
    .catch(() => undefined);

  for (const [campo, chave] of Object.entries(CHAVES) as [keyof EventoConfig, string][]) {
    const valor = parcial[campo];
    if (valor === undefined) continue;
    await db().execute(
      "INSERT INTO rsvp_config (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
      [chave, String(valor)],
    );
  }
  return getEventoConfig();
}

/** Valida o que veio do painel. Devolve os campos aceitos e os erros encontrados. */
export function validarEventoConfig(body: Record<string, unknown>): {
  dados: Partial<EventoConfig>;
  erros: string[];
} {
  const dados: Partial<EventoConfig> = {};
  const erros: string[] = [];

  if (body.modo !== undefined) {
    const modo = String(body.modo);
    if (!MODOS.has(modo)) erros.push("Modo inválido.");
    else dados.modo = modo as ModoFase;
  }

  const rotulos = { inicio: "início", fim: "término", encerramento: "encerramento" } as const;
  for (const campo of ["inicio", "fim", "encerramento"] as const) {
    if (body[campo] === undefined) continue;
    const valor = String(body[campo]).trim();
    if (!parseDataSP(valor)) erros.push(`Data de ${rotulos[campo]} inválida.`);
    else dados[campo] = valor;
  }

  // Só compara quando as datas estão presentes e válidas.
  const inicio = dados.inicio ? parseDataSP(dados.inicio) : null;
  const fim = dados.fim ? parseDataSP(dados.fim) : null;
  const encerramento = dados.encerramento ? parseDataSP(dados.encerramento) : null;
  if (inicio && fim && fim.getTime() <= inicio.getTime()) {
    erros.push("O término deve ser depois do início.");
  }
  if (fim && encerramento && encerramento.getTime() <= fim.getTime()) {
    erros.push("O encerramento deve ser depois do término.");
  }

  const textos = [
    "acontecendoTitulo",
    "acontecendoMensagem",
    "agradecimentoTitulo",
    "agradecimentoMensagem",
  ] as const;
  for (const campo of textos) {
    if (body[campo] === undefined) continue;
    const valor = String(body[campo]).trim().slice(0, 600);
    if (!valor) erros.push("Os textos não podem ficar vazios.");
    else dados[campo] = valor;
  }

  return { dados, erros };
}
