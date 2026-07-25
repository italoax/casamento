"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Foto = { id: number; nome: string; arquivo: string; created_at: string };
/** Limite por lote: segura o rate limit do servidor (30 envios / 5 min por IP). */
const MAX_POR_LOTE = 25;

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
  // Envio das fotos (sheet)
  const [sheetAberto, setSheetAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [previas, setPrevias] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState<{ feitas: number; total: number; falhas: number } | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Liberação do aparelho (um Turnstile, vale 24h)
  const [liberado, setLiberado] = useState(false);
  const [liberando, setLiberando] = useState(false);

  // Galeria
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [carregandoFotos, setCarregandoFotos] = useState(true);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const galeriaRef = useRef<HTMLInputElement | null>(null);
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
        const res = await fetch("/api/festa/sessao", { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (res.ok && body?.liberado) setLiberado(true);
      } catch { /* segue não liberado */ }
    })();
  }, [carregarFotos]);

  // O captcha só é montado quando o sheet abre e o aparelho ainda não foi
  // liberado — quem já enviou antes nem vê o desafio.
  useEffect(() => {
    if (!sheetAberto || liberado) return;
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
  }, [sheetAberto, liberado, turnstileSiteKey]);

  function limparTurnstile() {
    tokenRef.current = "";
    try { if (window.turnstile && turnstileId.current) window.turnstile.remove(turnstileId.current); } catch { /* ignore */ }
    turnstileId.current = null;
  }

  /**
   * Dois caminhos de propósito, porque um só não atende:
   *   câmera  -> input com `capture`, que abre a câmera traseira direto
   *   galeria -> input SEM `capture`; com ele o celular esconde as fotos já
   *              tiradas, e a maioria dos convidados vai querer justamente
   *              enviar o que fotografou durante a festa.
   * No computador o `capture` é ignorado: os dois botões abrem o seletor de
   * arquivos, sem prejuízo.
   */
  function abrirCamera() {
    setMsg(null);
    fileRef.current?.click();
  }

  function abrirGaleria() {
    setMsg(null);
    galeriaRef.current?.click();
  }

  function escolherArquivo(ev: React.ChangeEvent<HTMLInputElement>) {
    const escolhidos = Array.from(ev.target.files || []);
    if (!escolhidos.length) return;

    const lote = escolhidos.slice(0, MAX_POR_LOTE);
    setArquivos(lote);
    setProgresso(null);
    setMsg(
      escolhidos.length > MAX_POR_LOTE
        ? { tipo: "erro", texto: `Enviando as ${MAX_POR_LOTE} primeiras. Repita para mandar o resto.` }
        : null,
    );

    // Prévia só das 4 primeiras: gerar data URL de 25 fotos trava o celular.
    setPrevias([]);
    lote.slice(0, 4).forEach((f, i) => {
      // Data URL (e não blob:) porque o CSP do site bloqueia blob: em imagens.
      const reader = new FileReader();
      reader.onload = () => setPrevias((atual) => {
        const copia = [...atual];
        copia[i] = typeof reader.result === "string" ? reader.result : "";
        return copia;
      });
      reader.readAsDataURL(f);
    });

    setSheetAberto(true);
  }

  function limparFotos() {
    setArquivos([]);
    setPrevias([]);
    setProgresso(null);
    // Zera os dois: sem isso, escolher o MESMO arquivo de novo não dispara o
    // onChange (o valor não mudou) e o envio parece travado.
    if (fileRef.current) fileRef.current.value = "";
    if (galeriaRef.current) galeriaRef.current.value = "";
  }

  function fecharSheet() { setSheetAberto(false); limparFotos(); }

  /** Libera o aparelho com o Turnstile. Devolve true se já pode enviar. */
  async function garantirLiberacao(): Promise<boolean> {
    if (liberado) return true;
    if (!tokenRef.current) {
      setMsg({ tipo: "erro", texto: "Aguarde a verificação de segurança terminar." });
      return false;
    }
    setLiberando(true);
    try {
      const res = await fetch("/api/festa/sessao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnstileToken: tokenRef.current }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.sucesso) { setLiberado(true); return true; }
      setMsg({ tipo: "erro", texto: body?.erro || "Verificação falhou. Tente de novo." });
      limparTurnstile();
      return false;
    } catch {
      setMsg({ tipo: "erro", texto: "Falha de conexão. Tente novamente." });
      return false;
    } finally {
      setLiberando(false);
    }
  }

  /**
   * Envia uma por vez, em série.
   *
   * Em paralelo seria mais rápido no wi-fi, mas numa festa a rede é ruim e o
   * servidor recomprime cada imagem — disparar 20 uploads juntos derrubaria o
   * envio no rate limit e travaria o celular. Em série o progresso também fica
   * honesto: o convidado vê "3 de 12" andando.
   */
  async function enviarFila(): Promise<void> {
    const total = arquivos.length;
    let feitas = 0;
    let falhas = 0;
    const enviadas: Foto[] = [];
    setProgresso({ feitas: 0, total, falhas: 0 });

    for (const arquivo of arquivos) {
      const fd = new FormData();
      fd.append("nome", nome.trim());
      fd.append("foto", arquivo);
      try {
        const res = await fetch("/api/festa/fotos", { method: "POST", body: fd });
        const body = await res.json().catch(() => ({}));
        if (res.ok && body?.sucesso) {
          feitas += 1;
          if (body.foto) enviadas.push(body.foto as Foto);
        } else {
          falhas += 1;
          // Sessão expirou no meio da fila: para tudo e devolve o captcha.
          if (res.status === 401) { setLiberado(false); setProgresso({ feitas, total, falhas }); return; }
        }
      } catch {
        falhas += 1;
      }
      setProgresso({ feitas, total, falhas });
    }

    if (enviadas.length) setFotos((atual) => [...enviadas, ...atual]);

    if (feitas > 0) {
      limparFotos();
      setSheetAberto(false);
      const plural = feitas === 1 ? "Foto enviada" : `${feitas} fotos enviadas`;
      setMsg({
        tipo: "ok",
        texto: falhas
          ? `${plural}, mas ${falhas} falharam. Tente reenviar as que faltaram.`
          : `${plural}! Aparecem no mural assim que os noivos aprovarem 💛`,
      });
    } else {
      setMsg({ tipo: "erro", texto: "Não foi possível enviar. Verifique a conexão e tente de novo." });
    }
  }

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando || liberando) return;
    setMsg(null);
    if (nome.trim().length < 2) { setMsg({ tipo: "erro", texto: "Digite seu nome." }); return; }
    if (!arquivos.length) { setMsg({ tipo: "erro", texto: "Escolha ao menos uma foto." }); return; }
    if (!(await garantirLiberacao())) return;
    setEnviando(true);
    try { await enviarFila(); } finally { setEnviando(false); }
  }

  return (
    <div className="festa">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={escolherArquivo} hidden />
      {/* `multiple` só na galeria: com a câmera, o celular tira uma foto por vez. */}
      <input ref={galeriaRef} type="file" accept="image/*" multiple onChange={escolherArquivo} hidden />

      <section className="festa-cover" style={{ backgroundImage: `url(${cover})` }}>
        <div className="festa-cover__veu" />
        <div className="festa-cover__conteudo">
          <p className="festa-cover__eyebrow">Álbum da festa</p>
          <h1 className="festa-cover__nomes">Emanuelle <span className="festa-cover__e">&amp;</span> Ítalo</h1>
          <p className="festa-cover__data"><span className="festa-cover__coracao" aria-hidden="true">💛</span> {dataFesta}</p>
          <div className="festa-cover__stats">
            <span className="festa-chip"><strong>{fotos.length}</strong> {fotos.length === 1 ? "foto" : "fotos"}</span>
            {liberado ? <span className="festa-chip festa-chip--ok">✓ liberado para enviar</span> : null}
          </div>
        </div>
      </section>

      <main className="festa-corpo">
        <div className="festa-intro">
          <h2 className="festa-secao__titulo">Fotos da festa</h2>
          <p className="festa-secao__sub">Toque em <strong>Tirar foto</strong> ou <strong>Galeria</strong> para enviar a sua. Aparece aqui na hora! 📸</p>
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

      {/* Barra fixa: câmera (foto na hora) e galeria (foto já tirada) */}
      <div className="festa-uploadbar">
        <button type="button" className="festa-uploadbtn" onClick={abrirCamera}>
          <span className="festa-uploadbtn__icone" aria-hidden="true">📷</span> Tirar foto
        </button>
        <button type="button" className="festa-uploadbtn festa-uploadbtn--secundario" onClick={abrirGaleria}>
          <span className="festa-uploadbtn__icone" aria-hidden="true">🖼️</span> Galeria
        </button>
      </div>

      {/* Sheet de envio (preview + nome + enviar) */}
      {sheetAberto ? (
        <div className="festa-sheet" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) fecharSheet(); }}>
          <form className="festa-sheet__caixa" onSubmit={aoEnviar}>
            <div className="festa-sheet__alca" />
            <h3 className="festa-sheet__titulo">
              {arquivos.length > 1 ? `Enviar ${arquivos.length} fotos` : "Enviar foto"}
            </h3>

            {previas.length ? (
              <div className="festa-previas">
                {previas.map((p, i) => (p ? <img key={i} className="festa-previas__item" src={p} alt={`Prévia ${i + 1}`} /> : null))}
                {arquivos.length > previas.length ? (
                  <span className="festa-previas__mais">+{arquivos.length - previas.length}</span>
                ) : null}
              </div>
            ) : null}

            <div className="festa-trocar">
              <button type="button" className="festa-link" onClick={abrirCamera}>Tirar outra</button>
              <span className="festa-trocar__sep" aria-hidden="true">·</span>
              <button type="button" className="festa-link" onClick={abrirGaleria}>Escolher da galeria</button>
            </div>

            <label className="festa-campo">
              <span>Seu nome</span>
              <input type="text" value={nome} maxLength={80} placeholder="Como você quer aparecer" onChange={(e) => setNome(e.target.value)} />
            </label>

            {/* Captcha só na primeira vez neste aparelho. */}
            {!liberado ? <div ref={turnstileBox} className="festa-turnstile" /> : null}

            {progresso ? (
              <div className="festa-progresso" role="status" aria-live="polite">
                <div className="festa-progresso__barra">
                  <span style={{ width: `${Math.round((progresso.feitas / Math.max(1, progresso.total)) * 100)}%` }} />
                </div>
                <p className="festa-progresso__texto">
                  Enviando {progresso.feitas} de {progresso.total}
                  {progresso.falhas ? ` · ${progresso.falhas} falhou(ram)` : ""}
                </p>
              </div>
            ) : null}

            {msg ? <p className={`festa-msg festa-msg--${msg.tipo}`}>{msg.texto}</p> : null}

            <button type="submit" className="festa-enviar" disabled={enviando || liberando}>
              {liberando ? "Verificando…" : enviando ? "Enviando…" : arquivos.length > 1 ? `Enviar ${arquivos.length} fotos` : "Enviar foto"}
            </button>
            <p className="festa-passo">As fotos aparecem no mural após a aprovação dos noivos.</p>
            <button type="button" className="festa-link" onClick={fecharSheet}>Cancelar</button>
          </form>
        </div>
      ) : null}

    </div>
  );
}
