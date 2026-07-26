/**
 * Log de eventos de SEGURANÇA — grava na MESMA tabela `site_logs` que a aba
 * "Logs do Site" do painel já exibe, com `tipo = 'seguranca'`.
 *
 * A ideia é ter um único lugar de logs (pagamentos + segurança) visível no
 * painel que você já usa, em vez de um subsistema de auditoria paralelo. O
 * schema de `site_logs` é criado/mantido por `logPayment` (payment-sales.ts);
 * aqui só inserimos. Se a tabela ainda não existir (banco recém-criado, antes
 * do primeiro pagamento), o INSERT falha e é engolido — log é best-effort e
 * nunca deve quebrar o fluxo que o chamou.
 */

import { execute } from "./db";
import { Security, SafeLog } from "./security";

export type StatusSeguranca = "sucesso" | "erro" | "alerta";

/**
 * Registra um evento de segurança. Best-effort: nunca lança.
 * O IP (quando há request) e o usuário entram na própria mensagem, já que
 * `site_logs` não tem colunas dedicadas para eles.
 */
export async function registrarLogSeguranca(opts: {
  status: StatusSeguranca;
  mensagem: string;
  request?: Request;
  usuario?: string;
}): Promise<void> {
  try {
    const partes = [opts.mensagem];
    if (opts.usuario) partes.push(`usuário "${opts.usuario}"`);
    const ip = opts.request ? Security.clientIp(opts.request) : "";
    if (ip) partes.push(`IP ${ip}`);
    await execute(
      "INSERT INTO site_logs (tipo, status, mensagem) VALUES ('seguranca', ?, ?)",
      [opts.status, partes.join(" · ")],
    );
  } catch (error) {
    SafeLog.error("registrarLogSeguranca", error);
  }
}
