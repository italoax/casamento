"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function AlbumFotos({ onToast }) {
    const [fotos, setFotos] = useState([]);
    const [proxima, setProxima] = useState("");
    const [ids, setIds] = useState(new Set());
    const [completo, setCompleto] = useState(false);
    const [iniciado, setIniciado] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");
    const [alterado, setAlterado] = useState(false);
    const [somenteSelecionadas, setSomenteSelecionadas] = useState(false);
    const emCarga = useRef(false);
    const fimDaGrade = useRef(null);
    const visiveis = useMemo(() => somenteSelecionadas && !completo ? fotos.filter(foto => ids.has(foto.id)) : fotos, [fotos, ids, somenteSelecionadas, completo]);

    const carregar = useCallback(async (cursor = "", inicial = false) => {
        if (emCarga.current) return;
        emCarga.current = true; setCarregando(true); setErro("");
        try {
            const response = await fetch(`/api/painel/album${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data.erro || "Não foi possível carregar o álbum.");
            setFotos(atual => {
                const existentes = new Set(atual.map(foto => foto.id));
                return [...atual, ...data.fotos.filter(foto => !existentes.has(foto.id))];
            });
            setProxima(data.proxima);
            if (inicial) {
                setCompleto(data.selecionadas === null);
                setIds(new Set(data.selecionadas || []));
                setIniciado(true);
            }
        } catch (error) { setErro(error.message || "Não foi possível carregar o álbum."); }
        finally { emCarga.current = false; setCarregando(false); }
    }, []);
    useEffect(() => { carregar("", true); }, [carregar]);

    useEffect(() => {
        if (!iniciado || carregando || salvando || erro || proxima === null || !fimDaGrade.current || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            observer.disconnect();
            carregar(proxima);
        }, { rootMargin: "600px 0px" });
        observer.observe(fimDaGrade.current);
        return () => observer.disconnect();
    }, [iniciado, carregando, salvando, erro, proxima, visiveis.length, carregar]);

    function marcar(id) {
        setIds(atual => { const novo = new Set(atual); if (novo.has(id)) novo.delete(id); else novo.add(id); return novo; });
        setAlterado(true);
    }
    async function salvar() {
        if (salvando || !iniciado) return;
        setSalvando(true);
        try {
            const response = await fetch("/api/painel/album", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: completo ? null : [...ids] }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.erro || "Não foi possível salvar a seleção.");
            setAlterado(false);
            onToast("Seleção salva. A galeria já usa as fotos escolhidas.");
        } catch (error) { onToast(error.message || "Não foi possível salvar a seleção."); }
        finally { setSalvando(false); }
    }

    return <div className="tab-conteudo ativo album-painel">
      <div className="painel-header compact"><h3 className="painel-subtitulo">Fotos do álbum</h3></div>
      <p>Escolha as fotos que aparecem na galeria do site. Clique na imagem para ver de perto e marque as desejadas.</p>
      <div className="painel-card-form album-painel-controles">
        <label><input type="checkbox" checked={completo} disabled={!iniciado || salvando} onChange={event => { setCompleto(event.target.checked); setAlterado(true); }} /> Mostrar o álbum completo</label>
        {!completo && <>
          <p>{ids.size} fotos escolhidas · {fotos.length} miniaturas carregadas</p>
          <label><input type="checkbox" checked={somenteSelecionadas} onChange={event => setSomenteSelecionadas(event.target.checked)} /> Ver apenas as escolhidas entre as miniaturas carregadas</label>
          <div className="album-painel-acoes">
            <button type="button" className="toolbar-btn" disabled={!iniciado || salvando} onClick={() => { setIds(atual => new Set([...atual, ...fotos.map(foto => foto.id)])); setAlterado(true); }}>Marcar as carregadas</button>
            <button type="button" className="toolbar-btn" disabled={!iniciado || salvando} onClick={() => { setIds(new Set()); setAlterado(true); }}>Desmarcar todas</button>
          </div>
          {iniciado && ids.size === 0 && <p role="status">Sem fotos escolhidas, a galeria ficará vazia ao salvar.</p>}
        </>}
        <div className="album-painel-acoes">
          <button type="button" className="toolbar-btn" disabled={!iniciado || salvando || !alterado} onClick={salvar}>{salvando ? "Salvando…" : "Salvar seleção"}</button>
          <span role="status">{alterado ? "Alterações ainda não salvas" : iniciado ? "Seleção salva" : "Carregando seleção…"}</span>
          <a className="toolbar-btn" href="/#album-fotos" target="_blank" rel="noopener noreferrer">Ver galeria no site</a>
        </div>
      </div>
      {erro && <p role="alert">{erro}</p>}
      <div className="album-painel-grade">
        {visiveis.map((foto, indice) => <div key={foto.id} className={`album-painel-foto${completo || ids.has(foto.id) ? " escolhida" : ""}`}>
          <a href={foto.src} target="_blank" rel="noopener noreferrer" aria-label={`Ampliar foto ${indice + 1}`}><img src={foto.thumbnail} alt={`Foto ${indice + 1} do álbum`} loading="lazy" /></a>
          <label><input type="checkbox" checked={completo || ids.has(foto.id)} disabled={completo || salvando} onChange={() => marcar(foto.id)} /> Mostrar no site</label>
          <small>{foto.id}</small>
        </div>)}
      </div>
      {!carregando && iniciado && !visiveis.length && <p>Nenhuma foto nesta visualização.</p>}
      {(proxima !== null || erro) && <div ref={fimDaGrade}>
        {carregando ? <p role="status">Carregando fotos…</p> : <button className="toolbar-btn" type="button" disabled={salvando} onClick={() => carregar(proxima || "", !iniciado)}>{erro ? "Tentar novamente" : "Carregar mais fotos"}</button>}
      </div>}
      {iniciado && <button type="button" className="album-painel-salvar-flutuante" disabled={salvando || !alterado} onClick={salvar}>
        {salvando ? "Salvando…" : alterado ? "Salvar seleção" : "Seleção salva"}
      </button>}
    </div>;
}
