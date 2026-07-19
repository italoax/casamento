"use client";

import { useEffect, useRef, useState } from "react";
import { phone as formatPhone, normalizedPhone } from "../utils/formatting";
import { aplicarVariaveis, VARIAVEIS_AJUDA, LISTAS } from "../utils/whatsapp-helpers";
import { Modal } from "./common/Modal";

type NumeroStatus = { slot: "1" | "2" | "3"; session: string; status: string; connected: boolean; number?: string; erro?: string };
type Contato = { id: number; nome: string; telefone: string; telefoneValido: boolean; status: string; lista: string };
type EstadoConexao = { session: string; status: string; connected: boolean; qrImage?: string; pairingCode?: string; lastError?: string };
type JobStatus = "processando" | "pausado" | "concluido" | "cancelado";
type FilaJob = { id: number; status: JobStatus; slot: string; total: number; enviados: number; falhas: number; intervalo: number; motivo_pausa: string | null };
type FilaItem = { id: number; nome: string; telefone: string; lista: string | null; status: string; erro: string | null };
type Envio = { id: number; criado_em: string; nome: string; telefone: string; lista: string | null; sucesso: number; erro: string | null };
type Modelo = { id: number; nome: string; mensagem: string; pdf: string };

function fmtData(s: string) {
  // O MySQL devolve a data como texto em UTC (ex.: "2026-06-30 18:29:00"). Sem o
  // "Z", o new Date() interpretaria como horário LOCAL e a hora ficava errada.
  const raw = String(s || "").trim();
  const norm = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(raw) ? `${raw.replace(" ", "T")}Z` : raw;
  const d = new Date(norm);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function rotuloStatusJob(s: JobStatus): string {
  return s === "processando" ? "Em andamento" : s === "pausado" ? "Pausado" : s === "concluido" ? "Concluído" : "Cancelado";
}

function resultadoItem(it: FilaItem) {
  if (it.status === "enviado") return <span className="wa-tag wa-tag--ok">Enviado</span>;
  if (it.status === "sem_whatsapp") return <span className="wa-tag wa-tag--off" title={it.erro || ""}>Sem WhatsApp</span>;
  return <span className="wa-tag wa-tag--off" title={it.erro || ""}>Falhou</span>;
}

export function Whatsapp({ onToast }: { onToast: (m: string) => void }) {
  const [configurado, setConfigurado] = useState(true);
  const [numeros, setNumeros] = useState<NumeroStatus[]>([]);
  const [carregandoStatus, setCarregandoStatus] = useState(true);

  const [contatos, setContatos] = useState<Contato[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "confirmado" | "pendente">("todos");
  const [filtroLista, setFiltroLista] = useState<string>("todas");
  const [busca, setBusca] = useState("");

  const slotEnvio = "1" as const; // sessão única
  const [intervalo, setIntervalo] = useState(8);

  // Disparo via FILA NO SERVIDOR (sobrevive a fechar a aba / reiniciar o processo).
  const [job, setJob] = useState<FilaJob | null>(null);
  const [jobItens, setJobItens] = useState<FilaItem[]>([]);
  const jobPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [criandoJob, setCriandoJob] = useState(false);
  const jobAtivo = !!job && (job.status === "processando" || job.status === "pausado");
  // Checagem "tem WhatsApp?": ids de convidados sinalizados como sem WhatsApp.
  const [semWhatsapp, setSemWhatsapp] = useState<Set<number>>(new Set());
  const [verificandoNumeros, setVerificandoNumeros] = useState(false);

  // Histórico persistente de envios (quem já recebeu) — apenas registro, não bloqueia reenvio.
  const [envios, setEnvios] = useState<Envio[]>([]);

  // Modelos de mensagem salvos
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [modalModelo, setModalModelo] = useState<null | { modo: "criar" | "editar"; modelo?: Modelo }>(null);
  const [modeloNome, setModeloNome] = useState("");
  const [modeloTexto, setModeloTexto] = useState("");
  const [salvandoModeloMsg, setSalvandoModeloMsg] = useState(false);
  const modeloPdfRef = useRef<HTMLInputElement | null>(null);

  // Modal de disparo (preview + escolha de modelo)
  const [modalDisparo, setModalDisparo] = useState(false);

  // Conexão (QR / código) por número
  const [conexao, setConexao] = useState<null | { slot: "1" | "2" | "3"; estado: EstadoConexao }>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function carregarStatus() {
    setCarregandoStatus(true);
    try {
      const res = await fetch("/api/painel/whatsapp/status", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setConfigurado(Boolean(body.configurado));
        setNumeros(body.numeros || []);
      } else {
        onToast(body.erro || "Não foi possível carregar o status do WhatsApp.");
      }
    } catch {
      onToast("Não foi possível carregar o status do WhatsApp.");
    } finally {
      setCarregandoStatus(false);
    }
  }

  async function carregarContatos() {
    try {
      const res = await fetch("/api/painel/whatsapp/contatos", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) setContatos(body.contatos || []);
    } catch {
      /* silencioso */
    }
  }

  async function carregarEnvios() {
    try {
      const res = await fetch("/api/painel/whatsapp/envios", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setEnvios(body.envios || []);
      }
    } catch {
      /* silencioso */
    }
  }

  async function limparHistorico() {
    if (!confirm("Apagar todo o histórico de envios? (não afeta o WhatsApp, só o registro no painel)")) return;
    const res = await fetch("/api/painel/whatsapp/envios", { method: "DELETE" });
    if (res.ok) { onToast("Histórico limpo."); setEnvios([]); }
    else onToast("Falha ao limpar o histórico.");
  }

  async function carregarModelos() {
    try {
      const res = await fetch("/api/painel/whatsapp/modelos", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) setModelos(body.modelos || []);
    } catch { /* silencioso */ }
  }

  async function salvarModeloMsg() {
    if (!modeloNome.trim() || !modeloTexto.trim()) { onToast("Preencha nome e mensagem."); return; }
    setSalvandoModeloMsg(true);
    try {
      const payload: any = { nome: modeloNome, mensagem: modeloTexto };
      if (modalModelo?.modo === "editar" && modalModelo.modelo) payload.id = modalModelo.modelo.id;
      const res = await fetch("/api/painel/whatsapp/modelos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) { onToast(b.erro || "Falha ao salvar modelo."); return; }

      const modeloId = payload.id || b.id;

      // Upload do PDF se selecionado
      const arquivo = modeloPdfRef.current?.files?.[0];
      if (arquivo && modeloId) {
        const fd = new FormData();
        fd.append("id", String(modeloId));
        fd.append("pdf", arquivo);
        await fetch("/api/painel/whatsapp/modelos", { method: "POST", body: fd });
      }

      onToast(payload.id ? "Modelo atualizado." : "Modelo criado.");
      setModalModelo(null);
      if (modeloPdfRef.current) modeloPdfRef.current.value = "";
      await carregarModelos();
    } finally { setSalvandoModeloMsg(false); }
  }

  async function removerPdfModelo(id: number) {
    if (!confirm("Remover o PDF deste modelo?")) return;
    const fd = new FormData();
    fd.append("id", String(id));
    fd.append("remover_pdf", "1");
    const res = await fetch("/api/painel/whatsapp/modelos", { method: "POST", body: fd });
    if (res.ok) { onToast("PDF removido."); await carregarModelos(); }
    else onToast("Falha ao remover o PDF.");
  }

  async function excluirModeloMsg(id: number) {
    if (!confirm("Excluir este modelo de mensagem?")) return;
    const res = await fetch("/api/painel/whatsapp/modelos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { onToast("Modelo excluído."); await carregarModelos(); }
    else onToast("Falha ao excluir.");
  }

  function abrirCriarModelo() {
    setModeloNome("");
    setModeloTexto("");
    setModalModelo({ modo: "criar" });
  }

  function abrirEditarModelo(m: Modelo) {
    setModeloNome(m.nome);
    setModeloTexto(m.mensagem);
    setModalModelo({ modo: "editar", modelo: m });
  }

  function abrirModalDisparo() {
    if (job && (job.status === "processando" || job.status === "pausado")) { onToast("Já existe um disparo em andamento."); return; }
    if (modelos.length === 0) { onToast("Crie pelo menos um modelo de mensagem."); return; }
    if (destinatarios.length === 0) { onToast("Selecione ao menos um contato."); return; }
    const conectado = numeros.find((n) => n.slot === slotEnvio)?.connected;
    if (!conectado) { onToast("Nenhum WhatsApp conectado."); return; }
    setModalDisparo(true);
  }

  useEffect(() => {
    void carregarStatus();
    void carregarContatos();
    void carregarModelos();
    void carregarEnvios();
    void carregarJob();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (jobPollRef.current) clearInterval(jobPollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enquanto houver um disparo em andamento, atualiza o status a cada 3s.
  useEffect(() => {
    if (!jobAtivo) {
      if (jobPollRef.current) { clearInterval(jobPollRef.current); jobPollRef.current = null; }
      return;
    }
    jobPollRef.current = setInterval(() => { void carregarJob(); }, 3000);
    return () => { if (jobPollRef.current) { clearInterval(jobPollRef.current); jobPollRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobAtivo]);

  function pararPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function conectar(slot: "1" | "2" | "3") {
    try {
      const res = await fetch("/api/painel/whatsapp/conectar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, acao: "qr" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { onToast(body.erro || "Falha ao conectar."); return; }
      setConexao({ slot, estado: body.estado });
      // Faz polling do status até conectar (ou o usuário fechar).
      pararPoll();
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch("/api/painel/whatsapp/conectar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slot, acao: "status" }),
          });
          const b = await r.json().catch(() => ({}));
          if (r.ok && b.estado) {
            setConexao({ slot, estado: b.estado });
            if (b.estado.connected) {
              pararPoll();
              onToast("WhatsApp conectado!");
              setConexao(null);
              void carregarStatus();
            }
          }
        } catch { /* continua tentando */ }
      }, 3000);
    } catch {
      onToast("Falha ao conectar.");
    }
  }

  function fecharConexao() {
    pararPoll();
    setConexao(null);
    void carregarStatus();
  }

  const [desconectando, setDesconectando] = useState(false);
  async function desconectar(slot: "1" | "2" | "3") {
    if (desconectando) return;
    if (!confirm("Desconectar o WhatsApp? Para enviar de novo será preciso conectar um aparelho (QR ou código).")) return;
    setDesconectando(true);
    try {
      const res = await fetch("/api/painel/whatsapp/conectar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, acao: "desligar" }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) onToast("WhatsApp desconectado.");
      else onToast(body.erro || "Falha ao desconectar.");
    } catch {
      onToast("Falha ao desconectar.");
    } finally {
      setDesconectando(false);
      void carregarStatus();
    }
  }

  const contatosFiltrados = contatos.filter((c) => {
    if (filtroStatus === "confirmado" && c.status !== "confirmado") return false;
    if (filtroStatus === "pendente" && c.status === "confirmado") return false;
    if (filtroLista !== "todas") {
      if (filtroLista === "sem" ? Boolean(c.lista) : c.lista !== filtroLista) return false;
    }
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      const qDigitos = normalizedPhone(q);
      const achouNome = c.nome.toLowerCase().includes(q);
      // Só casa por telefone se o termo tiver dígitos (senão "" daria match em tudo).
      const achouTel = qDigitos.length > 0 && normalizedPhone(c.telefone).includes(qDigitos);
      if (!achouNome && !achouTel) return false;
    }
    return true;
  });

  function toggle(id: number) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selecionarVisiveis(marcar: boolean) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      contatosFiltrados.forEach((c) => {
        if (!c.telefoneValido) return;
        if (marcar) next.add(c.id);
        else next.delete(c.id);
      });
      return next;
    });
  }

  const destinatarios = contatos.filter((c) => selecionados.has(c.id) && c.telefoneValido);
  // Total de convidados com telefone válido (denominador correto da seleção).
  const totalSelecionaveis = contatos.filter((c) => c.telefoneValido).length;
  // Quantos dos contatos exibidos no filtro atual estão marcados.
  const selecionadosNoFiltro = contatosFiltrados.filter((c) => selecionados.has(c.id) && c.telefoneValido).length;

  const pct = job && job.total ? Math.round(((job.enviados + job.falhas) / job.total) * 100) : 0;

  async function carregarJob() {
    try {
      const res = await fetch("/api/painel/whatsapp/fila", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.sucesso) {
        setJob(body.job || null);
        setJobItens(body.itens || []);
        if (body.job && (body.job.status === "concluido" || body.job.status === "cancelado")) void carregarEnvios();
      }
    } catch {
      /* silencioso */
    }
  }

  // Cria o job de disparo no servidor (o worker envia em segundo plano).
  async function criarDisparo(modelo: Modelo) {
    if (criandoJob) return;
    setModalDisparo(false);
    setCriandoJob(true);
    try {
      const res = await fetch("/api/painel/whatsapp/fila", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot: slotEnvio,
          modeloId: modelo.id,
          mensagem: modelo.mensagem,
          anexarPdf: Boolean(modelo.pdf),
          intervalo,
          destinatarios: destinatarios.map((c) => ({ id: c.id, nome: c.nome, telefone: c.telefone, lista: c.lista })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.sucesso) {
        onToast("Disparo iniciado. Pode fechar a aba — ele continua no servidor.");
        setSelecionados(new Set());
        await carregarJob();
      } else {
        onToast(body?.erro || "Falha ao iniciar o disparo.");
      }
    } catch {
      onToast("Falha ao iniciar o disparo.");
    } finally {
      setCriandoJob(false);
    }
  }

  async function acaoJobUI(acao: "pausar" | "retomar" | "cancelar") {
    if (!job) return;
    if (acao === "cancelar" && !confirm("Cancelar o disparo? Os contatos ainda não enviados não receberão a mensagem.")) return;
    try {
      const res = await fetch("/api/painel/whatsapp/fila/acao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, acao }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.sucesso) await carregarJob();
      else onToast(body?.erro || "Falha ao atualizar o disparo.");
    } catch {
      onToast("Falha ao atualizar o disparo.");
    }
  }

  // Checa quais selecionados têm WhatsApp (resultado vem na mesma ordem enviada).
  async function verificarNumeros() {
    if (verificandoNumeros) return;
    if (destinatarios.length === 0) { onToast("Selecione contatos para verificar."); return; }
    const conectado = numeros.find((n) => n.slot === slotEnvio)?.connected;
    if (!conectado) { onToast("Conecte o WhatsApp para verificar os números."); return; }
    setVerificandoNumeros(true);
    try {
      const res = await fetch("/api/painel/whatsapp/numeros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: slotEnvio, numeros: destinatarios.map((c) => c.telefone) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.sucesso) { onToast(body?.erro || "Falha ao verificar os números."); return; }
      const results: { exists: boolean }[] = body.results || [];
      const semWa = new Set<number>();
      destinatarios.forEach((c, i) => { if (results[i] && results[i].exists === false) semWa.add(c.id); });
      setSemWhatsapp(semWa);
      onToast(semWa.size > 0 ? `${semWa.size} número(s) sem WhatsApp — confira na lista.` : "Todos os selecionados têm WhatsApp.");
    } catch {
      onToast("Falha ao verificar os números.");
    } finally {
      setVerificandoNumeros(false);
    }
  }

  function removerSemWhatsapp() {
    if (semWhatsapp.size === 0) return;
    setSelecionados((prev) => {
      const next = new Set(prev);
      semWhatsapp.forEach((id) => next.delete(id));
      return next;
    });
    setSemWhatsapp(new Set());
    onToast("Números sem WhatsApp removidos da seleção.");
  }

  function estadoVisual(n?: NumeroStatus): { label: string; classe: "ok" | "wait" | "off" } {
    if (n?.connected) return { label: "Conectado", classe: "ok" };
    const s = (n?.status || "desconectado").toLowerCase();
    if (s === "indisponivel") return { label: "Indisponível", classe: "off" };
    return { label: "Desconectado", classe: "off" };
  }

  // Formata o número conectado (vem como 55 + DDD + número) para (DD) 9XXXX-XXXX.
  function formatarNumeroConectado(num?: string): string {
    let d = String(num || "").replace(/\D+/g, "");
    if (!d) return "";
    if (d.startsWith("55") && d.length > 11) d = d.slice(2);
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return d;
  }

  return (
    <div id="tab-whatsapp" className="tab-conteudo ativo wa">
      <div className="painel-header compact"><h3 className="painel-subtitulo">WhatsApp — Disparo de Mensagens</h3></div>

      {!configurado ? (
        <div className="wa-aviso">
          <strong>WhatsApp não configurado</strong>
          <p>
            Defina no <code>.env</code>: <code>WHATSAPP_API_URL</code>, <code>WHATSAPP_API_TOKEN</code>,
            <code>WHATSAPP_SESSAO_1</code> e <code>WHATSAPP_SESSAO_2</code>, depois reinicie o site.
          </p>
        </div>
      ) : (
        <>
          {/* Status do WhatsApp (sessão única — reconecte o aparelho de quem vai enviar) */}
          {(() => {
            const n = numeros.find((x) => x.slot === "1");
            const ev = estadoVisual(n);
            return (
              <div className="wa-numeros">
                <div className={`wa-card wa-card--${ev.classe}`}>
                  <div className="wa-card__top">
                    <span className="wa-card__icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </span>
                    <div>
                      <span className="wa-card__title">WhatsApp conectado</span>
                      <span className={`wa-pill wa-pill--${ev.classe}`}><i className="wa-dot" />{ev.label}</span>
                    </div>
                  </div>
                  {n?.connected && n?.number ? (
                    <p className="wa-card__numero">Número conectado: <strong>{formatarNumeroConectado(n.number)}</strong></p>
                  ) : null}
                  <div className="wa-card__actions">
                    {n?.connected ? (
                      <button type="button" className="wa-btn wa-btn--danger" onClick={() => void desconectar("1")} disabled={desconectando}>
                        {desconectando ? "Desconectando…" : "Desconectar"}
                      </button>
                    ) : (
                      <button type="button" className="wa-btn wa-btn--primary" onClick={() => conectar("1")}>
                          Conectar (QR)
                        </button>
                    )}
                  </div>
                  {n?.erro ? <small className="wa-card__erro">{n.erro}</small> : null}
                </div>
                <div className="wa-card wa-card--info wa-card--hint">
                  <p className="wa-card__title" style={{ marginBottom: 6 }}>Como enviar por lista</p>
                  <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                    Conecte aqui o WhatsApp da pessoa, filtre os convidados pela <strong>Lista</strong> dela e dispare.
                    Para outra lista, é só <strong>trocar o aparelho</strong> (Conectar/QR) e repetir.
                  </p>
                </div>
              </div>
            );
          })()}
          <div className="wa-row wa-row--end">
            <button type="button" className="wa-btn wa-btn--ghost" onClick={() => { void carregarStatus(); void carregarContatos(); }} disabled={carregandoStatus}>↻ Atualizar status</button>
          </div>

          {/* Modelos de mensagem */}
          <section className="wa-panel">
            <header className="wa-panel__head wa-panel__head--row">
              <div>
                <h4>Modelos de mensagem</h4>
                <p>Crie modelos prontos para escolher na hora de disparar.</p>
              </div>
              <button type="button" className="wa-btn wa-btn--primary" onClick={abrirCriarModelo}>+ Novo modelo</button>
            </header>
            {modelos.length ? (
              <div className="wa-modelos-grid">
                {modelos.map((m) => (
                  <div key={m.id} className="wa-modelo-card">
                    <div className="wa-modelo-card__head">
                      <strong>{m.nome}</strong>
                      <div className="wa-modelo-card__actions">
                        <button type="button" className="wa-link" onClick={() => abrirEditarModelo(m)}>editar</button>
                        <button type="button" className="wa-link wa-link--danger" onClick={() => void excluirModeloMsg(m.id)}>excluir</button>
                      </div>
                    </div>
                    <p className="wa-modelo-card__preview">{m.mensagem.slice(0, 120)}{m.mensagem.length > 120 ? "..." : ""}</p>
                    <div className="wa-modelo-card__footer">
                      {m.pdf
                        ? <><span className="wa-pill wa-pill--ok"><i className="wa-dot" />PDF anexo</span><a className="wa-link" href={`/convite-whatsapp?modelo=${m.id}`} target="_blank" rel="noreferrer">ver</a><button type="button" className="wa-link wa-link--danger" onClick={() => void removerPdfModelo(m.id)}>remover</button></>
                        : <span className="wa-pill wa-pill--off"><i className="wa-dot" />Sem PDF</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="wa-empty" style={{ padding: "1rem" }}>Nenhum modelo salvo. Clique em &quot;+ Novo modelo&quot; para criar.</p>
            )}
          </section>

          {/* Seleção de destinatários */}
          <section className="wa-panel">
            <header className="wa-panel__head">
              <h4>Destinatários</h4>
              <p>
                <strong>{destinatarios.length}</strong> selecionado(s) de {totalSelecionaveis} convidado(s)
                {" · "}exibindo {contatosFiltrados.length} ({selecionadosNoFiltro} marcado{selecionadosNoFiltro === 1 ? "" : "s"} aqui)
              </p>
            </header>
            <div className="wa-controls">
              <input className="wa-input wa-input--grow" placeholder="Buscar nome ou telefone…" value={busca} onChange={(e) => setBusca(e.target.value)} />
              <select value={filtroLista} onChange={(e) => setFiltroLista(e.target.value)}>
                <option value="todas">Todas as listas</option>
                {LISTAS.map((l) => <option key={l.key} value={l.key}>Lista de {l.label}</option>)}
                <option value="sem">Sem lista</option>
              </select>
              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as "todos" | "confirmado" | "pendente")}>
                <option value="todos">Todos</option>
                <option value="confirmado">Confirmados</option>
                <option value="pendente">Pendentes</option>
              </select>
              <button type="button" className="wa-btn wa-btn--ghost" onClick={() => selecionarVisiveis(true)}>Marcar visíveis</button>
              <button type="button" className="wa-btn wa-btn--ghost" onClick={() => selecionarVisiveis(false)}>Limpar</button>
              <button type="button" className="wa-btn wa-btn--ghost" onClick={() => void verificarNumeros()} disabled={verificandoNumeros || destinatarios.length === 0}>
                {verificandoNumeros ? "Verificando…" : "Verificar números"}
              </button>
              {semWhatsapp.size > 0 ? (
                <button type="button" className="wa-btn wa-btn--ghost wa-btn--danger" onClick={removerSemWhatsapp}>Remover {semWhatsapp.size} sem WhatsApp</button>
              ) : null}
            </div>
            <div className="wa-table-wrap">
              <table className="wa-table">
                <thead><tr><th style={{ width: 36 }}></th><th>Nome</th><th>Telefone</th><th>Lista</th><th>Status</th></tr></thead>
                <tbody>
                  {contatosFiltrados.length ? contatosFiltrados.map((c) => {
                    const lst = LISTAS.find((l) => l.key === c.lista);
                    return (
                      <tr key={c.id} className={c.telefoneValido ? "" : "wa-tr--off"}>
                        <td><input type="checkbox" checked={selecionados.has(c.id)} disabled={!c.telefoneValido} onChange={() => toggle(c.id)} /></td>
                        <td data-label="Nome">{c.nome}{semWhatsapp.has(c.id) ? <span className="wa-tag wa-tag--off" style={{ marginLeft: 8 }}>sem WhatsApp</span> : null}</td>
                        <td data-label="Telefone">{c.telefoneValido ? formatPhone(c.telefone) : <em>sem telefone</em>}</td>
                        <td data-label="Lista">{lst ? lst.label : <span style={{ opacity: 0.5 }}>—</span>}</td>
                        <td data-label="Status"><span className={`wa-tag wa-tag--${c.status === "confirmado" ? "ok" : "wait"}`}>{c.status === "confirmado" ? "Confirmado" : "Pendente"}</span></td>
                      </tr>
                    );
                  }) : <tr><td colSpan={5} className="wa-empty">Nenhum contato.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {/* Barra de ação fixa do disparo */}
          {job && (job.status === "processando" || job.status === "pausado") ? (
            <div className="wa-actionbar">
              <div className="wa-actionbar__info">
                <span className={`wa-pill wa-pill--${job.status === "pausado" ? "off" : "wait"}`}>
                  <i className="wa-dot" />{job.status === "pausado" ? "Pausado" : "Enviando"} {job.enviados + job.falhas}/{job.total}
                </span>
                {job.falhas > 0 ? <span className="wa-pill wa-pill--off" style={{ marginLeft: 8 }}><i className="wa-dot" />{job.falhas} falha(s)</span> : null}
              </div>
              <div className="wa-actionbar__acoes">
                {job.status === "processando"
                  ? <button type="button" className="wa-btn wa-btn--ghost" onClick={() => void acaoJobUI("pausar")}>Pausar</button>
                  : <button type="button" className="wa-btn wa-btn--send" onClick={() => void acaoJobUI("retomar")}>Retomar</button>}
                <button type="button" className="wa-btn wa-btn--danger" onClick={() => void acaoJobUI("cancelar")}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="wa-actionbar">
              <div className="wa-actionbar__info">
                <span>Pronto para enviar a <strong>{destinatarios.length}</strong> contato(s)</span>
              </div>
              <div className="wa-actionbar__acoes">
                <div className="wa-field wa-field--inline wa-field--actionbar">
                  <label htmlFor="wa-intervalo">Intervalo (s)</label>
                  <input id="wa-intervalo" type="number" min={0} max={120} value={intervalo} onChange={(e) => setIntervalo(Math.max(0, Number(e.target.value) || 0))} />
                </div>
                <button type="button" className="wa-btn wa-btn--send" onClick={abrirModalDisparo} disabled={destinatarios.length === 0 || criandoJob}>
                  {criandoJob ? "Iniciando…" : "Disparar mensagens"}
                </button>
              </div>
            </div>
          )}

          {job ? (
            <section className="wa-panel">
              <header className="wa-panel__head wa-panel__head--row">
                <h4>Resultado do envio</h4>
                <div className="wa-stats">
                  <span className="wa-pill wa-pill--ok"><i className="wa-dot" />{job.enviados} enviada(s)</span>
                  {job.falhas > 0 ? <span className="wa-pill wa-pill--off"><i className="wa-dot" />{job.falhas} falha(s)</span> : null}
                  <span className={`wa-pill wa-pill--${job.status === "concluido" ? "ok" : job.status === "cancelado" ? "off" : "wait"}`}>
                    <i className="wa-dot" />{rotuloStatusJob(job.status)}
                  </span>
                </div>
              </header>
              {job.motivo_pausa ? <p className="wa-job-aviso">{job.motivo_pausa}</p> : null}
              <div className="wa-progress"><div className="wa-progress__bar" style={{ width: `${pct}%` }} /></div>
              <div className="wa-table-wrap" style={{ maxHeight: 240 }}>
                <table className="wa-table">
                  <thead><tr><th>Contato</th><th>Telefone</th><th>Resultado</th></tr></thead>
                  <tbody>
                    {jobItens.length ? jobItens.map((it) => (
                      <tr key={it.id}>
                        <td data-label="Contato">{it.nome}</td>
                        <td data-label="Telefone">{formatPhone(it.telefone)}</td>
                        <td data-label="Resultado">{resultadoItem(it)}</td>
                      </tr>
                    )) : <tr><td colSpan={3} className="wa-empty">Aguardando os primeiros envios…</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {/* Histórico persistente de envios */}
          <section className="wa-panel">
            <header className="wa-panel__head wa-panel__head--row">
              <div>
                <h4>Histórico de envios</h4>
                <p>Quem já recebeu mensagem. Fica salvo mesmo depois de recarregar a página.</p>
              </div>
              <div className="wa-stats">
                <button type="button" className="wa-btn wa-btn--ghost" onClick={() => void carregarEnvios()}>↻ Atualizar</button>
                {envios.length ? <button type="button" className="wa-btn wa-btn--ghost" onClick={limparHistorico}>Limpar histórico</button> : null}
              </div>
            </header>
            <div className="wa-table-wrap" style={{ maxHeight: 320 }}>
              <table className="wa-table">
                <thead><tr><th>Data</th><th>Nome</th><th>Telefone</th><th>Lista</th><th>Resultado</th></tr></thead>
                <tbody>
                  {envios.length ? envios.map((e) => {
                    const lst = LISTAS.find((l) => l.key === (e.lista || ""));
                    return (
                      <tr key={e.id}>
                        <td data-label="Data">{fmtData(e.criado_em)}</td>
                        <td data-label="Nome">{e.nome}</td>
                        <td data-label="Telefone">{formatPhone(e.telefone)}</td>
                        <td data-label="Lista">{lst ? lst.label : <span style={{ opacity: 0.5 }}>—</span>}</td>
                        <td data-label="Resultado">{e.sucesso ? <span className="wa-tag wa-tag--ok">Enviado</span> : <span className="wa-tag wa-tag--off" title={e.erro || ""}>Falhou</span>}</td>
                      </tr>
                    );
                  }) : <tr><td colSpan={5} className="wa-empty">Nenhum envio registrado ainda.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Modal de conexão (QR / código) */}
      {conexao ? (
        <Modal id="modal-whatsapp-conexao" title="Conectar WhatsApp" onClose={fecharConexao}>
          <div className="wa-conn">
            {conexao.estado.connected ? (
              <p className="wa-conn__ok">✅ Conectado com sucesso!</p>
            ) : conexao.estado.pairingCode ? (
              <>
                <p className="wa-conn__hint">No celular: <strong>WhatsApp → Aparelhos conectados → Conectar com número de telefone</strong> e digite o código:</p>
                <p className="wa-conn__code">{conexao.estado.pairingCode}</p>
              </>
            ) : conexao.estado.qrImage ? (
              <>
                <p className="wa-conn__hint">Abra o WhatsApp → <strong>Aparelhos conectados</strong> → <strong>Conectar aparelho</strong> e escaneie:</p>
                <img className="wa-conn__qr" src={conexao.estado.qrImage} alt="QR Code do WhatsApp" />
                <p className="wa-conn__wait"><i className="wa-dot wa-dot--wait" /> Aguardando leitura…</p>
              </>
            ) : conexao.estado.lastError ? (
              <>
                <p className="wa-conn__erro">{conexao.estado.lastError}</p>
                <p className="wa-conn__hint">Confira se o número está correto (com DDD, sem o +55) e se a API do WhatsApp está online. Depois feche e tente de novo.</p>
              </>
            ) : (
              <p className="wa-conn__hint">Gerando código… ({conexao.estado.status})</p>
            )}
            <div className="wa-conn__actions">
              <button type="button" className="wa-btn" onClick={fecharConexao}>Fechar</button>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* Modal criar/editar modelo */}
      {modalModelo ? (
        <Modal id="modal-whatsapp-modelo" title={modalModelo.modo === "criar" ? "Novo modelo" : "Editar modelo"} onClose={() => setModalModelo(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="wa-field">
              <label style={{ fontWeight: 600, marginBottom: 4 }}>Nome do modelo</label>
              <input className="wa-input" placeholder="Ex.: Lembrete de confirmação" value={modeloNome} onChange={(e) => setModeloNome(e.target.value)} maxLength={100} />
            </div>
            <div className="wa-field">
              <label style={{ fontWeight: 600, marginBottom: 4 }}>Mensagem</label>
              <textarea rows={8} maxLength={4000} placeholder="Escreva a mensagem..." value={modeloTexto} onChange={(e) => setModeloTexto(e.target.value)} />
              <small className="wa-hint">Variáveis: <code>{VARIAVEIS_AJUDA}</code></small>
            </div>
            <div className="wa-field">
              <label style={{ fontWeight: 600, marginBottom: 4 }}>Convite (PDF)</label>
              {modalModelo.modo === "editar" && modalModelo.modelo?.pdf ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="wa-pill wa-pill--ok"><i className="wa-dot" />PDF atual</span>
                  <a className="wa-link" href={`/convite-whatsapp?modelo=${modalModelo.modelo.id}`} target="_blank" rel="noreferrer">ver</a>
                </div>
              ) : null}
              <label className="wa-file">
                <input ref={modeloPdfRef} type="file" accept="application/pdf,.pdf" />
              </label>
              <small className="wa-hint">Opcional. Se anexado, o PDF será enviado junto com a mensagem.</small>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="wa-btn" onClick={() => setModalModelo(null)}>Cancelar</button>
              <button type="button" className="wa-btn wa-btn--primary" onClick={salvarModeloMsg} disabled={salvandoModeloMsg}>
                {salvandoModeloMsg ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* Modal de disparo — preview + escolha de modelo */}
      {modalDisparo ? (
        <Modal id="modal-whatsapp-disparo" title="Escolha o modelo para enviar" onClose={() => setModalDisparo(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Enviando para <strong>{destinatarios.length}</strong> contato(s). Escolha qual modelo usar:
            </p>

            {modelos.map((m) => (
              <button key={m.id} type="button" className="wa-modelo-pick" onClick={() => void criarDisparo(m)} disabled={criandoJob}>
                <span className="wa-modelo-pick__head">
                  <strong>{m.nome}</strong>
                  {m.pdf ? <span className="wa-pill wa-pill--ok" style={{ fontSize: "0.75rem" }}><i className="wa-dot" />com PDF</span> : null}
                </span>
                <span className="wa-modelo-pick__preview">{aplicarVariaveis(m.mensagem, "Fulano")}</span>
                <span className="wa-modelo-pick__cta">Enviar esta mensagem →</span>
              </button>
            ))}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="wa-btn" onClick={() => setModalDisparo(false)}>Cancelar</button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
