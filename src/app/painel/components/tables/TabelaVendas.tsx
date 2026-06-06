"use client";

import { useState } from "react";
import { dateBR, money, badge, labelStatus, cpf, phone } from "../../utils/formatting";
import { Row } from "../../utils/guest-helpers";
import { Paginacao } from "../common/Paginacao";

export function TabelaVendas({
  vendas,
  data,
  filtros,
  aplicarFiltros,
  limparFiltro,
  sincronizarVendas,
  paginar,
}: {
  vendas: Row[];
  data: any;
  filtros: any;
  aplicarFiltros: any;
  limparFiltro: any;
  sincronizarVendas: any;
  paginar: any;
}) {
  const total = data.vendas?.total || 0;
  const [modal, setModal] = useState<{ titulo: string; texto: string } | null>(null);

  const abrirModal = (titulo: string, texto: unknown) => {
    const conteudo = String(texto || "-");
    if (conteudo && conteudo !== "-") setModal({ titulo, texto: conteudo });
  };

  return (
    <div id="tab-vendas" className="tab-conteudo ativo">
      <div className="painel-header compact">
        <h3 className="painel-subtitulo">Mensagens, Vendas & Pendentes</h3>
      </div>

      <div className="resumo-mini">
        <span className="toolbar-pill">Registros: {total}</span>
        <span className="toolbar-pill">Pendentes: {data.dashboard?.presentes?.qtd_pendente || 0}</span>
        <span className="toolbar-pill">Recebido: {money(data.dashboard?.presentes?.total_vendido || 0)}</span>
      </div>

      <form className="barra-ferramentas barra-ferramentas--mini painel-filtros" onSubmit={aplicarFiltros}>
        <input name="busca_venda" placeholder="Buscar comprador, email, CPF ou referência..." defaultValue={filtros.busca_venda} />
        <select name="status_venda" defaultValue={filtros.status_venda}>
          <option value="">Todos</option>
          <option value="pagos">Pagos</option>
          <option value="pendentes">Pendentes</option>
        </select>
        <button className="toolbar-btn" type="submit">Filtrar</button>
        <button className="toolbar-btn" type="button" onClick={() => limparFiltro(["busca_venda", "status_venda"])}>Limpar</button>
        <button className="toolbar-btn toolbar-btn--primary" type="button" onClick={sincronizarVendas}>Sincronizar Efí</button>
      </form>

      <div className="tabela-container">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Validade Pix</th>
              <th>Quem Comprou</th>
              <th>Mensagem</th>
              <th>Email</th>
              <th>CPF</th>
              <th>Telefone</th>
              <th>CEP</th>
              <th>Nº</th>
              <th>Presentes</th>
              <th>Valor</th>
              <th>Forma</th>
              <th>Status</th>
              <th>Gateway</th>
            </tr>
          </thead>
          <tbody>
            {vendas.length ? vendas.map((v) => {
              const forma = String(v.payment_method || "-").toLowerCase();
              const validadePix = forma === "pix" && v.date_of_expiration ? dateBR(v.date_of_expiration) : "-";
              return (
                <tr key={v.id}>
                  <td data-label="Data" className="cell-date">{dateBR(v.data_compra)}</td>
                  <td data-label="Validade Pix" className="cell-date">{validadePix}</td>
                  <td data-label="Quem Comprou"><strong>{v.nome_comprador}</strong></td>
                  <td data-label="Mensagem" className="cell-message log-nowrap-cell log-message-cell">
                    {v.mensagem ? (
                      <button type="button" className="log-line-preview" onClick={() => abrirModal("Mensagem completa", v.mensagem)} aria-label="Ver mensagem completa">
                        <span className="msg-text">"{v.mensagem}"</span>
                      </button>
                    ) : "-"}
                  </td>
                  <td data-label="Email">{v.email || "-"}</td>
                  <td data-label="CPF">{cpf(v.cpf)}</td>
                  <td data-label="Telefone">{phone(v.telefone)}</td>
                  <td data-label="CEP">{v.cep || "-"}</td>
                  <td data-label="Nº">{v.numero_endereco || "-"}</td>
                  <td data-label="Presentes"><small>{v.itens || "-"}</small></td>
                  <td data-label="Valor">{money(v.valor_total)}</td>
                  <td data-label="Forma">{forma.toUpperCase()}</td>
                  <td data-label="Status"><span className={`status-badge ${badge(v.status)}`}>{labelStatus(v.status)}</span></td>
                  <td data-label="Gateway"><small>{v.gateway_payment_id || v.external_reference || "-"}</small></td>
                </tr>
              );
            }) : <tr><td colSpan={14} className="table-empty">Nenhum presente registrado ainda.</td></tr>}
          </tbody>
        </table>
      </div>

      <Paginacao pagina={Number(filtros.pagina_venda || 1)} total={total} limite={data.vendas?.limite || 10} onChange={(pg: number) => paginar("pagina_venda", pg)} />

      {modal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-venda-title" onClick={() => setModal(null)}>
          <div className="modal-content log-detail-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3 id="modal-venda-title" className="modal-title">{modal.titulo}</h3>
              <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Fechar">×</button>
            </div>
            <p>{modal.texto}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
