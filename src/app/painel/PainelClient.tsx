"use client";

import { useMemo, useRef, useState } from "react";
import { ConvidadoModal } from "./components/modals/ConvidadoModal";
import { PresenteModal } from "./components/modals/PresenteModal";
import { TabelaVendas } from "./components/tables/TabelaVendas";
import { TabelaRecados } from "./components/tables/TabelaRecados";
import { TabelaLogs } from "./components/tables/TabelaLogs";
import { Rsvp } from "./components/Rsvp";
import { Seguranca } from "./components/Seguranca";
import { Backups } from "./components/Backups";
import { Usuarios } from "./components/Usuarios";
import { FestaFotos } from "./components/FestaFotos";
import { Whatsapp } from "./components/Whatsapp";
import { Input } from "./components/common/Input";
import { Paginacao } from "./components/common/Paginacao";
import { Modal } from "./components/common/Modal";
import { badge, imagemPresente, labelStatus, money, phone } from "./utils/formatting";
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

const ABAS_VALIDAS = new Set(["dashboard", "convidados", "presentes", "vendas", "recados", "logs", "confirmacao", "whatsapp", "festa", "seguranca", "usuarios", "backups"]);

export default function PainelClient({ initialData, initialAba }: { initialData: PainelData; initialAba?: string }) {
  // A aba inicial vem do servidor (?aba=... na URL), então o HTML já nasce na aba
  // certa — sem "piscar" o dashboard ao recarregar a página.
  const [aba, setAba] = useState(initialAba && ABAS_VALIDAS.has(initialAba) ? initialAba : "dashboard");
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
  const valorCartaoAtual = Number(dashboard.presentes?.cartao_valor || 0);

  const totalLista = useMemo(() => presentes.reduce((sum, p) => sum + Number(p.preco || 0), 0), [presentes]);

  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function refresh(nextFiltros = filtros) {
    const params = new URLSearchParams(nextFiltros as Record<string, string>);
    const res = await fetch(`/api/painel/data?${params.toString()}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }

  // Atualização fluida de filtros: o texto digitado aparece na hora (estado
  // imediato) e a busca no servidor é "debounced" para não disparar a cada tecla.
  // Selects (ordenação) e botões aplicam de imediato. resetPagina volta à pág. 1.
  function atualizarFiltro(
    parciais: Partial<typeof filtros>,
    opcoes?: { debounce?: boolean; resetPagina?: "pagina" | "pagina_venda" | "pagina_log" },
  ) {
    const next = { ...filtros, ...parciais };
    if (opcoes?.resetPagina) next[opcoes.resetPagina] = "1";
    setFiltros(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (opcoes?.debounce) {
      setBuscando(true);
      debounceRef.current = setTimeout(async () => {
        await refresh(next);
        setBuscando(false);
      }, 300);
    } else {
      void refresh(next);
    }
  }

  async function aplicarFiltros(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const next = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    const merged = { ...filtros, ...next };
    setFiltros(merged);
    setBuscando(true);
    await refresh(merged);
    setBuscando(false);
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

  async function salvarValorCartao(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const ok = await api("/api/painel/config/cartao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, "Valor do cartão atualizado.");
    if (ok) form.reset();
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
    // Reflete a aba na URL (?aba=...) sem criar histórico. Como é query param, o
    // servidor a enxerga no refresh e já renderiza a aba certa (sem flash).
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("aba", key);
      window.history.replaceState(null, "", url.toString());
    }
  }

  const role = data.session?.role || "assistente";
  const allNav: [string, string, string[]][] = [
    ["dashboard", "Dashboard Geral", ["admin", "gerente", "assistente"]],
    ["convidados", "Lista de Convidados", ["admin", "gerente", "assistente"]],
    ["presentes", "Lista de Presentes", ["admin", "gerente"]],
    ["vendas", "Mensagens, Vendas & Pendentes", ["admin", "gerente"]],
    ["recados", "Recados do Site", ["admin", "gerente", "assistente"]],
    ["logs", "Logs do Site", ["admin", "gerente"]],
    ["confirmacao", "Configuração RSVP", ["admin", "gerente"]],
    ["whatsapp", "WhatsApp", ["admin", "gerente"]],
    ["festa", "Fotos da Festa", ["admin", "gerente"]],
    ["seguranca", "Segurança", ["admin"]],
    ["usuarios", "Usuários", ["admin"]],
    ["backups", "Backups", ["admin"]],
  ];
  const nav = allNav.filter(([, , roles]) => roles.includes(role));

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
          {nav.map(([key, label]) => <button key={key} className={`sidebar-btn ${aba === key ? "ativo" : ""}`} onClick={() => trocarAba(key)}>{label as string}</button>)}
          <button className="sidebar-btn" onClick={sair}>Sair</button>
        </aside>

        <main className="conteudo-principal">
          {aba === "dashboard" ? (() => {
            const totalP = dashboard.convidados?.total_pessoas || 0;
            const totalConf = dashboard.convidados?.total_confirmados || 0;
            const pendentes = totalP - totalConf;
            const pctConf = totalP ? Math.round((totalConf / totalP) * 100) : 0;
            const adConf = dashboard.idadesConfirmados?.adulto || 0;
            const c05Conf = dashboard.idadesConfirmados?.c0_5 || 0;
            const c610Conf = dashboard.idadesConfirmados?.c6_10 || 0;
            const adTotal = dashboard.idades?.adulto || 0;
            const c05Total = dashboard.idades?.c0_5 || 0;
            const c610Total = dashboard.idades?.c6_10 || 0;
            return <div id="tab-dashboard" className="tab-conteudo ativo">
            <div className="painel-header compact"><h3 className="painel-subtitulo">Resumo de Convidados</h3></div>
            <div className="resumo-grid">
              <div className="card-info"><h3>{dashboard.convidados?.total_grupos || 0}</h3><p>Grupos/Famílias</p></div>
              <div className="card-info"><h3>{totalP}</h3><p>Total de Pessoas</p></div>
              <div className="card-info card-info--confirmed"><h3>{totalConf}</h3><p>Confirmados ({pctConf}%)</p></div>
              <div className="card-info card-info--pending"><h3>{pendentes}</h3><p>Faltam Confirmar</p></div>
            </div>
            <div className="painel-header compact"><h3 className="painel-subtitulo">Pessoas por Faixa Etária</h3></div>
            <div className="resumo-grid dash-faixa-grid">
              <div className="card-info card-info--age">
                <h3>{adConf} <span className="dash-de">de</span> {adTotal}</h3>
                <p>Adultos</p>
              </div>
              <div className="card-info card-info--age">
                <h3>{c05Conf} <span className="dash-de">de</span> {c05Total}</h3>
                <p>Crianças 0-5</p>
              </div>
              <div className="card-info card-info--age">
                <h3>{c610Conf} <span className="dash-de">de</span> {c610Total}</h3>
                <p>Crianças 6-10</p>
              </div>
            </div>
            <div className="painel-header compact"><h3 className="painel-subtitulo">Resumo Financeiro</h3></div>
            <div className="resumo-grid resumo-grid--financeiro">
              <div className="card-info"><h3>{money(dashboard.presentes?.total_vendido)}</h3><p>Total Recebido</p></div>
              <div className="card-info"><h3>{money(dashboard.presentes?.total_pendente)}</h3><p>Pendente</p></div>
              <div className="card-info"><h3>{money(dashboard.presentes?.total_geral || totalLista)}</h3><p>Valor Total da Lista</p></div>
            </div>
            <div className="painel-header compact"><h3 className="painel-subtitulo">Presentes</h3></div>
            <div className="resumo-grid">
              <div className="card-info card-info--confirmed"><h3>{dashboard.presentes?.qtd_vendidos || 0}</h3><p>Comprados</p></div>
              <div className="card-info"><h3>{dashboard.presentes?.presentes_disponiveis || 0}</h3><p>Disponíveis</p></div>
              <div className="card-info"><h3>{dashboard.presentes?.total_presentes || 0}</h3><p>Total na Lista</p></div>
            </div>
          </div>;
          })() : null}

          {aba === "convidados" ? <div id="tab-convidados" className="tab-conteudo ativo">
            <div className="painel-header compact"><h3 className="painel-subtitulo">Lista de Convidados</h3></div>
            <div className="resumo-mini resumo-mini--stats"><span className="toolbar-pill"><span className="rp-label">Convidados</span><span className="rp-num">{data.convidados?.total || 0}</span></span><span className="toolbar-pill"><span className="rp-label">Pessoas</span><span className="rp-num">{dashboard.convidados?.total_pessoas || 0}</span></span><span className="toolbar-pill"><span className="rp-label">Confirmados</span><span className="rp-num">{dashboard.convidados?.total_confirmados || 0}</span></span></div>
            <form className="barra-ferramentas barra-ferramentas--mini painel-filtros" onSubmit={aplicarFiltros}>
              <div className={`campo-busca ${buscando ? "campo-busca--carregando" : ""}`}>
                <input name="busca" placeholder="Buscar por nome, telefone ou email..." value={filtros.busca} onChange={(e) => atualizarFiltro({ busca: e.target.value }, { debounce: true, resetPagina: "pagina" })} autoComplete="off" />
                {filtros.busca ? <button type="button" className="campo-busca__limpar" aria-label="Limpar busca" onClick={() => atualizarFiltro({ busca: "" }, { resetPagina: "pagina" })}>×</button> : null}
              </div>
              <select name="ordem" value={filtros.ordem} onChange={(e) => atualizarFiltro({ ordem: e.target.value }, { resetPagina: "pagina" })}><option value="recentes">Mais recentes</option><option value="az">A-Z</option><option value="za">Z-A</option><option value="status_asc">Status</option><option value="adultos_desc">Mais adultos</option><option value="c0_5_desc">Mais crianças 0-5</option><option value="c6_10_desc">Mais crianças 6-10</option></select>
              <button className="toolbar-btn" type="button" onClick={exportarConvidados}>Exportar CSV</button>
              <button className="toolbar-btn toolbar-btn--primary" type="button" onClick={() => setModal({ tipo: "convidado" })}>Adicionar</button>
            </form>
            <div className="tabela-container"><table><thead><tr><th>Nome</th><th>Telefone</th><th>Email</th><th>Confirmados</th><th>Adultos</th><th>0-5</th><th>6-10</th><th>Status</th>{data.convidados?.hasVisibilidade ? <th>Visibilidade</th> : null}<th>Ações</th></tr></thead><tbody>
              {convidados.length ? convidados.map((c) => { const idades = contarIdades(c.nomes_lista); return <tr key={c.id}><td data-label="Nome">{c.nome}</td><td data-label="Telefone">{phone(c.telefone)}</td><td data-label="Email">{c.email || "-"}</td><td data-label="Confirmados">{c.convites_confirmados || 0} / {c.convites_disponiveis || 0}</td><td data-label="Adultos">{idades.adulto}</td><td data-label="0-5">{idades.c0_5}</td><td data-label="6-10">{idades.c6_10}</td><td data-label="Status"><span className={`status-badge ${badge(c.status)}`}>{labelStatus(c.status)}</span></td>{data.convidados?.hasVisibilidade ? <td data-label="Visibilidade"><span className={`status-badge ${c.visibilidade === "oculto" ? "oculto-badge" : "confirmado"}`}>{c.visibilidade === "oculto" ? "Oculto" : "Visível"}</span></td> : null}<td data-label="Ações"><div className="acoes-btn"><button className="btn-acao btn-edit" onClick={() => setModal({ tipo: "convidado", row: c })}>✎</button><button className="btn-acao btn-trash" onClick={() => confirm("Excluir este convidado?") && api(`/api/painel/convidados?id=${c.id}`, { method: "DELETE" }, "Convidado excluído.")}>×</button></div></td></tr>; }) : <tr><td colSpan={data.convidados?.hasVisibilidade ? 10 : 9} className="table-empty">Nenhum convidado encontrado.</td></tr>}
            </tbody></table></div><Paginacao pagina={Number(filtros.pagina || 1)} total={data.convidados?.total || 0} limite={data.convidados?.limite || 10} onChange={(pg: number) => paginar("pagina", pg)} />
          </div> : null}

          {aba === "presentes" ? <div id="tab-presentes" className="tab-conteudo ativo">
            <div className="painel-header compact"><h3 className="painel-subtitulo">Lista de Presentes</h3></div>
            <div className="resumo-mini resumo-mini--stats"><span className="toolbar-pill"><span className="rp-label">Presentes</span><span className="rp-num">{presentes.length}</span></span><span className="toolbar-pill"><span className="rp-label">Total da lista</span><span className="rp-num">{money(totalLista)}</span></span><span className="toolbar-pill"><span className="rp-label">Recebido</span><span className="rp-num">{money(dashboard.presentes?.total_vendido)}</span></span></div>
            <form className="barra-ferramentas barra-ferramentas--mini painel-filtros" onSubmit={aplicarFiltros}>
              <div className={`campo-busca ${buscando ? "campo-busca--carregando" : ""}`}>
                <input name="busca_presente" placeholder="Buscar presente ou categoria..." value={filtros.busca_presente} onChange={(e) => atualizarFiltro({ busca_presente: e.target.value }, { debounce: true })} autoComplete="off" />
                {filtros.busca_presente ? <button type="button" className="campo-busca__limpar" aria-label="Limpar busca" onClick={() => atualizarFiltro({ busca_presente: "" })}>×</button> : null}
              </div>
              <select name="ordem_presente" value={filtros.ordem_presente} onChange={(e) => atualizarFiltro({ ordem_presente: e.target.value })}><option value="recentes">Mais recentes</option><option value="az">A-Z</option><option value="za">Z-A</option><option value="menor_valor">Menor valor</option><option value="maior_valor">Maior valor</option></select>
              <button className="toolbar-btn toolbar-btn--primary" type="button" onClick={() => setModal({ tipo: "presente" })}>Adicionar</button>
            </form>
            <div className="config-presentes">
              <form className="config-card" onSubmit={salvarTaxa}>
                <div className="config-card__head">
                  <span className="config-card__label">Taxa da lista</span>
                  <span className="config-card__valor">{taxaAtual.toLocaleString("pt-BR")}%</span>
                </div>
                <p className="config-card__hint">Acréscimo aplicado sobre o valor de todos os presentes.</p>
                <div className="config-card__controls">
                  {taxaAtual > 0 ? (
                    <button className="toolbar-btn toolbar-btn--secondary" type="button" onClick={() => api("/api/painel/presentes/taxa", { method: "DELETE" }, "Lista sem taxa.")}>Sem taxa</button>
                  ) : (
                    <>
                      <div className="config-card__input config-card__input--sufixo">
                        <input name="taxa_percentual" placeholder="0" inputMode="decimal" aria-label="Nova taxa em porcentagem" />
                        <span className="config-card__sufixo">%</span>
                      </div>
                      <button className="toolbar-btn toolbar-btn--primary" type="submit">Aplicar</button>
                    </>
                  )}
                </div>
              </form>

              <form className="config-card" onSubmit={salvarValorCartao}>
                <div className="config-card__head">
                  <span className="config-card__label">Cartão postal</span>
                  <span className="config-card__valor">{money(valorCartaoAtual)}</span>
                </div>
                <p className="config-card__hint">Valor sugerido para quem quiser presentear com um cartão.</p>
                <div className="config-card__controls">
                  {valorCartaoAtual > 0 ? (
                    <button className="toolbar-btn toolbar-btn--secondary" type="button" onClick={() => api("/api/painel/config/cartao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: 0 }) }, "Cartão postal removido.")}>Remover</button>
                  ) : (
                    <>
                      <div className="config-card__input config-card__input--prefixo">
                        <span className="config-card__prefixo">R$</span>
                        <input name="valor" placeholder="0,00" inputMode="decimal" aria-label="Valor do cartão postal" />
                      </div>
                      <button className="toolbar-btn toolbar-btn--primary" type="submit">Salvar</button>
                    </>
                  )}
                </div>
              </form>
            </div>
            <div className="presentes-grid-wrap"><div className="presentes-grid">
              {presentes.length ? presentes.map((p) => { const img = imagemPresente(p.imagem_thumb || p.imagem); const nomeExibicao = nomePresenteExibicao(p); const qtd = p.quantidade_disponivel ?? "Sem limite"; const vendido = p.quantidade_disponivel ? `${p.quantidade_vendida || 0} de ${p.quantidade_disponivel}` : (p.quantidade_vendida || 0); const usaCotas = p.modo_exibicao === "cotas"; return <article className="presente-card" key={p.id}><div className="presente-card__acoes"><button className="btn-acao btn-edit" onClick={() => setModal({ tipo: "presente", row: p })}>✎</button><button className="btn-acao btn-trash" onClick={() => confirm("Excluir este presente?") && api(`/api/painel/presentes?id=${p.id}`, { method: "DELETE" }, "Presente excluído.")}>×</button></div><div className="presente-card__media">{img ? <img src={img} className="img-thumb" alt={nomeExibicao} /> : <div className="presente-card__sem-foto">Sem foto</div>}</div><div className="presente-card__body"><h4 className="presente-card__titulo">{nomeExibicao}</h4><div className="presente-card__categoria"><span className="badge-category">{p.categoria || "Outros"}</span></div><div className="presente-card__preco">{money(p.preco)}</div>{usaCotas ? <div className="presente-card__preco-context">Valor por cota</div> : null}<div className="presente-card__meta"><span className="presente-card__meta-label">{usaCotas ? "Qtd. de cotas" : "Limite"}</span><span className="presente-card__meta-valor">{qtd}</span></div><div className="presente-card__meta"><span className="presente-card__meta-label">Visibilidade</span><span className="presente-card__meta-valor"><span className={`status-badge ${p.status === "oculto" ? "oculto-badge" : "confirmado"}`}>{p.status === "oculto" ? "Oculto" : "Visível"}</span></span></div><div className="presente-card__meta"><span className="presente-card__meta-label">{usaCotas ? "Cotas presenteadas" : "Comprados"}</span><span className="presente-card__meta-valor">{vendido}</span></div></div></article>; }) : <div className="presentes-empty">Nenhum presente encontrado.</div>}
            </div></div>
          </div> : null}

          {aba === "vendas" ? <TabelaVendas vendas={vendas} data={data} filtros={filtros} aplicarFiltros={aplicarFiltros} limparFiltro={limparFiltro} atualizarFiltro={atualizarFiltro} sincronizarVendas={sincronizarVendas} paginar={paginar} /> : null}
          {aba === "recados" ? <TabelaRecados recados={recados} api={api} /> : null}
          {aba === "logs" ? <TabelaLogs logs={logs} data={data} filtros={filtros} aplicarFiltros={aplicarFiltros} limparFiltro={limparFiltro} atualizarFiltro={atualizarFiltro} api={api} paginar={paginar} /> : null}
          {aba === "confirmacao" ? <Rsvp data={data} api={api} /> : null}
          {aba === "whatsapp" ? <Whatsapp onToast={setToast} /> : null}
          {aba === "festa" ? <FestaFotos onToast={setToast} /> : null}
          {aba === "seguranca" ? <Seguranca onToast={setToast} /> : null}
          {aba === "usuarios" && role === "admin" ? <Usuarios onToast={setToast} meuId={data.session?.id || 0} /> : null}
          {aba === "backups" ? <Backups onToast={setToast} /> : null}
        </main>
      </div>

      {modal?.tipo === "convidado" ? <Modal id="modal-convidado" title={modal.row ? "Editar Convidado" : "Adicionar Convidado"} onClose={() => setModal(null)} showTitle={false}><ConvidadoModal row={modal.row} hasVisibilidade={data.convidados?.hasVisibilidade} onSubmit={salvarConvidado} onCancel={() => setModal(null)} /></Modal> : null}
      {modal?.tipo === "presente" ? <Modal id="modal-presente" title={modal.row ? "Editar Presente" : "Adicionar Presente"} onClose={() => setModal(null)} showTitle={false}><PresenteModal row={modal.row} onSubmit={salvarPresente} onCancel={() => setModal(null)} ordem={filtros.ordem_presente} busca={filtros.busca_presente} taxaPercentual={taxaAtual} /></Modal> : null}
    </div>
  );
}

