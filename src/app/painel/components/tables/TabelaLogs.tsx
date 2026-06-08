"use client";

import { useState } from "react";
import { dateBR, money } from "../../utils/formatting";
import { Row } from "../../utils/guest-helpers";
import { Paginacao } from "../common/Paginacao";

// Rótulo amigável do status do log. Pix não pago aparece como "Expirado"
// (não "erro"); cartão recusado aparece como "Recusado".
function labelLog(tipo: unknown, status: unknown) {
  const s = String(status || "").toLowerCase();
  const t = String(tipo || "").toLowerCase();
  if (["sucesso", "approved", "paid", "received", "confirmed", "received_in_cash"].includes(s)) return "Sucesso";
  if (["pendente", "pending", "in_process"].includes(s)) return "Pendente";
  if (["info", "consulta", "busca"].includes(s)) return "Consulta";
  if (["expirado", "expired"].includes(s)) return "Expirado";
  if (["erro", "rejected", "failed", "refused", "cancelled", "canceled", "overdue", "removida_pelo_psp"].includes(s)) {
    if (t === "cartao" || t === "cartão") return "Recusado"; // cartão recusado
    if (t === "pix" || t === "efi") return "Expirado"; // Pix não pago = expirado
    return "Erro"; // demais tipos (recado, busca, sistema...)
  }
  return String(status || "Pendente");
}

function badgeLog(tipo: unknown, status: unknown) {
  const s = String(status || "").toLowerCase();
  const t = String(tipo || "").toLowerCase();
  if (["sucesso", "approved", "paid", "received", "confirmed", "received_in_cash"].includes(s)) return "confirmado";
  if (["pendente", "pending", "in_process"].includes(s)) return "pendente";
  if (["info", "consulta", "busca"].includes(s)) return "pendente"; // neutro
  if (["expirado", "expired"].includes(s)) return "expirado";
  if (["erro", "rejected", "failed", "refused", "cancelled", "canceled", "overdue", "removida_pelo_psp"].includes(s)) {
    if (t === "cartao" || t === "cartão") return "recusado";
    if (t === "pix" || t === "efi") return "expirado";
    return "recusado"; // erro genérico em vermelho
  }
  return "pendente";
}

export function TabelaLogs({ logs, data, filtros, aplicarFiltros, limparFiltro, api, paginar }: { logs: Row[]; data: any; filtros: any; aplicarFiltros: any; limparFiltro: any; api: any; paginar: any }) {
  const total = data.logs?.total || 0;
  const [modal, setModal] = useState<{ titulo: string; texto: string } | null>(null);

  const abrirModal = (titulo: string, texto: unknown) => {
    const conteudo = String(texto || "-");
    if (conteudo && conteudo !== "-") setModal({ titulo, texto: conteudo });
  };

  return (
    <div id="tab-logs" className="tab-conteudo ativo">
      <div className="painel-header compact"><h3 className="painel-subtitulo">Logs do Site</h3></div>
      <div className="resumo-mini"><span className="toolbar-pill">Logs: {total}</span></div>
      <form className="barra-ferramentas barra-ferramentas--mini painel-filtros" onSubmit={aplicarFiltros}>
        <input name="busca_log" placeholder="Buscar mensagem, email ou referência..." defaultValue={filtros.busca_log} />
        <select name="tipo_log" defaultValue={filtros.tipo_log}>
          <option value="">Todos os tipos</option>
          <option value="pix">Pix</option>
          <option value="cartao">Cartão</option>
          <option value="recado">Recado</option>
          <option value="busca">Busca</option>
          <option value="webhook">Webhook</option>
          <option value="sistema">Sistema</option>
        </select>
        <select name="status_log" defaultValue={filtros.status_log}>
          <option value="">Todos status</option>
          <option value="sucesso">Sucesso</option>
          <option value="pendente">Pendente</option>
          <option value="info">Consulta</option>
          <option value="expirado">Expirado</option>
          <option value="erro">Erro</option>
        </select>
        <button className="toolbar-btn" type="submit">Filtrar</button>
        <button className="toolbar-btn" type="button" onClick={() => limparFiltro(["busca_log", "tipo_log", "status_log"])}>Limpar</button>
        <button className="toolbar-btn toolbar-btn--danger" type="button" onClick={() => confirm("Limpar todos os logs do site?") && api("/api/painel/logs", { method: "DELETE" }, "Logs removidos.")}>Limpar logs</button>
      </form>

      <div className="tabela-container">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Validade Pix</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Mensagem</th>
              <th>Comprador</th>
              <th>Email</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>Itens</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {logs.length ? logs.map((l) => {
              const mensagem = String(l.mensagem || "-");
              const itens = String(l.itens || "-");
              const validadePix = String(l.tipo || "").toLowerCase() === "pix" && l.date_of_expiration ? dateBR(l.date_of_expiration) : "-";
              return (
                <tr key={l.id}>
                  <td data-label="Data">{dateBR(l.created_at)}</td>
                  <td data-label="Validade Pix" className="log-nowrap-cell">{validadePix}</td>
                  <td data-label="Tipo">{l.tipo}</td>
                  <td data-label="Status"><span className={`status-badge ${badgeLog(l.tipo, l.status)}`}>{labelLog(l.tipo, l.status)}</span></td>
                  <td data-label="Mensagem" className="log-nowrap-cell log-message-cell">
                    <button type="button" className="log-line-preview" onClick={() => abrirModal("Mensagem completa", mensagem)} aria-label="Ver mensagem completa">
                      {mensagem}
                    </button>
                  </td>
                  <td data-label="Comprador" className="log-nowrap-cell">{l.nome_comprador || "-"}</td>
                  <td data-label="Email" className="log-nowrap-cell">{l.email || "-"}</td>
                  <td data-label="CPF" className="log-nowrap-cell">{l.cpf || "-"}</td>
                  <td data-label="Telefone" className="log-nowrap-cell">{l.telefone || "-"}</td>
                  <td data-label="Itens" className="log-nowrap-cell log-items-cell">
                    <button type="button" className="log-line-preview" onClick={() => abrirModal("Itens da compra", itens)} aria-label="Ver itens da compra">
                      {itens}
                    </button>
                  </td>
                  <td data-label="Valor" className="log-nowrap-cell">{l.valor ? money(l.valor) : "-"}</td>
                </tr>
              );
            }) : <tr><td colSpan={11} className="table-empty">Nenhum log encontrado.</td></tr>}
          </tbody>
        </table>
      </div>

      <Paginacao pagina={Number(filtros.pagina_log || 1)} total={total} limite={data.logs?.limite || 50} onChange={(pg: number) => paginar("pagina_log", pg)} />

      {modal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-log-title" onClick={() => setModal(null)}>
          <div className="modal-content log-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 id="modal-log-title" className="modal-title">{modal.titulo}</h3>
              <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Fechar">×</button>
            </div>
            <p>{modal.texto}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
