"use client";

import { useEffect, useState } from "react";

type BackupItem = { nome: string; tamanho: number; data: string };

export function Backups({ onToast }: { onToast: (mensagem: string) => void }) {
  const [itens, setItens] = useState<BackupItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/painel/backups", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) setItens(body.backups || []);
      else onToast(body.erro || "Não foi possível carregar os backups.");
    } catch {
      onToast("Não foi possível carregar os backups.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { void carregar(); }, []);

  async function gerar() {
    if (ocupado) return;
    setOcupado(true);
    onToast("Gerando backup...");
    try {
      const res = await fetch("/api/painel/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "gerar" }),
      });
      const body = await res.json().catch(() => ({}));
      onToast(res.ok ? "Backup gerado." : (body.erro || "Falha ao gerar backup."));
      if (res.ok) await carregar();
    } finally {
      setOcupado(false);
    }
  }

  function baixar(nome: string) {
    window.open(`/api/painel/backups?baixar=${encodeURIComponent(nome)}`, "_blank");
  }

  return (
    <div id="tab-backups" className="tab-conteudo ativo">
      <div className="painel-header compact"><h3 className="painel-subtitulo">Backups do Banco</h3></div>
      <div className="resumo-mini resumo-mini--stats">
        <span className="toolbar-pill"><span className="rp-label">Backups</span><span className="rp-num">{itens.length}</span></span>
        <span className="toolbar-pill"><span className="rp-label">Retenção</span><span className="rp-num rp-num--texto">2 dias (automático)</span></span>
      </div>
      <div className="barra-ferramentas barra-ferramentas--mini">
        <button type="button" className="toolbar-btn toolbar-btn--primary" onClick={gerar} disabled={ocupado}>Gerar backup agora</button>
        <button type="button" className="toolbar-btn" onClick={carregar} disabled={carregando || ocupado}>Atualizar</button>
      </div>
      <div className="tabela-container">
        <table>
          <thead><tr><th>Arquivo</th><th>Data</th><th>Tamanho</th><th>Ações</th></tr></thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={4} className="table-empty">Carregando...</td></tr>
            ) : itens.length ? itens.map((b) => (
              <tr key={b.nome}>
                <td data-label="Arquivo">{b.nome}</td>
                <td data-label="Data">{new Date(b.data).toLocaleString("pt-BR")}</td>
                <td data-label="Tamanho">{(b.tamanho / 1024).toFixed(0)} KB</td>
                <td data-label="Ações">
                  <button type="button" className="toolbar-btn" onClick={() => baixar(b.nome)} disabled={ocupado}>Baixar</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="table-empty">Nenhum backup ainda. É gerado automaticamente todo dia, ou clique em &quot;Gerar backup agora&quot;.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: "1rem", fontSize: "0.85rem", opacity: 0.8, lineHeight: 1.5 }}>
        Os backups são gerados automaticamente todo dia (mantém os 2 mais recentes). <strong>Baixar</strong> salva o arquivo <code>.sql</code> no seu computador.
      </p>
    </div>
  );
}
