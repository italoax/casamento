"use client";

import { useState } from "react";
import { Modal } from "../common/Modal";
import { montarNomeComIdade, convidadosIniciais, GuestRow, Row } from "../../utils/guest-helpers";
import { phone } from "../../utils/formatting";
import { LISTAS } from "../../utils/whatsapp-helpers";

export function ConvidadoModal({ row, hasVisibilidade, onSubmit, onCancel }: { row?: Row; hasVisibilidade?: boolean; onSubmit: any; onCancel: any }) {
  const [nomes, setNomes] = useState<GuestRow[]>(() => convidadosIniciais(row));
  const lista = nomes.map((n) => montarNomeComIdade(n.nome, n.idade)).filter(Boolean);
  const confirmados = nomes.filter((n) => n.status === "confirmado").map((n) => montarNomeComIdade(n.nome, n.idade)).filter(Boolean);
  const temPendente = nomes.some((n) => n.status === "pendente" && montarNomeComIdade(n.nome, n.idade));
  const statusGeral = confirmados.length ? "confirmado" : (temPendente ? "pendente" : (lista.length ? "recusado" : "pendente"));
  const update = (idx: number, patch: Partial<GuestRow>) => setNomes((old) => old.map((item, i) => i === idx ? { ...item, ...patch } : item));
  return <form method="POST" className="form-modal" onSubmit={onSubmit}>
    <input type="hidden" name="id" defaultValue={row?.id || ""} />
    <input type="hidden" name="nomes_confirmados" id="input-nomes-confirmados-hidden" value={confirmados.join(", ")} readOnly />
    <input type="hidden" name="convites_confirmados" id="input-convites-confirmados-hidden" value={confirmados.length} readOnly />
    <input type="hidden" name="status" id="input-status-hidden" value={statusGeral} readOnly />
    <input type="hidden" name="nomes_lista" id="input-nomes-lista-hidden" value={lista.join(", ")} readOnly />

    <div className="presente-modal__header"><div><span className="presente-modal__eyebrow">Confirmação de presença</span><h3 className="modal-title">{row ? "Editar Convidado" : "Adicionar Convidado"}</h3></div></div>

    <div className="secao-form">
      <h4>Dados do Responsável</h4>
      <div className="linha-form">
        <div className="grupo-input"><label>Nome no Convite (Família/Pessoa)</label><input type="text" name="nome" placeholder="Ex: Tio João e Família" defaultValue={row?.nome || ""} required /></div>
        <div className="grupo-input"><label>Telefone (WhatsApp)</label><input type="tel" name="telefone" inputMode="tel" autoComplete="tel" maxLength={32} placeholder="(XX) 99999-9999" defaultValue={row?.telefone ? phone(row.telefone) : ""} /></div>
      </div>
      <div className="linha-form">
        <div className="grupo-input"><label>E-mail</label><input type="email" name="email" placeholder="email@exemplo.com" defaultValue={row?.email || ""} /><small className="form-hint">Deixe em branco para remover o e-mail do convidado.</small></div>
        <div className="grupo-input"><label>Lista (quem convida)</label><select name="lista" defaultValue={String(row?.lista || "")}><option value="">— Sem lista —</option>{LISTAS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}</select><small className="form-hint">Define por qual WhatsApp o convite é enviado.</small></div>
      </div>
    </div>

    <div className="secao-form">
      <h4>Detalhes do Convite</h4>
      <div className="grupo-input spaced">
        <label>Lista de Nomes</label>
        <p className="modal-note">Adicione os convidados e defina se eles vão ou não.</p>
        <div id="container-nomes-lista">
          {nomes.map((item, idx) => <div className="linha-nome-dinamico" key={idx}>
            <input type="text" className="nome-dinamico" placeholder="Nome do convidado" value={item.nome} onChange={(e) => update(idx, { nome: e.target.value })} />
            <button type="button" className="btn-remove-nome" title="Remover nome" onClick={() => setNomes((old) => old.length > 1 ? old.filter((_, i) => i !== idx) : [{ nome: "", idade: "adulto", status: "pendente" }])}>×</button>
            <label className="rotulo-mini">Idade</label>
            <select className="idade-dinamico" value={item.idade} onChange={(e) => update(idx, { idade: e.target.value })}><option value="adulto">Adulto</option><option value="crianca_0_5">Criança 0-5 anos</option><option value="crianca_6_10">Criança 6-10 anos</option></select>
            <label className="rotulo-mini">Status</label>
            <select className="status-dinamico" value={item.status} onChange={(e) => update(idx, { status: e.target.value })}><option value="pendente">Pendente</option><option value="confirmado">Confirmado</option><option value="recusado">Não irei</option></select>
          </div>)}
        </div>
        <button id="btn-add-nome" type="button" className="botao botao-secundario btn-sm mt-5 btn-add-nome" onClick={() => setNomes((old) => [...old, { nome: "", idade: "adulto", status: "pendente" }])}>Adicionar Nome</button>
      </div>
      <div className="linha-form">
        <div className="grupo-input"><label>Quantidade de Convidados</label><input type="number" name="qtd" value={Math.max(1, lista.length || 1)} min="1" required readOnly tabIndex={-1} /></div>
        {hasVisibilidade ? <div className="grupo-input"><label>Visibilidade no Site</label><select name="visibilidade" defaultValue={row?.visibilidade || "disponivel"}><option value="disponivel">Mostrar no Site</option><option value="oculto">Ocultar</option></select></div> : null}
      </div>
    </div>
    <div className="modal-actions"><button type="button" className="botao botao-secundario" onClick={onCancel}>Cancelar</button><button type="submit" className="botao botao-primario">{row ? "Salvar Alterações" : "Criar Convite"}</button></div>
  </form>;
}
