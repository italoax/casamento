"use client";

import { dateBR, badge } from "../../utils/formatting";
import { Row } from "../../utils/guest-helpers";

export function TabelaRecados({ recados, api }: { recados: Row[]; api: any }) {
  return <div id="tab-recados" className="tab-conteudo ativo"><div className="painel-header compact"><h3 className="painel-subtitulo">Recados</h3></div><div className="tabela-container"><table><thead><tr><th>Data</th><th>Nome</th><th>Email</th><th>Mensagem</th><th>Status</th><th>Ações</th></tr></thead><tbody>{recados.length ? recados.map((r) => <tr key={r.id}><td data-label="Data">{dateBR(r.created_at)}</td><td data-label="Nome">{r.nome}</td><td data-label="Email">{r.email || "-"}</td><td data-label="Mensagem">{r.mensagem}</td><td data-label="Status"><span className={`status-badge ${badge(r.aprovado)}`}>{Number(r.aprovado) ? "Aprovado" : "Pendente"}</span></td><td data-label="Ações"><div className="acoes-btn"><button className="btn-acao btn-edit" onClick={() => api("/api/painel/recados", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, acao: "aprovar" }) }, "Recado aprovado.")}>✓</button><button className="btn-acao btn-trash" onClick={() => confirm("Remover recado?") && api("/api/painel/recados", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, acao: "remover" }) }, "Recado removido.")}>×</button></div></td></tr>) : <tr><td colSpan={6} className="table-empty">Nenhum recado encontrado.</td></tr>}</tbody></table></div></div>;
}
