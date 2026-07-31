"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Fase = "contagem" | "acontecendo" | "agradecimento" | "encerrado";
type Modo = "auto" | Fase;

type EventoConfig = {
  modo: Modo;
  inicio: string;
  fim: string;
  encerramento: string;
  acontecendoTitulo: string;
  acontecendoMensagem: string;
  agradecimentoTitulo: string;
  agradecimentoMensagem: string;
};

const ROTULO_FASE: Record<Fase, string> = {
  contagem: "Contagem regressiva",
  acontecendo: "Acontecendo agora",
  agradecimento: "Agradecimento (no topo da home)",
  encerrado: "Encerrado (site inteiro é o agradecimento)",
};

export function Evento({ onToast }: { onToast: (mensagem: string) => void }) {
  const [config, setConfig] = useState<EventoConfig | null>(null);
  const [faseAtual, setFaseAtual] = useState<Fase>("contagem");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/painel/evento", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setConfig(body.config);
        setFaseAtual(body.faseAtual);
      } else {
        onToast(body.erro || "Não foi possível carregar as fases do evento.");
      }
    } catch {
      onToast("Não foi possível carregar as fases do evento.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { void carregar(); }, []);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando) return;
    setSalvando(true);
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const res = await fetch("/api/painel/evento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setConfig(body.config);
        setFaseAtual(body.faseAtual);
        onToast("Fases do evento salvas.");
      } else {
        onToast(body.erro || "Não foi possível salvar.");
      }
    } catch {
      onToast("Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando || !config) {
    return (
      <div id="tab-evento" className="tab-conteudo ativo">
        <div className="painel-header compact"><h3 className="painel-subtitulo">Fases do Evento</h3></div>
        <div className="painel-card-form"><p>Carregando...</p></div>
      </div>
    );
  }

  return (
    <div id="tab-evento" className="tab-conteudo ativo rsvp-tab">
      <div className="painel-header compact">
        <h3 className="painel-subtitulo">Fases do Evento</h3>
      </div>

      <div className="painel-card-form rsvp-config-card">
        <div className="rsvp-status-card">
          <span className="rsvp-status-label">Exibindo agora no site</span>
          <strong>{ROTULO_FASE[faseAtual]}</strong>
        </div>

        <p className="painel-ajuda">
          O bloco do contador na home muda sozinho conforme o horário: a contagem regressiva vira
          <strong> Acontecendo agora</strong> no início, e <strong>Agradecimento</strong> no término.
          O restante do site não é afetado.
        </p>

        <form className="form-modal rsvp-deadline-form" onSubmit={salvar}>
          <label className="rsvp-date-field">
            <span>Modo</span>
            <select name="modo" defaultValue={config.modo}>
              <option value="auto">Automático (pelo horário)</option>
              <option value="contagem">Forçar: contagem regressiva</option>
              <option value="acontecendo">Forçar: acontecendo agora</option>
              <option value="agradecimento">Forçar: agradecimento</option>
              <option value="encerrado">Forçar: encerrado (site inteiro)</option>
            </select>
          </label>
          <p className="painel-ajuda">
            Use &quot;Forçar&quot; para testar antes ou corrigir na hora (se a cerimônia atrasar, por exemplo).
            Deixe em <strong>Automático</strong> no dia a dia.
          </p>

          <label className="rsvp-date-field">
            <span>Início: quando a contagem vira &quot;acontecendo&quot;</span>
            <input type="datetime-local" name="inicio" defaultValue={config.inicio} required />
          </label>

          <label className="rsvp-date-field">
            <span>Término: quando vira &quot;agradecimento&quot;</span>
            <input type="datetime-local" name="fim" defaultValue={config.fim} required />
          </label>

          <label className="rsvp-date-field">
            <span>Encerramento: quando o site inteiro vira a página de agradecimento</span>
            <input type="datetime-local" name="encerramento" defaultValue={config.encerramento} required />
          </label>
          <p className="painel-ajuda">
            A partir desta data, quem acessar o site vê <strong>apenas</strong> a mensagem de
            agradecimento: presentes, confirmação e recados deixam de aparecer.
          </p>

          <label className="rsvp-date-field">
            <span>Título: acontecendo agora</span>
            <input type="text" name="acontecendoTitulo" defaultValue={config.acontecendoTitulo} maxLength={120} required />
          </label>

          <label className="rsvp-date-field">
            <span>Mensagem: acontecendo agora</span>
            <textarea name="acontecendoMensagem" defaultValue={config.acontecendoMensagem} rows={3} maxLength={600} required />
          </label>

          <label className="rsvp-date-field">
            <span>Título: agradecimento</span>
            <input type="text" name="agradecimentoTitulo" defaultValue={config.agradecimentoTitulo} maxLength={120} required />
          </label>

          <label className="rsvp-date-field">
            <span>Mensagem: agradecimento</span>
            <textarea name="agradecimentoMensagem" defaultValue={config.agradecimentoMensagem} rows={3} maxLength={600} required />
          </label>

          <div className="rsvp-actions">
            <button className="toolbar-btn toolbar-btn--primary" type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar fases"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
