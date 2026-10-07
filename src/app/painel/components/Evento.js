"use client";
import { useEffect, useState } from "react";
const ROTULO_FASE = {
    contagem: "Contagem regressiva",
    acontecendo: "Acontecendo agora",
    agradecimento: "Agradecimento (no topo da home)",
    encerrado: "Encerrado (site inteiro é o agradecimento)",
};
export function Evento({ onToast }) {
    const [config, setConfig] = useState(null);
    const [faseAtual, setFaseAtual] = useState("contagem");
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
            }
            else {
                onToast(body.erro || "Não foi possível carregar as fases do evento.");
            }
        }
        catch {
            onToast("Não foi possível carregar as fases do evento.");
        }
        finally {
            setCarregando(false);
        }
    }
    useEffect(() => { void carregar(); }, []);
    async function salvar(event) {
        event.preventDefault();
        const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
        await salvarDados(payload);
    }
    async function salvarDados(payload) {
        if (salvando)
            return;
        setSalvando(true);
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
                onToast("Fase do evento atualizada.");
                if ("BroadcastChannel" in window) {
                    const canal = new BroadcastChannel("evento-fase");
                    canal.postMessage({ fase: body.faseAtual });
                    canal.close();
                }
            }
            else {
                onToast(body.erro || "Não foi possível salvar.");
            }
        }
        catch {
            onToast("Não foi possível salvar.");
        }
        finally {
            setSalvando(false);
        }
    }
    if (carregando || !config) {
        return (<div id="tab-evento" className="tab-conteudo ativo">
        <div className="painel-header compact"><h3 className="painel-subtitulo">Fases do Evento</h3></div>
        <div className="painel-card-form"><p>Carregando...</p></div>
      </div>);
    }
    return (<div id="tab-evento" className="tab-conteudo ativo rsvp-tab">
      <div className="painel-header compact">
        <h3 className="painel-subtitulo">Fases do Evento</h3>
      </div>

      <div className="painel-card-form rsvp-config-card">
        <div className="rsvp-status-card">
          <span className="rsvp-status-label">Exibindo agora no site</span>
          <strong>{ROTULO_FASE[faseAtual]}</strong>
        </div>

        <form className="form-modal rsvp-deadline-form" onSubmit={salvar}>
          <label className="rsvp-date-field">
            <span>Fase do evento</span>
            <select name="modo" value={config.modo} disabled={salvando} onChange={event => void salvarDados({ modo: event.target.value })}>
              <option value="contagem">Contagem regressiva</option>
              <option value="acontecendo">Acontecendo agora</option>
              <option value="agradecimento">Agradecimento</option>
              <option value="encerrado">Encerrado (site inteiro)</option>
            </select>
          </label>

          <label className="rsvp-date-field">
            <span>Título: acontecendo agora</span>
            <input type="text" name="acontecendoTitulo" defaultValue={config.acontecendoTitulo} maxLength={120} required/>
          </label>

          <label className="rsvp-date-field">
            <span>Mensagem: acontecendo agora</span>
            <textarea name="acontecendoMensagem" defaultValue={config.acontecendoMensagem} rows={3} maxLength={600} required/>
          </label>

          <label className="rsvp-date-field">
            <span>Título: agradecimento</span>
            <input type="text" name="agradecimentoTitulo" defaultValue={config.agradecimentoTitulo} maxLength={120} required/>
          </label>

          <label className="rsvp-date-field">
            <span>Mensagem: agradecimento</span>
            <textarea name="agradecimentoMensagem" defaultValue={config.agradecimentoMensagem} rows={3} maxLength={600} required/>
          </label>

          <div className="rsvp-actions">
            <button className="toolbar-btn toolbar-btn--primary" type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar textos"}
            </button>
          </div>
        </form>
      </div>
    </div>);
}
