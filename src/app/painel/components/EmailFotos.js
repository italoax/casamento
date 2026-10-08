"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FOTOS_EMAIL_DEFAULTS } from "@/lib/email/fotos-mail.mjs";

const LABEL_STATUS = { processando: "Enviando", pausado: "Pausado", concluido: "Concluído", cancelado: "Cancelado", pendente: "Na fila", enviando: "Enviando", enviado: "Enviado", falha: "Falha — confira se chegou", incerto: "Entrega incerta — confira se chegou" };

export function EmailFotos({ onToast }) {
    const [data, setData] = useState(null);
    const [falhaCarga, setFalhaCarga] = useState(false);
    const [campos, setCampos] = useState(FOTOS_EMAIL_DEFAULTS);
    const [selecionados, setSelecionados] = useState(new Set());
    const [busca, setBusca] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const [preview, setPreview] = useState(null);
    const job = data?.jobs?.[0];
    const ativo = Boolean(data?.jobs?.some(item => ["processando", "pausado"].includes(item.status)));
    const contatos = data?.destinatarios || [];
    const filtrados = useMemo(() => contatos.filter(item => `${item.nome} ${item.email}`.toLocaleLowerCase().includes(busca.toLocaleLowerCase())), [contatos, busca]);

    const carregar = useCallback(async (status = false) => {
        try {
            const response = await fetch(`/api/painel/email-fotos${status ? "?status=1" : ""}`, { cache: "no-store" });
            const body = await response.json();
            if (!response.ok) throw new Error(body.erro);
            setData(atual => ({ ...atual, ...body }));
            setFalhaCarga(false);
        } catch (error) {
            if (!status) { setFalhaCarga(true); onToast(error.message || "Não foi possível carregar os e-mails."); }
        }
    }, [onToast]);
    useEffect(() => { carregar(); }, [carregar]);
    useEffect(() => {
        if (!ativo) return;
        const timer = setInterval(() => carregar(true), 4000);
        return () => clearInterval(timer);
    }, [ativo, carregar]);

    async function request(payload) {
        const response = await fetch("/api/painel/email-fotos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const body = await response.json();
        if (!response.ok) throw new Error(body.erro || "Não foi possível executar a ação.");
        return body;
    }
    function editar(campo, valor) {
        setCampos(atual => ({ ...atual, [campo]: valor }));
        setPreview(null);
    }
    function toggle(id) {
        setSelecionados(atual => {
            const novo = new Set(atual);
            if (novo.has(id)) novo.delete(id); else novo.add(id);
            return novo;
        });
        setPreview(null);
    }
    async function revisar(event) {
        event.preventDefault();
        if (ocupado) return;
        setOcupado(true);
        try {
            const payload = { ...campos, ids: [...selecionados] };
            const body = await request({ ...payload, acao: "preview" });
            setPreview({ ...body, payload, requestId: crypto.randomUUID() });
        } catch (error) { onToast(error.message); }
        finally { setOcupado(false); }
    }
    async function enviar() {
        if (ocupado || !preview) return;
        setOcupado(true);
        try {
            await request({ ...preview.payload, acao: "enviar", requestId: preview.requestId });
            setPreview(null);
            await carregar(true);
            onToast("Envio iniciado. Você pode acompanhar o andamento abaixo.");
        } catch (error) { onToast(error.message); }
        finally { setOcupado(false); }
    }
    async function controlar(acao) {
        setOcupado(true);
        try { await request({ acao, jobId: Number(job.id) }); await carregar(true); }
        catch (error) { onToast(error.message); }
        finally { setOcupado(false); }
    }

    return <div id="tab-email-fotos" className="tab-conteudo ativo email-fotos-tab">
      <div className="painel-header compact"><h3 className="painel-subtitulo">E-mail das fotos</h3></div>
      {!data ? <div className="painel-card-form">
        <p>{falhaCarga ? "Não foi possível carregar os contatos." : "Carregando convidados…"}</p>
        {falhaCarga && <button className="toolbar-btn" type="button" onClick={() => carregar()}>Tentar novamente</button>}
      </div> : <>
        {!data.smtpConfigurado && <p className="email-fotos-aviso" role="status">O SMTP precisa ser configurado para enviar. Você já pode preparar a mensagem e conferir a prévia.</p>}
        <form className="form-modal email-fotos-form" onSubmit={revisar}>
          <div className="painel-card-form">
            <h4>Avise que o álbum está disponível</h4>
            <p className="form-hint">Cada convidado recebe um e-mail individual com seu nome e o link das fotos.</p>
            <div className="grupo-input"><label htmlFor="email-fotos-assunto">Assunto</label><input id="email-fotos-assunto" value={campos.assunto} maxLength={150} required disabled={ocupado} onChange={e => editar("assunto", e.target.value)} /></div>
            <div className="grupo-input"><label htmlFor="email-fotos-mensagem">Mensagem</label><textarea id="email-fotos-mensagem" value={campos.mensagem} rows={9} maxLength={3000} required disabled={ocupado} onChange={e => editar("mensagem", e.target.value)} /></div>
            <div className="grupo-input"><label htmlFor="email-fotos-url">Link das fotos</label><input id="email-fotos-url" type="url" value={campos.url} maxLength={500} required disabled={ocupado} onChange={e => editar("url", e.target.value)} /></div>
          </div>
          <div className="painel-card-form">
            <h4>Quem vai receber</h4>
            <p className="form-hint">{contatos.length} e-mails válidos · {data.invalidos} convites sem e-mail válido · {data.repetidos} e-mails repetidos removidos.</p>
            <div className="grupo-input"><label htmlFor="email-fotos-busca">Buscar convidado</label><input id="email-fotos-busca" placeholder="Nome ou e-mail" value={busca} onChange={e => setBusca(e.target.value)} /></div>
            <div className="email-fotos-selecao">
              <button className="toolbar-btn" type="button" disabled={ocupado} onClick={() => { setSelecionados(new Set(contatos.map(item => item.id))); setPreview(null); }}>Selecionar todos</button>
              <button className="toolbar-btn" type="button" disabled={ocupado} onClick={() => { setSelecionados(new Set()); setPreview(null); }}>Limpar seleção</button>
              <strong>{selecionados.size} selecionados</strong>
            </div>
            <div className="email-fotos-contatos">
              {filtrados.map(item => <label key={item.id} className="email-fotos-contato">
                <input type="checkbox" checked={selecionados.has(item.id)} disabled={ocupado} onChange={() => toggle(item.id)} />
                <span><strong>{item.nome}</strong><small>{item.email}</small></span>
              </label>)}
              {!filtrados.length && <p>Nenhum convidado encontrado. Cadastre o e-mail na Lista de Convidados.</p>}
            </div>
            <button className="toolbar-btn toolbar-btn--primary" type="submit" disabled={ocupado || !selecionados.size || ativo}>{ocupado ? "Preparando…" : "Revisar e-mail e destinatários"}</button>
          </div>
        </form>
        {preview && <section className="painel-card-form email-fotos-preview" aria-label="Revisão do envio">
          <h4>Confira antes de enviar</h4>
          <p><strong>{preview.total} convidados</strong> receberão este e-mail. A prévia usa o nome de {preview.destinatarios[0].nome}.</p>
          <details><summary>Ver destinatários</summary><ul>{preview.destinatarios.map(item => <li key={item.id}>{item.nome} — {item.email}</li>)}</ul></details>
          <iframe title="Prévia do e-mail das fotos" srcDoc={preview.html} sandbox="" />
          <button className="toolbar-btn toolbar-btn--primary" type="button" disabled={ocupado || ativo || !data.smtpConfigurado} onClick={enviar}>{ocupado ? "Iniciando…" : `Enviar aviso para ${preview.total} convidados`}</button>
        </section>}
        {job && <section className="painel-card-form email-fotos-andamento">
          <h4>Último envio · {LABEL_STATUS[job.status] || job.status}</h4>
          <p>{job.assunto}</p>
          <progress max={Number(job.total) || 1} value={Number(job.enviados) + Number(job.falhas) + Number(job.incertos)} aria-label="Andamento dos e-mails" />
          <p role="status">{job.enviados} enviados · {job.pendentes} na fila · {Number(job.falhas) + Number(job.incertos)} com falha ou entrega incerta.</p>
          {ativo && <p className="form-hint">O envio continua no servidor mesmo se você fechar esta página. Pausar ou cancelar impede os próximos envios; o e-mail em andamento pode ser concluído.</p>}
          {job.status === "pausado" && <p className="form-hint">Se houver várias falhas seguidas, o envio pausa. Verifique o SMTP antes de retomar.</p>}
          <div className="email-fotos-selecao">
            {job.status === "processando" && <button className="toolbar-btn" type="button" disabled={ocupado} onClick={() => controlar("pausar")}>Pausar envio</button>}
            {job.status === "pausado" && <button className="toolbar-btn" type="button" disabled={ocupado} onClick={() => controlar("retomar")}>Retomar pendentes</button>}
            {ativo && <button className="toolbar-btn" type="button" disabled={ocupado} onClick={() => controlar("cancelar")}>Cancelar pendentes</button>}
          </div>
          <details><summary>Ver situação de cada convidado</summary><ul className="email-fotos-resultados">{data.itens.map((item, i) => <li key={i}><strong>{item.nome}</strong> · {item.email}<br />{LABEL_STATUS[item.status] || item.status}{item.erro && <small>{item.erro}</small>}</li>)}</ul></details>
        </section>}
      </>}
    </div>;
}
