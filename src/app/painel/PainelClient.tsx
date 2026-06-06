"use client";

import { useMemo, useState } from "react";
import { ConvidadoModal } from "./components/modals/ConvidadoModal";
import { PresenteModal } from "./components/modals/PresenteModal";
import { TabelaVendas } from "./components/tables/TabelaVendas";
import { TabelaRecados } from "./components/tables/TabelaRecados";
import { TabelaLogs } from "./components/tables/TabelaLogs";
import { Rsvp } from "./components/Rsvp";
import { Input } from "./components/common/Input";
import { Paginacao } from "./components/common/Paginacao";
import { Modal } from "./components/common/Modal";
import { WhatsAppIcon } from "./components/icons/WhatsAppIcon";
import { badge, imagemPresente, labelStatus, money, phone, whatsappUrl } from "./utils/formatting";
import { contarIdades } from "./utils/guest-helpers";
import type { PainelData, Row } from "./_types";

function nomeBonitoDeArquivoPresente(valor: unknown) {
  const raw = String(valor || "").trim();
  if (!raw) return "Presente";
  const arquivo = raw.split(/[\\/]/).pop() || raw;
  const semExtensao = arquivo.replace(/\.(jpe?g|png|webp|gif)$/i, "");
  const limpo = semExtensao
    .replace(/-?\d{10,}$/g, "")
    .replace(/_[a-z]{2}(?:_[a-z0-9]+)+/gi, " ")
    .replace(/\b(?:ac|sl|ul|sx|sy|sr|uf|fmwebp|ql\d+|ss\d+|v1|v2)\b/gi, " ")
    .replace(/\b\d{3,5}\b/g, " ")
    .replace(/^[a-z0-9]{6,}\b[\s_-]*/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!limpo || limpo.length < 3) return "Presente";
  return limpo.toLowerCase().replace(/\b([a-záàâãéèêíïóôõöúçñ])/gi, letra => letra.toUpperCase());
}

function nomePresenteExibicao(presente: Row) {
  const nome = String(presente.nome || "").trim();
  const pareceArquivo = /\.(jpe?g|png|webp|gif)$/i.test(nome) || /[_-]\d{10,}(?:\.(?:jpe?g|png|webp|gif))?$/i.test(nome) || /_(?:AC|SL|UL|SX|SY|SR)_/i.test(nome);
  if (nome && !pareceArquivo) return nome;
  return nomeBonitoDeArquivoPresente(nome || presente.imagem_thumb || presente.imagem);
}

export default function PainelClient({ initialData }: { initialData: PainelData }) {
  const [aba, setAba] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState(initialData);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<null | { tipo: "convidado" | "presente"; row?: Row }>(null);
  const [filtros, setFiltros] = useState({ busca: "", ordem: "recentes", pagina: "1", busca_presente: "", ordem_presente: "recentes", busca_venda: "", status_venda: "", pagina_venda: "1", busca_log: "", tipo_log: "", status_log: "", pagina_log: "1" });

  const dashboard = data.dashboard || {};
  const convidados = data.convidados?.rows || [];
  const presentes = data.presentes || [];
  const vendas = data.vendas?.rows || [];
  const recados = data.recados || [];
  const logs = data.logs?.rows || [];
  const taxaAtual = Number(dashboard.presentes?.taxa_atual || 0);

  const totalLista = useMemo(() => presentes.reduce((sum, p) => sum + Number(p.preco || 0), 0), [presentes]);

  async function refresh(nextFiltros = filtros) {
    const params = new URLSearchParams(nextFiltros as Record<string, string>);
    const res = await fetch(`/api/painel/data?${params.toString()}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }

  async function aplicarFiltros(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    const merged = { ...filtros, ...next };
    setFiltros(merged);
    await refresh(merged);
  }

  function limparFiltro(chaves: string[]) {
    const next = { ...filtros } as Record<string, string>;
    chaves.forEach((key) => { next[key] = ""; });
    setFiltros(next as typeof filtros);
    void refresh(next as typeof filtros);
  }

  async function api(url: string, init: RequestInit, ok = "Salvo com sucesso.") {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setToast(body.erro || "Não foi possível executar a ação.");
      return false;
    }
    setToast(ok);
    await refresh();
    return true;
  }

  async function salvarConvidado(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const ok = await api("/api/painel/convidados", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (ok) setModal(null);
  }

  async function salvarPresente(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const ok = await api("/api/painel/presentes", { method: "POST", body: formData });
    if (ok) setModal(null);
  }

  async function sincronizarVendas() {
    await api("/api/painel/vendas/sync", { method: "POST" }, "Vendas sincronizadas.");
  }

  async function salvarTaxa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    await api("/api/painel/presentes/taxa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, "Taxa aplicada.");
  }

  function exportarConvidados() {
    const params = new URLSearchParams({ busca: filtros.busca, ordem: filtros.ordem });
    window.open(`/api/painel/export/convidados?${params.toString()}`, "_blank");
  }

  function paginar(chave: "pagina" | "pagina_venda" | "pagina_log", pagina: number) {
    const next = { ...filtros, [chave]: String(Math.max(1, pagina)) };
    setFiltros(next);
    void refresh(next);
  }

  async function sair() {
    await fetch("/api/painel/logout", { method: "POST" });
    window.location.href = "/painel/login";
  }

  function trocarAba(key: string) {
    setAba(key);
    setSidebarOpen(false);
  }

  const nav = [
    ["dashboard", "Dashboard Geral"],
    ["convidados", "Lista de Convidados"],
    ["presentes", "Lista de Presentes"],
    ["vendas", "Mensagens, Vendas & Pendentes"],
    ["recados", "Recados do Site"],
    ["logs", "Logs do Site"],
    ["confirmacao", "Configuração RSVP"],
  ];

  return (
    <div className="painel-container painel-next">
      {toast ? <div className={`toast ${toast.includes("Não") ? "erro" : "sucesso"}`} onAnimationEnd={() => setToast("")}>{toast}</div> : null}
      <div className="painel-header">
        <div className="header-mobile-top">
          <h2 className="painel-titulo">Painel do Noivo</h2>
          <button type="button" className="btn-menu-mobile" aria-label="Abrir menu do painel" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>☰</button>
        </div>
        <button type="button" className="toolbar-btn btn-logout" onClick={sair}>Sair</button>
      </div>
      <button type="button" className={`overlay-sidebar ${sidebarOpen ? "aberto" : ""}`} aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} />

      <div className="painel-body">
        <aside className={`sidebar ${sidebarOpen ? "aberto" : ""}`}>
          <div className="sidebar-header"><div className="sidebar-title-row"><span className="sidebar-title">Painel do Noivo</span><button type="button" className="sidebar-close" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)}>×</button></div><small>{data.session?.usuario}</small></div>
          {nav.map(([key, label]) => <button key={key} className={`sidebar-btn ${aba === key ? "ativo" : ""}`} onClick={() => trocarAba(key)}>{label}</button>)}
          <button className="sidebar-btn" onClick={sair}>Sair</button>
        </aside>

        <main className="conteudo-principal">
          {aba === "dashboard" ? <div id="tab-dashboard" className="tab-conteudo ativo">
            <div className="painel-header compact"><h3 className="painel-subtitulo">Resumo de Convidados</h3></div>
            <div className="resumo-grid">
              <div className="card-info"><h3>{dashboard.convidados?.total_grupos || 0}</h3><p>Grupos/Famílias</p></div>
              <div className="card-info"><h3>{dashboard.convidados?.total_pessoas || 0}</h3><p>Total de Pessoas</p></div>
              <div className="card-info"><h3>{dashboard.convidados?.total_confirmados || 0}</h3><p>Confirmados</p></div>
            </div>
            <div className="painel-header compact"><h3 className="painel-subtitulo">Faixas Etárias</h3></div>
            <div className="resumo-grid">
              <div className="card-info card-info--age"><h3>{dashboard.idades?.adulto || 0}</h3><p>Adultos</p></div>
              <div className="card-info card-info--age"><h3>{dashboard.idades?.c0_5 || 0}</h3><p>Crianças 0-5</p></div>
              <div className="card-info card-info--age"><h3>{dashboard.idades?.c6_10 || 0}</h3><p>Crianças 6-10</p></div>
            </div>
            <div className="painel-header compact"><h3 className="painel-subtitulo">Resumo Financeiro</h3></div>
            <div className="resumo-grid resumo-grid--financeiro">
              <div className="card-info"><h3>{money(dashboard.presentes?.total_geral || totalLista)}</h3><p>Valor Total da Lista</p></div>
              <div className="card-info"><h3>{money(dashboard.presentes?.total_vendido)}</h3><p>Total Recebido</p></div>
              <div className="card-info"><h3>{dashboard.presentes?.qtd_vendidos || 0}</h3><p>Presentes Comprados</p></div>
            </div>
          </div> : null}

          {aba === "convidados" ? <div id="tab-convidados" className="tab-conteudo ativo">
            <div className="resumo-mini"><span className="toolbar-pill">Convidados: {data.convidados?.total || 0}</span><span className="toolbar-pill">Pessoas: {dashboard.convidados?.total_pessoas || 0}</span><span className="toolbar-pill">Confirmados: {dashboard.convidados?.total_confirmados || 0}</span></div>
            <form className="barra-ferramentas barra-ferramentas--mini painel-filtros" onSubmit={aplicarFiltros}>
              <input name="busca" placeholder="Buscar por nome, telefone ou email..." defaultValue={filtros.busca} />
              <select name="ordem" defaultValue={filtros.ordem}><option value="recentes">Mais recentes</option><option value="az">A-Z</option><option value="za">Z-A</option><option value="status_asc">Status</option><option value="adultos_desc">Mais adultos</option><option value="c0_5_desc">Mais crianças 0-5</option><option value="c6_10_desc">Mais crianças 6-10</option></select>
              <button className="toolbar-btn" type="submit">Filtrar</button>
              <button className="toolbar-btn" type="button" onClick={() => limparFiltro(["busca"])}>Limpar</button>
              <button className="toolbar-btn" type="button" onClick={exportarConvidados}>Exportar CSV</button>
              <button className="toolbar-btn toolbar-btn--primary" type="button" onClick={() => setModal({ tipo: "convidado" })}>Adicionar</button>
            </form>
            <div className="tabela-container"><table><thead><tr><th>Nome</th><th>Telefone</th><th>Email</th><th>Confirmados</th><th>Adultos</th><th>0-5</th><th>6-10</th><th>Status</th>{data.convidados?.hasVisibilidade ? <th>Visibilidade</th> : null}<th>Ações</th></tr></thead><tbody>
              {convidados.length ? convidados.map((c) => { const idades = contarIdades(c.nomes_lista); const whats = whatsappUrl(c.telefone, c.nome); return <tr key={c.id}><td data-label="Nome">{c.nome}</td><td data-label="Telefone">{phone(c.telefone)}</td><td data-label="Email">{c.email || "-"}</td><td data-label="Confirmados">{c.convites_confirmados || 0} / {c.convites_disponiveis || 0}</td><td data-label="Adultos">{idades.adulto}</td><td data-label="0-5">{idades.c0_5}</td><td data-label="6-10">{idades.c6_10}</td><td data-label="Status"><span className={`status-badge ${badge(c.status)}`}>{labelStatus(c.status)}</span></td>{data.convidados?.hasVisibilidade ? <td data-label="Visibilidade"><span className={`status-badge ${c.visibilidade === "oculto" ? "oculto-badge" : "confirmado"}`}>{c.visibilidade === "oculto" ? "Oculto" : "Visível"}</span></td> : null}<td data-label="Ações"><div className="acoes-btn">{whats ? <a className="btn-acao btn-whatsapp" href={whats} target="_blank" rel="noreferrer" title="Enviar WhatsApp" aria-label="Enviar WhatsApp"><WhatsAppIcon /></a> : <span className="btn-acao btn-whatsapp btn-disabled" title="WhatsApp indisponível" aria-label="WhatsApp indisponível"><WhatsAppIcon /></span>}<button className="btn-acao btn-edit" onClick={() => setModal({ tipo: "convidado", row: c })}>✎</button><button className="btn-acao btn-trash" onClick={() => confirm("Excluir este convidado?") && api(`/api/painel/convidados?id=${c.id}`, { method: "DELETE" }, "Convidado excluído.")}>×</button></div></td></tr>; }) : <tr><td colSpan={data.convidados?.hasVisibilidade ? 10 : 9} className="table-empty">Nenhum convidado encontrado.</td></tr>}
            </tbody></table></div><Paginacao pagina={Number(filtros.pagina || 1)} total={data.convidados?.total || 0} limite={data.convidados?.limite || 10} onChange={(pg: number) => paginar("pagina", pg)} />
          </div> : null}

          {aba === "presentes" ? <div id="tab-presentes" className="tab-conteudo ativo">
            <div className="resumo-mini"><span className="toolbar-pill">Presentes: {presentes.length}</span><span className="toolbar-pill">Total da lista: {money(totalLista)}</span><span className="toolbar-pill">Recebido: {money(dashboard.presentes?.total_vendido)}</span></div>
            <form className="barra-ferramentas barra-ferramentas--mini painel-filtros" onSubmit={aplicarFiltros}>
              <input name="busca_presente" placeholder="Buscar presente ou categoria..." defaultValue={filtros.busca_presente} />
              <select name="ordem_presente" defaultValue={filtros.ordem_presente}><option value="recentes">Mais recentes</option><option value="az">A-Z</option><option value="za">Z-A</option><option value="menor_valor">Menor valor</option><option value="maior_valor">Maior valor</option></select>
              <button className="toolbar-btn" type="submit">Filtrar</button>
              <button className="toolbar-btn" type="button" onClick={() => limparFiltro(["busca_presente"])}>Limpar</button>
              <button className="toolbar-btn toolbar-btn--primary" type="button" onClick={() => setModal({ tipo: "presente" })}>Adicionar</button>
            </form>
            <form className="painel-taxa-form" onSubmit={salvarTaxa}>
              <span>Taxa atual: <strong>{taxaAtual.toLocaleString("pt-BR")}%</strong></span>
              <input name="taxa_percentual" placeholder="Taxa %" inputMode="decimal" />
              <button className="toolbar-btn" type="submit">Aplicar taxa</button>
              <button className="toolbar-btn toolbar-btn--secondary" type="button" onClick={() => api("/api/painel/presentes/taxa", { method: "DELETE" }, "Lista sem taxa.")}>Sem taxa</button>
            </form>
            <div className="presentes-grid-wrap"><div className="presentes-grid">
              {presentes.length ? presentes.map((p) => { const img = imagemPresente(p.imagem_thumb || p.imagem); const nomeExibicao = nomePresenteExibicao(p); const qtd = p.quantidade_disponivel ?? "Sem limite"; const vendido = p.quantidade_disponivel ? `${p.quantidade_vendida || 0} de ${p.quantidade_disponivel}` : (p.quantidade_vendida || 0); const usaCotas = p.modo_exibicao === "cotas"; return <article className="presente-card" key={p.id}><div className="presente-card__acoes"><button className="btn-acao btn-edit" onClick={() => setModal({ tipo: "presente", row: p })}>✎</button><button className="btn-acao btn-trash" onClick={() => confirm("Excluir este presente?") && api(`/api/painel/presentes?id=${p.id}`, { method: "DELETE" }, "Presente excluído.")}>×</button></div><div className="presente-card__media">{img ? <img src={img} className="img-thumb" alt={nomeExibicao} /> : <div className="presente-card__sem-foto">Sem foto</div>}</div><div className="presente-card__body"><h4 className="presente-card__titulo">{nomeExibicao}</h4><div className="presente-card__categoria"><span className="badge-category">{p.categoria || "Outros"}</span></div><div className="presente-card__preco">{money(p.preco)}</div>{usaCotas ? <div className="presente-card__preco-context">Valor por cota</div> : null}<div className="presente-card__meta"><span className="presente-card__meta-label">{usaCotas ? "Qtd. de cotas" : "Limite"}</span><span className="presente-card__meta-valor">{qtd}</span></div><div className="presente-card__meta"><span className="presente-card__meta-label">Visibilidade</span><span className="presente-card__meta-valor"><span className={`status-badge ${p.status === "oculto" ? "oculto-badge" : "confirmado"}`}>{p.status === "oculto" ? "Oculto" : "Visível"}</span></span></div><div className="presente-card__meta"><span className="presente-card__meta-label">{usaCotas ? "Cotas presenteadas" : "Comprados"}</span><span className="presente-card__meta-valor">{vendido}</span></div></div></article>; }) : <div className="presentes-empty">Nenhum presente encontrado.</div>}
            </div></div>
          </div> : null}

          {aba === "vendas" ? <TabelaVendas vendas={vendas} data={data} filtros={filtros} aplicarFiltros={aplicarFiltros} limparFiltro={limparFiltro} sincronizarVendas={sincronizarVendas} paginar={paginar} /> : null}
          {aba === "recados" ? <TabelaRecados recados={recados} api={api} /> : null}
          {aba === "logs" ? <TabelaLogs logs={logs} data={data} filtros={filtros} aplicarFiltros={aplicarFiltros} limparFiltro={limparFiltro} api={api} paginar={paginar} /> : null}
          {aba === "confirmacao" ? <Rsvp data={data} api={api} /> : null}
        </main>
      </div>

      {modal?.tipo === "convidado" ? <Modal id="modal-convidado" title={modal.row ? "Editar Convidado" : "Adicionar Novo Convidado"} onClose={() => setModal(null)}><ConvidadoModal row={modal.row} hasVisibilidade={data.convidados?.hasVisibilidade} onSubmit={salvarConvidado} onCancel={() => setModal(null)} /></Modal> : null}
      {modal?.tipo === "presente" ? <Modal id="modal-presente" title={modal.row ? "Editar Presente" : "Adicionar Presente"} onClose={() => setModal(null)} showTitle={false}><PresenteModal row={modal.row} onSubmit={salvarPresente} onCancel={() => setModal(null)} ordem={filtros.ordem_presente} busca={filtros.busca_presente} taxaPercentual={taxaAtual} /></Modal> : null}
    </div>
  );
}

