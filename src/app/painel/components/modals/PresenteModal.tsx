"use client";

import { useState } from "react";
import { money, imagemPresente } from "../../utils/formatting";
import { Row } from "../../utils/guest-helpers";

const categoriasPresentes = ["Cama, mesa e banho", "Cartões presente", "Contribuição", "Cozinha", "Decoração", "Divertidos", "Eletrodomésticos", "Eletrônicos", "Lua de mel e experiências", "Móveis", "Outros"];

function nomeBonitoDeArquivoPresente(valor = "") {
  const raw = String(valor || "").trim();
  if (!raw) return "";
  const arquivo = raw.split(/[\\/]/).pop() || raw;
  const semExtensao = arquivo.replace(/\.(jpe?g|png|webp|gif)$/i, "");
  const limpo = semExtensao
    .replace(/-?\d{10,}$/g, "")
    .replace(/_[a-z]{2}(?:_[a-z0-9]+)+/gi, " ")
    .replace(/\b(?:ac|sl|ul|sx|sy|sr|uf|fmwebp|ql\d+|ss\d+|v1|v2)\b/gi, " ")
    .replace(/\b\d{3,5}\b/g, " ")
    .replace(/^[a-z0-9]{6,}\b[\s_-]*/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!limpo || limpo.length < 3) return "";
  return limpo.toLowerCase().replace(/\b([a-záàâãéèêíïóôõöúçñ])/gi, letra => letra.toUpperCase());
}

function aplicarTaxaPreview(valor: string, taxaPercentual: number) {
  const base = Number(String(valor || "0").replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(base)) return 0;
  return Math.round(base * (1 + Math.max(0, Number(taxaPercentual) || 0) / 100) * 100) / 100;
}

export function PresenteModal({ row, onSubmit, onCancel, ordem, busca, taxaPercentual = 0 }: { row?: Row; onSubmit: any; onCancel: any; ordem: string; busca: string; taxaPercentual?: number }) {
  const qtd = row?.quantidade_disponivel;
  const sugerirCotas = row?.modo_exibicao === "cotas" || (!row?.modo_exibicao && qtd !== undefined && qtd !== null && qtd !== "" && Number(qtd) > 1);
  const previewAtual = imagemPresente(row?.imagem_thumb || row?.imagem);
  const [modo, setModo] = useState(sugerirCotas ? "cotas" : "padrao");
  const [nome, setNome] = useState(String(row?.nome || ""));
  const [preco, setPreco] = useState(String(row?.preco || ""));
  const [preview, setPreview] = useState(previewAtual);
  const inputQtd = modo === "cotas" ? "quantidade_cotas" : "quantidade_disponivel";

  function atualizarPreviewArquivo(file?: File | null) {
    if (!file) {
      setPreview(previewAtual);
      return;
    }

    if (!nome.trim()) {
      const sugestao = nomeBonitoDeArquivoPresente(file.name);
      if (sugestao) setNome(sugestao);
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => setPreview(previewAtual);
    reader.readAsDataURL(file);
  }

  return <form method="POST" className="form-modal" encType="multipart/form-data" onSubmit={onSubmit}>
    <input type="hidden" name="id_presente" defaultValue={row?.id || ""} />
    <input type="hidden" name="id" defaultValue={row?.id || ""} />
    <input type="hidden" name="imagem_atual" defaultValue={row?.imagem || ""} />
    <input type="hidden" name="ordem_presente" defaultValue={ordem || "recentes"} />
    <input type="hidden" name="busca_presente" defaultValue={busca || ""} />
    <div className="presente-modal__header"><div><span className="presente-modal__eyebrow">Lista de presentes</span><h3 className="modal-title">{row ? "Editar Presente" : "Adicionar Presente"}</h3><p className="presente-modal__subtitle">Organize os detalhes do item e acompanhe ao lado como ele aparece no site.</p></div></div>
    <div className="presente-modal__layout">
      <div className="presente-modal__main">
        <div className="grupo-input"><label>Nome do Presente</label><input type="text" name="nome_presente" value={nome} onChange={(e) => setNome(e.target.value)} required /></div>
        <div className="grupo-input"><label>Categoria</label><select name="categoria" defaultValue={row?.categoria || ""} required><option value="" disabled>Selecione uma categoria</option>{categoriasPresentes.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="grupo-input"><label>Modelo do presente</label><div className="presente-modo-toggle" role="group" aria-label="Modelo do presente"><button type="button" className={`presente-modo-toggle__btn ${modo === "padrao" ? "presente-modo-toggle__btn--ativo" : ""}`} aria-pressed={modo === "padrao"} onClick={() => setModo("padrao")}>Presente normal</button><button type="button" className={`presente-modo-toggle__btn ${modo === "cotas" ? "presente-modo-toggle__btn--ativo" : ""}`} aria-pressed={modo === "cotas"} onClick={() => setModo("cotas")}>Presente por cotas</button></div><select name="modo_exibicao" id="modo-exibicao-presente" className="presente-modo-select-sr" value={modo} onChange={(e) => setModo(e.target.value)} tabIndex={-1} aria-hidden="true"><option value="padrao">Presente normal</option><option value="cotas">Presente por cotas</option></select><small className="form-hint" id="modo-exibicao-hint">A aba ativa define o modo salvo. A outra aba continua visível para evitar perda de contexto.</small></div>
        <div className="linha-form"><div className="grupo-input"><label id="label-valor-presente">{modo === "cotas" ? "Valor base total do presente (R$)" : "Valor base do presente (R$)"}</label><input type="text" name="preco" placeholder="0,00" value={preco} onChange={(e) => setPreco(e.target.value)} required /><small className="form-hint" id="hint-valor-presente">{modo === "cotas" ? "No modo cotas, informe o valor base total. Se houver taxa ativa, o sistema aplica automaticamente por cima e divide por cota." : "Informe o valor base. Se houver taxa ativa, ela será aplicada automaticamente no site."}</small></div><div className="grupo-input"><label>Visibilidade no Site</label><select name="visibilidade" defaultValue={row?.status || "disponivel"}><option value="disponivel">Mostrar no Site</option><option value="oculto">Ocultar</option></select></div></div>
        <div className="presente-modo-abas" id="presente-modo-abas"><div className={`grupo-input presente-modo-aba ${modo === "padrao" ? "presente-modo-aba--ativo" : "presente-modo-aba--inativo"}`} id="grupo-limite-presente" data-modo="padrao"><label>Aba presente normal: limite de presentes</label><input type="number" name={inputQtd === "quantidade_disponivel" ? "quantidade_disponivel" : "quantidade_disponivel_disabled"} min={row ? Number(row.quantidade_vendida || 0) + Number(row.quantidade_reservada || 0) : 0} placeholder="Sem limite" defaultValue={!sugerirCotas ? (row?.quantidade_disponivel || "") : ""} disabled={modo !== "padrao"} /><small className="form-hint" id="hint-limite-presente">Use 1 para presente único, valores maiores para limitar a quantidade, ou deixe em branco para sem limite.</small></div><div className={`grupo-input presente-modo-aba ${modo === "cotas" ? "presente-modo-aba--ativo" : "presente-modo-aba--inativo"}`} id="grupo-cotas-presente" data-modo="cotas"><label>Aba presente por cotas: quantidade de cotas</label><input type="number" name={inputQtd === "quantidade_cotas" ? "quantidade_cotas" : "quantidade_cotas_disabled"} min="1" placeholder="Ex: 3" defaultValue={sugerirCotas ? (row?.quantidade_disponivel || "") : ""} required={modo === "cotas"} disabled={modo !== "cotas"} /><small className="form-hint">Defina quantas pessoas poderão contribuir para este presente.</small></div></div>
        <div className="grupo-input grupo-input--file"><label>Imagem do Presente</label><input type="file" name="imagem_arquivo" accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif" onChange={(e) => atualizarPreviewArquivo(e.target.files?.[0])} /><small className="form-hint">A imagem será convertida para WebP ao salvar. Se o nome estiver vazio, o sistema sugere um nome limpo a partir do arquivo.</small></div>
      </div>
      <aside className="presente-modal__aside"><div className="grupo-input"><label>Preview no site</label><div className="preview-card"><div className="preview-card__media">{preview ? <img id="preview-presente-imagem" src={preview} alt="Preview do presente" style={{ display: "block" }} /> : <span id="preview-presente-sem-imagem">Sem imagem</span>}</div><div className="preview-card__body"><h4 id="preview-presente-nome">{nome || "Nome do presente"}</h4><p id="preview-presente-preco">{preco ? money(aplicarTaxaPreview(preco, taxaPercentual)) : "R$ 0,00"}</p>{taxaPercentual > 0 ? <small className="form-hint">Taxa de {taxaPercentual.toLocaleString("pt-BR")}% já aplicada</small> : null}<button type="button" className="preview-card__botao" disabled id="preview-presente-botao">Presentear</button></div></div></div></aside>
    </div>
    <div className="modal-actions"><button type="button" className="botao botao-secundario" onClick={onCancel}>Cancelar</button><button type="submit" className="botao botao-primario">Salvar Presente</button></div>
  </form>;
}
