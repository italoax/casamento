"use client";

import { useEffect, useState } from "react";

type SetupData = { qr: string; secret: string };

/**
 * Seção "Segurança" do painel: ativa/desativa a verificação em 2 etapas (2FA / TOTP)
 * do usuário logado. O backend fica em /api/painel/2fa.
 */
export function Seguranca({ onToast }: { onToast: (mensagem: string) => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function carregarStatus() {
    const res = await fetch("/api/painel/2fa", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      setEnabled(Boolean(data.enabled));
    }
  }

  useEffect(() => {
    void carregarStatus();
  }, []);

  async function chamar(payload: Record<string, unknown>) {
    const res = await fetch("/api/painel/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function iniciarSetup() {
    setLoading(true);
    const { res, data } = await chamar({ action: "setup" });
    setLoading(false);
    if (!res.ok) {
      onToast(data.erro || "Não foi possível iniciar o 2FA.");
      return;
    }
    setSetup({ qr: data.qr, secret: data.secret });
    setCode("");
  }

  async function confirmar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const { res, data } = await chamar({ action: "enable", twofa_code: code });
    setLoading(false);
    if (!res.ok) {
      onToast(data.erro || "Código inválido.");
      return;
    }
    onToast("Verificação em 2 etapas ativada!");
    setSetup(null);
    setEnabled(true);
  }

  async function desativar() {
    const codigo = window.prompt("Para desativar o 2FA, digite o código atual do seu app autenticador:");
    if (!codigo) return;
    setLoading(true);
    const { res, data } = await chamar({ action: "disable", twofa_code: codigo });
    setLoading(false);
    if (!res.ok) {
      onToast(data.erro || "Código inválido.");
      return;
    }
    onToast("Verificação em 2 etapas desativada.");
    setEnabled(false);
    setSetup(null);
  }

  function cancelarSetup() {
    setSetup(null);
    setCode("");
  }

  return (
    <div className="tab-conteudo ativo">
      <div className="painel-header compact"><h3 className="painel-subtitulo">Verificação em 2 etapas (2FA)</h3></div>

      <div className="seguranca-card">
        <p className="seguranca-descricao">
          Protege o login do painel com um código de 6 números que muda a cada 30 segundos,
          gerado no <strong>Google Authenticator</strong>, <strong>Authy</strong> ou app similar.
          Mesmo que descubram sua senha, ninguém entra sem o celular.
        </p>

        <div className="seguranca-status">
          <span>Status:</span>
          {enabled === null ? (
            <span className="status-badge">Carregando…</span>
          ) : enabled ? (
            <span className="status-badge confirmado">Ativo</span>
          ) : (
            <span className="status-badge oculto-badge">Desativado</span>
          )}
        </div>

        {/* Já ativo: só permite desativar */}
        {enabled && !setup ? (
          <button type="button" className="toolbar-btn" onClick={desativar} disabled={loading}>
            Desativar 2FA
          </button>
        ) : null}

        {/* Desativado e sem setup em andamento: botão para começar */}
        {enabled === false && !setup ? (
          <button type="button" className="toolbar-btn toolbar-btn--primary" onClick={iniciarSetup} disabled={loading}>
            {loading ? "Gerando…" : "Ativar 2FA"}
          </button>
        ) : null}

        {/* Fluxo de ativação: QR + confirmação do código */}
        {setup ? (
          <div className="seguranca-setup">
            <ol className="seguranca-passos">
              <li>Abra o app autenticador e escaneie o QR Code abaixo.</li>
              <li>Digite o código de 6 números que aparecer no app.</li>
            </ol>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="seguranca-qr" src={setup.qr} alt="QR Code para o app autenticador" width={240} height={240} />

            <p className="seguranca-manual">
              Não consegue escanear? Digite esta chave manualmente:<br />
              <code>{setup.secret}</code>
            </p>

            <form className="seguranca-confirm" onSubmit={confirmar}>
              <div className="grupo-input">
                <label>Código do app</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D+/g, ""))}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="000000"
                  autoFocus
                  required
                />
              </div>
              <div className="seguranca-acoes">
                <button type="submit" className="toolbar-btn toolbar-btn--primary" disabled={loading || code.length < 6}>
                  {loading ? "Validando…" : "Confirmar e ativar"}
                </button>
                <button type="button" className="toolbar-btn" onClick={cancelarSetup} disabled={loading}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
