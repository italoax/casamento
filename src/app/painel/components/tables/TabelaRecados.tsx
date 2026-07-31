"use client";

import { useState } from "react";
import { dateBR, badge } from "../../utils/formatting";
import { Row } from "../../utils/guest-helpers";

const URL_RECADOS = "/api/painel/recados";
const HEADERS_JSON = { "Content-Type": "application/json" };

export function TabelaRecados({ recados, api }: { recados: Row[]; api: any }) {
  const [editId, setEditId] = useState<number | null>(null);
  const [nomeEdit, setNomeEdit] = useState("");
  const [msgEdit, setMsgEdit] = useState("");

  function iniciarEdicao(r: Row) {
    setEditId(Number(r.id));
    setNomeEdit(String(r.nome || ""));
    setMsgEdit(String(r.mensagem || ""));
  }

  async function salvarEdicao(id: number) {
    const ok = await api(URL_RECADOS, { method: "POST", headers: HEADERS_JSON, body: JSON.stringify({ id, acao: "editar", nome: nomeEdit, mensagem: msgEdit }) }, "Recado atualizado.");
    if (ok) setEditId(null);
  }

  function aprovar(id: number) {
    api(URL_RECADOS, { method: "POST", headers: HEADERS_JSON, body: JSON.stringify({ id, acao: "aprovar" }) }, "Recado aprovado.");
  }

  function alternarVisibilidade(r: Row) {
    const visivel = Number(r.visivel) ? 0 : 1;
    api(URL_RECADOS, { method: "POST", headers: HEADERS_JSON, body: JSON.stringify({ id: r.id, acao: "visibilidade", visivel }) }, visivel ? "Recado visível no site." : "Recado oculto do site.");
  }

  function remover(id: number) {
    if (confirm("Remover recado?")) api(URL_RECADOS, { method: "POST", headers: HEADERS_JSON, body: JSON.stringify({ id, acao: "remover" }) }, "Recado removido.");
  }

  return (
    <div id="tab-recados" className="tab-conteudo ativo">
      <div className="painel-header compact"><h3 className="painel-subtitulo">Recados</h3></div>
      <div className="tabela-container">
        <table>
          <thead>
            <tr><th>Data</th><th>Nome</th><th>Email</th><th>Mensagem</th><th>Status</th><th>No site</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {recados.length ? recados.map((r) => {
              const emEdicao = editId === Number(r.id);
              const aprovado = Number(r.aprovado);
              const visivel = Number(r.visivel);
              return (
                <tr key={r.id}>
                  <td data-label="Data">{dateBR(r.created_at)}</td>
                  <td data-label="Nome">{emEdicao ? <input className="nome-dinamico" value={nomeEdit} onChange={(e) => setNomeEdit(e.target.value)} /> : r.nome}</td>
                  <td data-label="Email">{r.email || "-"}</td>
                  <td data-label="Mensagem">{emEdicao ? <textarea className="nome-dinamico" rows={4} style={{ width: "100%", resize: "vertical" }} value={msgEdit} onChange={(e) => setMsgEdit(e.target.value)} maxLength={600} /> : r.mensagem}</td>
                  <td data-label="Status"><span className={`status-badge ${badge(r.aprovado)}`}>{aprovado ? "Aprovado" : "Pendente"}</span></td>
                  <td data-label="No site">
                    {aprovado ? (
                      <button type="button" className={`status-badge ${visivel ? "confirmado" : "oculto-badge"}`} style={{ border: 0, cursor: "pointer" }} title={visivel ? "Clique para ocultar do site" : "Clique para mostrar no site"} onClick={() => alternarVisibilidade(r)}>
                        {visivel ? "Visível" : "Oculto"}
                      </button>
                    ) : <span className="status-badge oculto-badge">-</span>}
                  </td>
                  <td data-label="Ações">
                    <div className="acoes-btn">
                      {emEdicao ? (
                        <>
                          <button className="btn-acao btn-whatsapp" title="Salvar" onClick={() => salvarEdicao(Number(r.id))}>✓</button>
                          <button className="btn-acao btn-trash" title="Cancelar" onClick={() => setEditId(null)}>×</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-acao btn-edit" title="Editar" onClick={() => iniciarEdicao(r)}>✎</button>
                          {aprovado ? null : <button className="btn-acao btn-whatsapp" title="Aprovar" onClick={() => aprovar(Number(r.id))}>✓</button>}
                          <button className="btn-acao btn-trash" title="Remover" onClick={() => remover(Number(r.id))}>×</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }) : <tr><td colSpan={7} className="table-empty">Nenhum recado encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
