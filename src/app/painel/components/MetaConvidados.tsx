"use client";

import { useEffect, useState } from "react";

/**
 * Card "Meta de convidados" do Dashboard.
 *
 * O cálculo é por CONSUMO (porções de adulto), não por cabeça:
 *   adulto = 1 · criança 6 a 10 = 0,5 · criança 0 a 5 = 0 (não conta).
 * "Faltam" = meta − consumo confirmado (nunca negativo).
 */
export function MetaConvidados({
  meta,
  adultosConf,
  criancas610Conf,
  onSalvar,
}: {
  meta: number;
  adultosConf: number;
  criancas610Conf: number;
  onSalvar: (meta: number) => Promise<boolean>;
}) {
  const [valor, setValor] = useState(meta ? String(meta) : "");
  const [salvando, setSalvando] = useState(false);

  // Ressincroniza quando o dashboard recarrega (ex.: após salvar).
  useEffect(() => {
    setValor(meta ? String(meta) : "");
  }, [meta]);

  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ","));

  const consumo = adultosConf + criancas610Conf * 0.5;
  const metaNum = Math.max(0, Math.round(Number(valor) || 0));
  const faltam = Math.max(0, metaNum - consumo);
  const pct = metaNum > 0 ? Math.min(100, Math.round((consumo / metaNum) * 100)) : 0;
  const bateu = metaNum > 0 && consumo >= metaNum;
  const alterada = metaNum !== Math.max(0, Math.round(meta || 0));

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
        <div className="card-info">
          <h3>{fmt(consumo)}</h3>
          <p>Confirmados (consumo)</p>
        </div>
        <div className="card-info">
          <h3>{metaNum || "-"}</h3>
          <p>Meta</p>
        </div>
        <div className={`card-info ${bateu ? "card-info--confirmed" : "card-info--pending"}`}>
          <h3>{bateu ? "0" : fmt(faltam)}</h3>
          <p>{bateu ? "Meta atingida" : "Faltam"}</p>
        </div>
      </div>

      {metaNum > 0 ? (
        <div className="dash-progresso">
          <div className="dash-progresso__cabecalho">
            <span>Progresso da meta</span>
            <strong>
              {fmt(consumo)} de {metaNum} ({pct}%)
            </strong>
          </div>
          <div className="dash-progresso__barra">
            <span className="dash-progresso__fill--vai" style={{ width: `${pct}%` }} />
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
        </small>
      </div>
    </div>
  );
}
