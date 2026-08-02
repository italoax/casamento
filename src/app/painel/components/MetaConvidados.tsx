"use client";

import { useEffect, useState } from "react";

/**
 * Card "Meta de convidados" do Dashboard.
 *
 * O cálculo é por CONSUMO (porções de adulto), não por cabeça:
 *   adulto = 1 · criança 6 a 10 = 0,5 · criança 0 a 5 = 0 (não conta).
 *
 * Mostra dois cenários:
 *   - Confirmado: só quem já disse que vai.
 *   - Potencial: confirmados + quem ainda está aguardando resposta (se todos
 *     os pendentes vierem). "Faltam" usa o potencial.
 */
export function MetaConvidados({
  meta,
  adultosConf,
  criancas610Conf,
  adultosPend,
  criancas610Pend,
  onSalvar,
}: {
  meta: number;
  adultosConf: number;
  criancas610Conf: number;
  adultosPend: number;
  criancas610Pend: number;
  onSalvar: (meta: number) => Promise<boolean>;
}) {
  const [valor, setValor] = useState(meta ? String(meta) : "");
  const [salvando, setSalvando] = useState(false);

  // Ressincroniza quando o dashboard recarrega (ex.: após salvar).
  useEffect(() => {
    setValor(meta ? String(meta) : "");
  }, [meta]);

  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

  const consumoConf = adultosConf + criancas610Conf * 0.5;
  const consumoPend = adultosPend + criancas610Pend * 0.5;
  const potencial = consumoConf + consumoPend;

  const metaNum = Math.max(0, Math.round(Number(valor) || 0));
  const faltam = Math.max(0, metaNum - potencial);
  const bateu = metaNum > 0 && potencial >= metaNum;
  const alterada = metaNum !== Math.max(0, Math.round(meta || 0));

  // Barra empilhada: confirmado (verde) + pendente (dourado), até a meta.
  const pctConf = metaNum > 0 ? Math.min(100, (consumoConf / metaNum) * 100) : 0;
  const pctPend = metaNum > 0 ? Math.min(100 - pctConf, (consumoPend / metaNum) * 100) : 0;
  const pctTotal = Math.round(pctConf + pctPend);

  async function salvar() {
    setSalvando(true);
    try {
      await onSalvar(metaNum);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="dash-meta">
      <div className="resumo-grid">
        <div className="card-info card-info--confirmed">
          <h3>{fmt(consumoConf)}</h3>
          <p>Confirmados (consumo)</p>
        </div>
        <div className="card-info card-info--pending">
          <h3>{fmt(consumoPend)}</h3>
          <p>Aguardando (consumo)</p>
        </div>
        <div className="card-info">
          <h3>{fmt(potencial)}</h3>
          <p>Potencial (conf. + aguard.)</p>
        </div>
        <div className={`card-info ${bateu ? "card-info--confirmed" : "card-info--pending"}`}>
          <h3>{bateu ? "0" : fmt(faltam)}</h3>
          <p>{bateu ? "Meta atingida" : "Faltam para a meta"}</p>
        </div>
      </div>

      {metaNum > 0 ? (
        <div className="dash-progresso">
          <div className="dash-progresso__cabecalho">
            <span>Progresso da meta (confirmados + aguardando)</span>
            <strong>
              {fmt(potencial)} de {metaNum} ({pctTotal}%)
            </strong>
          </div>
          <div className="dash-meta__barra">
            <span className="dash-meta__seg dash-meta__seg--conf" style={{ width: `${pctConf}%` }} title="Confirmados" />
            <span className="dash-meta__seg dash-meta__seg--pend" style={{ width: `${pctPend}%` }} title="Aguardando" />
          </div>
          <div className="dash-meta__legenda">
            <span><i className="dash-meta__ponto dash-meta__ponto--conf" /> Confirmados</span>
            <span><i className="dash-meta__ponto dash-meta__ponto--pend" /> Aguardando</span>
          </div>
        </div>
      ) : null}

      <div className="dash-meta__form">
        <label htmlFor="meta-convidados-input">Definir meta (em porções de adulto)</label>
        <div className="dash-meta__linha">
          <input
            id="meta-convidados-input"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Ex.: 200"
          />
          <button
            type="button"
            className="toolbar-btn toolbar-btn--primary"
            onClick={salvar}
            disabled={salvando || !alterada}
          >
            {salvando ? "Salvando..." : "Salvar meta"}
          </button>
        </div>
        <small className="form-hint">
          Consumo = adultos + metade das crianças de 6 a 10. Crianças de 0 a 5 não contam.
          &quot;Faltam&quot; considera os pendentes como se todos viessem.
        </small>
      </div>
    </div>
  );
}
