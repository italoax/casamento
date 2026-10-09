"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function Icon({ tipo }) {
    return <svg viewBox="0 0 24 24" aria-hidden="true">
      {tipo === "anterior" ? <path d="m14 6-6 6 6 6" /> : tipo === "proxima" ? <path d="m10 6 6 6-6 6" /> : tipo === "fechar" ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5" />}
    </svg>;
}

export function AlbumGallery() {
    const [fotos, setFotos] = useState([]);
    const [visiveis, setVisiveis] = useState(24);
    const [proxima, setProxima] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");
    const [indice, setIndice] = useState(null);
    const [fotoCarregada, setFotoCarregada] = useState(null);
    const [erroFoto, setErroFoto] = useState(null);
    const [baixando, setBaixando] = useState(false);
    const [erroDownload, setErroDownload] = useState("");
    const dialog = useRef(null);
    const emCarga = useRef(false);
    const toque = useRef(null);
    const fimDaGrade = useRef(null);
    const aberto = indice !== null;
    const foto = aberto ? fotos[indice] : null;

    const carregar = useCallback(async (cursor, signal) => {
        if (emCarga.current || cursor === null) return [];
        emCarga.current = true;
        setCarregando(true);
        setErro("");
        try {
            const response = await fetch(`/api/album${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { signal });
            const data = await response.json();
            if (!response.ok || !Array.isArray(data.fotos)) throw new Error("Álbum indisponível");
            setFotos(atual => {
                const ids = new Set(atual.map(item => item.id));
                return [...atual, ...data.fotos.filter(item => !ids.has(item.id))];
            });
            setProxima(data.proxima || null);
            return data.fotos;
        } catch (error) {
            if (error.name !== "AbortError") setErro("Não foi possível carregar as fotos. Tente novamente ou abra o álbum completo.");
            return [];
        } finally {
            emCarga.current = false;
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        // Sem abortar a primeira chamada na repetição de efeitos do modo Strict.
        carregar("");
    }, [carregar]);

    useEffect(() => {
        // Uma página da Adobe pode não conter nenhuma das fotos selecionadas.
        // Avança até encontrar fotos, sem interromper a primeira carga.
        if (!carregando && !erro && !fotos.length && proxima) carregar(proxima);
    }, [carregando, erro, fotos.length, proxima, carregar]);

    useEffect(() => {
        if (!aberto) return;
        const element = dialog.current;
        const overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        element.showModal();
        return () => {
            element.close();
            document.body.style.overflow = overflowAnterior;
        };
    }, [aberto]);

    useEffect(() => {
        setErroDownload("");
        if (!aberto) return;
        const seguinte = fotos[indice + 1];
        if (seguinte) { const image = new Image(); image.src = seguinte.src; }
    }, [indice, aberto, fotos]);

    const maisFotos = useCallback(async () => {
        if (emCarga.current) return;
        if (visiveis + 24 > fotos.length && proxima !== null) {
            const novas = await carregar(proxima);
            if (!novas.length) return;
        }
        setVisiveis(atual => atual + 24);
    }, [visiveis, fotos.length, proxima, carregar]);

    useEffect(() => {
        if (aberto || carregando || erro || !fotos.length || !fimDaGrade.current) return;
        if (visiveis >= fotos.length && proxima === null) return;
        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            // Desconecta antes de carregar para evitar chamadas repetidas no mesmo lote.
            observer.disconnect();
            maisFotos();
        }, { rootMargin: "600px 0px" });
        observer.observe(fimDaGrade.current);
        return () => observer.disconnect();
    }, [aberto, carregando, erro, fotos.length, visiveis, proxima, maisFotos]);

    async function navegar(direcao) {
        if (emCarga.current) return;
        const destino = indice + direcao;
        if (destino < 0) return;
        if (destino >= fotos.length) {
            if (proxima === null) return;
            const novas = await carregar(proxima);
            if (!novas.length) return;
        }
        setIndice(destino);
        setVisiveis(atual => Math.max(atual, destino + 1));
    }

    async function baixarFoto() {
        if (!foto?.download || baixando) return;
        const selecionada = foto;
        setBaixando(true);
        setErroDownload("");
        try {
            const response = await fetch(selecionada.download);
            if (!response.ok) throw new Error("Download indisponível");
            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement("a");
            link.href = url;
            link.download = `Emanuelle-Italo-${selecionada.id}.jpg`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch {
            setErroDownload("Não foi possível baixar a foto. Tente novamente.");
        } finally {
            setBaixando(false);
        }
    }

    return <>
      <div className="album-grade" aria-busy={carregando}>
        {fotos.slice(0, visiveis).map((item, posicao) => <button
          className="album-miniatura" key={item.id} type="button"
          aria-label={`Ampliar foto ${posicao + 1}`} onClick={() => setIndice(posicao)}
        >
          <img src={item.thumbnail || item.src} alt={`Foto ${posicao + 1} do casamento`} loading="lazy" decoding="async" />
          <span aria-hidden="true">{String(posicao + 1).padStart(2, "0")}</span>
        </button>)}
      </div>
      {erro && <p className="album-aviso" role="status">{erro}</p>}
      {!carregando && !erro && !fotos.length && proxima === null && <p className="album-aviso">Nenhuma foto disponível no momento.</p>}
      {(visiveis < fotos.length || proxima !== null) && <div className="album-fim-grade" ref={fimDaGrade}>
        {carregando && <p className="album-aviso" role="status">Carregando fotos…</p>}
        {erro && <button className="album-carregar" type="button" onClick={maisFotos} disabled={carregando}>Tentar novamente</button>}
      </div>}
      <dialog className="album-visualizador" ref={dialog} aria-labelledby="album-foto-titulo"
        onCancel={() => setIndice(null)}
        onClick={event => { if (event.target === dialog.current) setIndice(null); }}
        onKeyDown={event => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                navegar(event.key === "ArrowLeft" ? -1 : 1);
            }
        }}>
        {foto && <div className="album-visualizador-conteudo">
          <img className="album-foto-ambiente" src={foto.thumbnail || foto.src} alt="" aria-hidden="true" />
          <header className="album-visualizador-topo">
            <div><p>Emanuelle &amp; Ítalo</p><h3 id="album-foto-titulo">Memórias do nosso dia</h3></div>
            <button type="button" aria-label="Fechar foto" onClick={() => setIndice(null)} autoFocus><Icon tipo="fechar" /></button>
          </header>
          <div className="album-foto-ampliada"
            onPointerDown={event => { if (event.pointerType !== "mouse") toque.current = { x: event.clientX, y: event.clientY }; }}
            onPointerCancel={() => { toque.current = null; }}
            onPointerUp={event => {
                if (!toque.current) return;
                const dx = event.clientX - toque.current.x;
                const dy = event.clientY - toque.current.y;
                toque.current = null;
                if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) navegar(dx < 0 ? 1 : -1);
            }}>
            <img key={foto.id} src={foto.src} alt={`Foto ${indice + 1} do casamento de Emanuelle e Ítalo`}
              className={`album-foto-principal${fotoCarregada === foto.id ? " is-loaded" : ""}`}
              onLoad={() => setFotoCarregada(foto.id)} onError={() => setErroFoto(foto.id)} draggable="false" />
            {fotoCarregada !== foto.id && <p role="status">{erroFoto === foto.id ? "Esta foto não carregou. Tente a próxima." : "Carregando foto…"}</p>}
          </div>
          <footer className="album-visualizador-rodape">
            <div className="album-navegacao">
              <button type="button" aria-label="Foto anterior" onClick={() => navegar(-1)} disabled={indice === 0 || carregando}><Icon tipo="anterior" /></button>
              <span><small>Foto</small>{String(indice + 1).padStart(2, "0")}</span>
              <button type="button" aria-label="Próxima foto" onClick={() => navegar(1)} disabled={carregando || (indice === fotos.length - 1 && proxima === null)}><Icon tipo="proxima" /></button>
            </div>
            <button className="album-baixar" type="button" onClick={baixarFoto} disabled={!foto.download || baixando}>
              <Icon tipo="download" />{baixando ? "Baixando…" : "Baixar foto"}
            </button>
          </footer>
          {erroDownload && <p className="album-aviso" role="status">{erroDownload}</p>}
          {erro && <p className="album-aviso" role="status">{erro}</p>}
        </div>}
      </dialog>
    </>;
}
