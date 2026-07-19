/**
 * Valor do cartão postal (adicional opcional no checkout).
 *
 * Fonte ÚNICA: tabela `rsvp_config` (chave='cartao_valor'), editável no painel.
 * Não usa .env nem variável de ambiente. O DEFAULT abaixo é só um último recurso
 * de segurança caso o banco esteja vazio/indisponível (não é um ponto de configuração).
 */

import { db, queryOne, tableExists } from "./db";

const DEFAULT_CARTAO_VALOR = 10;

/** Converte "21,90" / "R$ 21.90" / 21.9 em número (2 casas). NaN se inválido/vazio. */
export function parseCartaoValor(value: unknown): number {
  const s = String(value ?? "").replace(/[R$\s]/g, "").replace(",", ".").trim();
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : NaN;
}

export async function getCartaoValor(): Promise<number> {
  // Fonte única: banco (editável no painel). Sem fallback de env/variável de ambiente.
  if (await tableExists("rsvp_config")) {
    const row = await queryOne<{ valor: string }>("SELECT valor FROM rsvp_config WHERE chave = 'cartao_valor' LIMIT 1");
    const fromDb = parseCartaoValor(row?.valor);
    if (Number.isFinite(fromDb)) return fromDb;
  }
  // Último recurso (só se o banco estiver vazio/indisponível).
  return DEFAULT_CARTAO_VALOR;
}

export async function setCartaoValor(value: number): Promise<void> {
  await db()
    .execute(
      `CREATE TABLE IF NOT EXISTS rsvp_config (
        chave VARCHAR(120) NOT NULL PRIMARY KEY,
        valor TEXT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    )
    .catch(() => undefined);
  await db().execute(
    "INSERT INTO rsvp_config (chave, valor) VALUES ('cartao_valor', ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
    [value.toFixed(2)],
  );
}
