"use client";

import { useCallback, useEffect, useState } from "react";

type Foto = { id: number; nome: string; email?: string; arquivo: string; aprovado: number; created_at: string };

export function FestaFotos({ onToast }: { onToast: (m: string) => void }) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [urlFesta, setUrlFesta] = useState("");
  const [filtro, setFiltro] = useState<"pendentes" | "publicadas" | "todas">("pendentes");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/painel/festa", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.sucesso) setFotos(body.fotos || []);
      else onToast(body?.erro || "Não foi possível carregar as fotos.");
    } catch {
      onToast("Não foi possível carregar as fotos.");
    } finally {
      setCarregando(false);
    }
  }, [onToast]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { if (typeof window !== "undefined") setUrlFesta(`${window.location.origin}/festa`); }, []);

  async function excluir(id: number) {
    if (!confirm("Apagar esta foto do mural? Ela some para todos.")) return;
    try {
      const res = await fetch(`/api/painel/festa?id=${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.sucesso) {
        setFotos((atual) => atual.filter((f) => f.id !== id));
        onToast("Foto removida.");
      } else {
        onToast(body?.erro || "Falha ao remover a foto.");
      }
    } catch {
      onToast("Falha ao remover a foto.");
    }
  }

  async function definirAprovacao(id: number, aprovado: boolean) {
    try {
      const res = await fetch("/api/painel/festa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, aprovado }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.sucesso) {
        setFotos((atual) => atual.map((f) => (f.id === id ? { ...f, aprovado: aprovado ? 1 : 0 } : f)));
        onToast(body.mensagem || "Atualizado.");
      } else {
        onToast(body?.erro || "Falha ao atualizar a foto.");
      }
    } catch {
      onToast("Falha ao atualizar a foto.");
    }
  }

  function copiarLink() {
    if (!urlFesta) return;
    navigator.clipboard?.writeText(urlFesta).then(() => onToast("Link copiado.")).catch(() => onToast(urlFesta));
  }

  const pendentes = fotos.filter((f) => Number(f.aprovado) === 0).length;
  const publicadas = fotos.length - pendentes;
  const visiveis = fotos.filter((f) =>
    filtro === "todas" ? true : filtro === "pendentes" ? Number(f.aprovado) === 0 : Number(f.aprovado) === 1,
  );

  return (
    <div id="tab-festa" className="tab-conteudo ativo">
      <div className="painel-header compact"><h3 className="painel-subtitulo">Fotos da Festa</h3></div>

      <div className="festa-admin">
        <div className="festa-admin__qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/api/painel/festa/qr" alt="QR Code do mural de fotos" width={220} height={220} />
          <div className="festa-admin__qr-info">
            <p className="festa-admin__hint">Imprima ou exiba este QR Code na festa. Ao escanear, o convidado abre o mural para enviar e ver as fotos.</p>
            <div className="festa-admin__acoes">
              <a className="toolbar-btn" href="/api/painel/festa/qr" download="qrcode-fotos-festa.png">Baixar QR Code</a>
              <a className="toolbar-btn" href="/festa" target="_blank" rel="noreferrer">Abrir mural</a>
              <button type="button" className="toolbar-btn" onClick={copiarLink}>Copiar link</button>
            </div>
            {urlFesta ? <code className="festa-admin__url">{urlFesta}</code> : null}
          </div>
        </div>
      </div>

      <div className="resumo-mini" style={{ marginTop: 16 }}>
        <span className={`toolbar-pill${pendentes ? " toolbar-pill--alerta" : ""}`}>
          Aguardando aprovação: {pendentes}
        </span>
        <span className="toolbar-pill">Publicadas: {publicadas}</span>
        <button type="button" className={`toolbar-btn${filtro === "pendentes" ? " toolbar-btn--primary" : ""}`} onClick={() => setFiltro("pendentes")}>Pendentes</button>
        <button type="button" className={`toolbar-btn${filtro === "publicadas" ? " toolbar-btn--primary" : ""}`} onClick={() => setFiltro("publicadas")}>Publicadas</button>
        <button type="button" className={`toolbar-btn${filtro === "todas" ? " toolbar-btn--primary" : ""}`} onClick={() => setFiltro("todas")}>Todas</button>
        <button type="button" className="toolbar-btn" onClick={() => void carregar()}>↻ Atualizar</button>
      </div>

      <p className="festa-admin__hint" style={{ marginTop: 8 }}>
        As fotos enviadas pelos convidados entram <strong>pendentes</strong> e só aparecem no mural
        depois que você publica.
      </p>

      {carregando ? (
        <p className="table-empty">Carregando fotos…</p>
      ) : visiveis.length === 0 ? (
        <p className="table-empty">
          {filtro === "pendentes" ? "Nenhuma foto aguardando aprovação." : filtro === "publicadas" ? "Nenhuma foto publicada ainda." : "Nenhuma foto enviada ainda."}
        </p>
      ) : (
        <div className="festa-admin__grid">
          {visiveis.map((f) => (
            <figure className={`festa-admin__item${Number(f.aprovado) === 0 ? " festa-admin__item--pendente" : ""}`} key={f.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <a href={`/${f.arquivo}`} target="_blank" rel="noreferrer"><img src={`/${f.arquivo}`} alt={`Foto de ${f.nome}`} loading="lazy" /></a>
              {Number(f.aprovado) === 0 ? <span className="festa-admin__selo">Pendente</span> : null}
              <figcaption>
                <span className="festa-admin__nome" title={f.email || ""}>{f.nome}</span>
                <span className="festa-admin__botoes">
                  {Number(f.aprovado) === 0 ? (
                    <button type="button" className="btn-acao btn-ok" aria-label="Publicar foto" title="Publicar no mural" onClick={() => void definirAprovacao(f.id, true)}>✓</button>
                  ) : (
                    <button type="button" className="btn-acao" aria-label="Despublicar foto" title="Tirar do mural" onClick={() => void definirAprovacao(f.id, false)}>↩</button>
                  )}
                  <button type="button" className="btn-acao btn-trash" aria-label="Excluir foto" onClick={() => void excluir(f.id)}>×</button>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
