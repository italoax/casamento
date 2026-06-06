"use client";

import { useState } from "react";

type LoginPayload = {
  usuario: string;
  senha: string;
};

export default function PainelLoginClient() {
  const [erro, setErro] = useState("");
  const [erro2fa, setErro2fa] = useState("");
  const [requires2fa, setRequires2fa] = useState(false);
  const [loginPayload, setLoginPayload] = useState<LoginPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [loading2fa, setLoading2fa] = useState(false);

  async function fazerLogin(payload: LoginPayload & { twofa_code?: string }) {
    const res = await fetch("/api/painel/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErro("");
    setErro2fa("");

    const form = new FormData(event.currentTarget);
    const payload = {
      usuario: String(form.get("usuario") || ""),
      senha: String(form.get("senha") || ""),
    };

    const { res, data } = await fazerLogin(payload);
    setLoading(false);

    if (res.ok && data.sucesso) {
      window.location.href = "/painel";
      return;
    }

    if (data.requires2fa) {
      setLoginPayload(payload);
      setRequires2fa(true);
      setErro2fa(data.erro || "Informe o código do Google Authenticator.");
      return;
    }

    setErro(data.erro || "Não foi possível entrar.");
  }

  async function submit2fa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loginPayload) return;

    setLoading2fa(true);
    setErro2fa("");

    const form = new FormData(event.currentTarget);
    const twofaCode = String(form.get("twofa_code") || "").replace(/\D+/g, "");
    const { res, data } = await fazerLogin({ ...loginPayload, twofa_code: twofaCode });
    setLoading2fa(false);

    if (res.ok && data.sucesso) {
      window.location.href = "/painel";
      return;
    }

    setErro2fa(data.erro || "Código 2FA inválido.");
  }

  function fecharModal2fa() {
    setRequires2fa(false);
    setErro2fa("");
  }

  return (
    <>
      <div className="login-card">
        <h2>Acesso Restrito</h2>
        {erro ? <div className="erro-msg">{erro}</div> : null}
        <form onSubmit={submit}>
          <div className="grupo-input">
            <label>Usuário</label>
            <input type="text" name="usuario" required autoFocus />
          </div>
          <div className="grupo-input">
            <label>Senha</label>
            <input type="password" name="senha" required />
          </div>
          <button type="submit" className="botao botao-primario" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>

      {requires2fa ? (
        <div className="modal-2fa-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-2fa-title">
          <div className="modal-2fa-card">
            <button type="button" className="modal-2fa-close" onClick={fecharModal2fa} aria-label="Fechar">
              ×
            </button>
            <h3 id="modal-2fa-title">Código 2FA</h3>
            <p>Digite o código de 6 números do Google Authenticator.</p>
            {erro2fa ? <div className="erro-msg erro-msg--modal">{erro2fa}</div> : null}
            <form onSubmit={submit2fa}>
              <div className="grupo-input">
                <label>Código 2FA</label>
                <input
                  type="text"
                  name="twofa_code"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  required
                />
              </div>
              <button type="submit" className="botao botao-primario" disabled={loading2fa}>
                {loading2fa ? "Validando..." : "Confirmar código"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
