"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Foto = { id: number; nome: string; arquivo: string; created_at: string };
type VerifEtapa = null | "email" | "codigo";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi }
}

let turnstilePromise: Promise<TurnstileApi | null> | null = null;
function carregarTurnstile(): Promise<TurnstileApi | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.turnstile?.render) return Promise.resolve(window.turnstile);
  if (turnstilePromise) return turnstilePromise;
  turnstilePromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return turnstilePromise;
}

type Props = { turnstileSiteKey: string; cover: string; dataFesta: string };

export function FestaClient({ turnstileSiteKey, cover, dataFesta }: Props) {
  // Envio da foto (sheet)
  const [sheetAberto, setSheetAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string>("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Verificação por e-mail (modal)
  const [verificado, setVerificado] = useState(false);
  const [verifEtapa, setVerifEtapa] = useState<VerifEtapa>(null);
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [ocupadoVerif, setOcupadoVerif] = useState(false);
  const [msgVerif, setMsgVerif] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Galeria
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [carregandoFotos, setCarregandoFotos] = useState(true);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const turnstileBox = useRef<HTMLDivElement | null>(null);
  const turnstileId = useRef<string | null>(null);
  const tokenRef = useRef<string>("");

  useEffect(() => {
    document.documentElement.classList.remove("pagina-carregando");
    document.body.classList.remove("pagina-carregando");
  }, []);

  const carregarFotos = useCallback(async () => {
    try {
      const res = await fetch("/api/festa/fotos", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.sucesso) setFotos(body.fotos || []);
    } catch { /* silencioso */ } finally { setCarregandoFotos(false); }
  }, []);

  useEffect(() => {
    void carregarFotos();
    (async () => {
      try {
        const res = await fetch("/api/festa/verificar", { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (res.ok && body?.verificado) { setVerificado(true); setEmail(body.email || ""); }
      } catch { /* segue não verificado */ }
    })();
  }, [carregarFotos]);

  useEffect(() => {
    if (verifEtapa !== "email") return;
    let cancelado = false;
    void carregarTurnstile().then((ts) => {
      if (cancelado || !ts || !turnstileBox.current || turnstileId.current) return;
      turnstileId.current = ts.render(turnstileBox.current, {
        sitekey: turnstileSiteKey,
        action: "festa",
        callback: (t: string) => { tokenRef.current = t; },
        "expired-callback": () => { tokenRef.current = ""; },
        "error-callback": () => { tokenRef.current = ""; },
      });
    });
    return () => { cancelado = true; };
  }, [verifEtapa, turnstileSiteKey]);

  function limparTurnstile() {
    tokenRef.current = "";
    try { if (window.turnstile && turnstileId.current) window.turnstile.remove(turnstileId.current); } catch { /* ignore */ }
    turnstileId.current = null;
  }

  function abrirSeletor() {
    setMsg(null);
    fileRef.current?.click();
  }

  function escolherArquivo(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0] || null;
    setArquivo(f);
    if (f) {
      // Usa data URL (não blob:) porque o CSP do site bloqueia blob: em imagens.
      const reader = new FileReader();
      reader.onload = () => setPrevia(typeof reader.result === "string" ? reader.result : "");
      reader.readAsDataURL(f);
      setMsg(null);
      setSheetAberto(true);
    } else {
      setPrevia("");
    }
  }

  function limparFoto() {
    setArquivo(null);
    setPrevia("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function fecharSheet() { setSheetAberto(false); limparFoto(); }

  async function enviarFotoAgora(): Promise<boolean> {
    if (!arquivo) return false;
    const fd = new FormData();
    fd.append("nome", nome.trim());
    fd.append("foto", arquivo);
    const res = await fetch("/api/festa/fotos", { method: "POST", body: fd });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.sucesso && body.foto) {
      setFotos((atual) => [body.foto as Foto, ...atual]);
      limparFoto();
      setSheetAberto(false);
      setMsg({ tipo: "ok", texto: "Foto enviada! Obrigado por compartilhar 💛" });
      return true;
    }
    if (res.status === 401) { setVerificado(false); setVerifEtapa("email"); return false; }
    setMsg({ tipo: "erro", texto: body?.erro || "Não foi possível enviar a foto." });
    return false;
  }

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando || ocupadoVerif) return;
    setMsg(null);
    if (nome.trim().length < 2) { setMsg({ tipo: "erro", texto: "Digite seu nome." }); return; }
    if (!arquivo) { setMsg({ tipo: "erro", texto: "Escolha uma foto." }); return; }
    if (!verificado) { setMsgVerif(null); setVerifEtapa("email"); return; }
    setEnviando(true);
    try { await enviarFotoAgora(); } finally { setEnviando(false); }
  }

  async function pedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (ocupadoVerif) return;
    setMsgVerif(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setMsgVerif({ tipo: "erro", texto: "Digite um e-mail válido." }); return; }
    if (!tokenRef.current) { setMsgVerif({ tipo: "erro", texto: "Aguarde a verificação de segurança." }); return; }
    setOcupadoVerif(true);
    try {
      const res = await fetch("/api/festa/verificar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), turnstileToken: tokenRef.current }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.sucesso) { setVerifEtapa("codigo"); setMsgVerif({ tipo: "ok", texto: "Código enviado! Confira seu e-mail (e o spam)." }); }
      else { setMsgVerif({ tipo: "erro", texto: body?.erro || "Não foi possível enviar o código." }); limparTurnstile(); }
    } catch { setMsgVerif({ tipo: "erro", texto: "Falha de conexão. Tente novamente." }); }
    finally { setOcupadoVerif(false); }
  }

  async function confirmarCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (ocupadoVerif) return;
    setMsgVerif(null);
    if (codigo.replace(/\D/g, "").length !== 6) { setMsgVerif({ tipo: "erro", texto: "Digite os 6 dígitos do código." }); return; }
    setOcupadoVerif(true);
    try {
      const res = await fetch("/api/festa/verificar/confirmar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), codigo: codigo.replace(/\D/g, "") }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.sucesso) {
        setVerificado(true); setCodigo(""); setVerifEtapa(null); limparTurnstile();
        setEnviando(true);
        try { await enviarFotoAgora(); } finally { setEnviando(false); }
      } else { setMsgVerif({ tipo: "erro", texto: body?.erro || "Código inválido." }); }
    } catch { setMsgVerif({ tipo: "erro", texto: "Falha de conexão. Tente novamente." }); }
    finally { setOcupadoVerif(false); }
  }

  function fecharModal() { setVerifEtapa(null); setMsgVerif(null); setCodigo(""); limparTurnstile(); }

  return (
    <div className="festa">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={escolherArquivo} hidden />

      <section className="festa-cover" style={{ backgroundImage: `url(${cover})` }}>
        <div className="festa-cover__veu" />
        <div className="festa-cover__conteudo">
          <p className="festa-cover__eyebrow">Álbum da festa</p>
          <h1 className="festa-cover__nomes">Emanuelle <span className="festa-cover__e">&amp;</span> Ítalo</h1>
          <p className="festa-cover__data"><span className="festa-cover__coracao" aria-hidden="true">💛</span> {dataFesta}</p>
          <div className="festa-cover__stats">
            <span className="festa-chip"><strong>{fotos.length}</strong> {fotos.length === 1 ? "foto" : "fotos"}</span>
            {verificado ? <span className="festa-chip festa-chip--ok">✓ verificado</span> : null}
          </div>
        </div>
      </section>

      <main className="festa-corpo">
        <div className="festa-intro">
          <h2 className="festa-secao__titulo">Fotos da festa</h2>
          <p className="festa-secao__sub">Toque em <strong>Upload</strong> para enviar a sua. Aparece aqui na hora! 📸</p>
        </div>

        {msg && !sheetAberto ? <p className={`festa-msg festa-msg--${msg.tipo}`}>{msg.texto}</p> : null}

        {carregandoFotos ? (
          <p className="festa-galeria__vazio">Carregando fotos…</p>
        ) : fotos.length === 0 ? (
          <div className="festa-galeria__vazio festa-galeria__vazio--card">
            <span className="festa-galeria__emoji">📷</span>
            Ainda não há fotos.<br />Seja o primeiro a compartilhar!
          </div>
        ) : (
          <div className="festa-grid">
            {fotos.map((f) => (
              <figure className="festa-item" key={f.id}>
                <a href={`/${f.arquivo}`} target="_blank" rel="noreferrer">
                  <img src={`/${f.arquivo}`} alt={`Foto de ${f.nome}`} loading="lazy" />
                </a>
                <figcaption>{f.nome}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </main>

      {/* Barra fixa com o botão Upload */}
      <div className="festa-uploadbar">
        <button type="button" className="festa-uploadbtn" onClick={abrirSeletor}>
          <span className="festa-uploadbtn__icone" aria-hidden="true">📷</span> Upload
        </button>
      </div>

      {/* Sheet de envio (preview + nome + enviar) */}
      {sheetAberto ? (
        <div className="festa-sheet" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) fecharSheet(); }}>
          <form className="festa-sheet__caixa" onSubmit={aoEnviar}>
            <div className="festa-sheet__alca" />
            <h3 className="festa-sheet__titulo">Enviar foto</h3>
            {previa ? <img className="festa-sheet__previa" src={previa} alt="Prévia da foto" /> : null}
            <button type="button" className="festa-link" onClick={abrirSeletor}>Trocar foto</button>
            <label className="festa-campo">
              <span>Seu nome</span>
              <input type="text" value={nome} maxLength={80} placeholder="Como você quer aparecer" onChange={(e) => setNome(e.target.value)} />
            </label>
            {verificado ? <p className="festa-passo festa-passo--ok">✓ E-mail verificado neste aparelho</p> : null}
            {msg ? <p className={`festa-msg festa-msg--${msg.tipo}`}>{msg.texto}</p> : null}
            <button type="submit" className="festa-enviar" disabled={enviando || ocupadoVerif}>{enviando ? "Enviando…" : "Enviar foto"}</button>
            <button type="button" className="festa-link" onClick={fecharSheet}>Cancelar</button>
          </form>
        </div>
      ) : null}

      {/* Modal de verificação por e-mail */}
      {verifEtapa ? (
        <div className="festa-modal" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) fecharModal(); }}>
          <div className="festa-modal__caixa">
            <button type="button" className="festa-modal__fechar" aria-label="Fechar" onClick={fecharModal}>×</button>
            {verifEtapa === "email" ? (
              <form onSubmit={pedirCodigo}>
                <h3 className="festa-modal__titulo">Confirme seu e-mail</h3>
                <p className="festa-passo">Só uma vez neste aparelho. Vamos enviar um código para liberar o envio da sua foto.</p>
                <label className="festa-campo">
                  <span>Seu e-mail</span>
                  <input type="email" inputMode="email" autoComplete="email" value={email} maxLength={160} placeholder="voce@email.com" onChange={(e) => setEmail(e.target.value)} />
                </label>
                <div ref={turnstileBox} className="festa-turnstile" />
                {msgVerif ? <p className={`festa-msg festa-msg--${msgVerif.tipo}`}>{msgVerif.texto}</p> : null}
                <button type="submit" className="festa-enviar" disabled={ocupadoVerif}>{ocupadoVerif ? "Enviando…" : "Enviar código"}</button>
              </form>
            ) : (
              <form onSubmit={confirmarCodigo}>
                <h3 className="festa-modal__titulo">Digite o código</h3>
                <p className="festa-passo">Enviamos um código de 6 dígitos para <strong>{email}</strong>.</p>
                <label className="festa-campo">
                  <span>Código</span>
                  <input type="text" inputMode="numeric" autoComplete="one-time-code" value={codigo} maxLength={6} placeholder="000000" className="festa-codigo-input" onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} />
                </label>
                {msgVerif ? <p className={`festa-msg festa-msg--${msgVerif.tipo}`}>{msgVerif.texto}</p> : null}
                <button type="submit" className="festa-enviar" disabled={ocupadoVerif}>{ocupadoVerif ? "Confirmando…" : "Confirmar e enviar foto"}</button>
                <button type="button" className="festa-link" onClick={() => { setVerifEtapa("email"); setMsgVerif(null); }}>Usar outro e-mail</button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
