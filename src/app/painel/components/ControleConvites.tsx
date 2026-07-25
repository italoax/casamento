"use client";

import { useMemo, useState } from "react";
import type { ConviteControle } from "../_types";

type Filtro = "todos" | "confirmado" | "pendente" | "recusado";

const ROTULO: Record<string, string> = {
  confirmado: "Confirmado",
  pendente: "Pendente",
  recusado: "Não vai",
};

/**
 * Controle por convite: mostra, de cada convite, quem vai e quem não vai.
 *
 * Os dados vêm prontos do servidor (getDashboardData). Aqui só filtramos e
 * exibimos — nenhuma escrita, então não há como corromper dados a partir daqui.
 */
export function ControleConvites({ convites }: { convites: ConviteControle[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");

  const contagem = useMemo(() => {
    const c = { confirmado: 0, pendente: 0, recusado: 0 };
    for (const cv of convites) if (cv.status in c) c[cv.status as keyof typeof c]++;
    return c;
  }, [convites]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return convites.filter((cv) => {
      if (filtro !== "todos" && cv.status !== filtro) return false;
      if (!q) return true;
      if (cv.nome.toLowerCase().includes(q)) return true;
      return [...cv.vao, ...cv.naoVao, ...cv.pendentes].some((n) => n.toLowerCase().includes(q));
    });
  }, [convites, filtro, busca]);

  const chips: { key: Filtro; label: string }[] = [
    { key: "todos", label: `Todos (${convites.length})` },
    { key: "confirmado", label: `Confirmados (${contagem.confirmado})` },
    { key: "pendente", label: `Pendentes (${contagem.pendente})` },
    { key: "recusado", label: `Não vão (${contagem.recusado})` },
  ];

  return (
    <div className="controle-convites">
      <div className="controle-convites__barra">
        <input
          type="search"
          className="controle-convites__busca"
          placeholder="Buscar convite ou pessoa…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="controle-convites__chips">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`toolbar-btn${filtro === c.key ? " toolbar-btn--primary" : ""}`}
              onClick={() => setFiltro(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {visiveis.length === 0 ? (
        <p className="table-empty">Nenhum convite encontrado.</p>
      ) : (
        <div className="controle-convites__lista">
          {visiveis.map((cv, i) => (
            <div className={`convite-card convite-card--${cv.status}`} key={`${cv.nome}-${i}`}>
              <div className="convite-card__topo">
                <span className="convite-card__nome">{cv.nome}</span>
                <span className={`status-badge convite-card__status convite-card__status--${cv.status}`}>
                  {ROTULO[cv.status] || cv.status}
                </span>
              </div>

              {cv.vao.length > 0 ? (
                <div className="convite-card__grupo">
                  <span className="convite-card__rotulo convite-card__rotulo--vai">✓ Vão ({cv.vao.length})</span>
                  <div className="convite-card__pessoas">
                    {cv.vao.map((n, k) => <span key={k} className="pessoa-chip pessoa-chip--vai">{n}</span>)}
                  </div>
                </div>
              ) : null}

              {cv.naoVao.length > 0 ? (
                <div className="convite-card__grupo">
                  <span className="convite-card__rotulo convite-card__rotulo--nao">✗ Não vão ({cv.naoVao.length})</span>
                  <div className="convite-card__pessoas">
                    {cv.naoVao.map((n, k) => <span key={k} className="pessoa-chip pessoa-chip--nao">{n}</span>)}
                  </div>
                </div>
              ) : null}

              {cv.pendentes.length > 0 ? (
                <div className="convite-card__grupo">
                  <span className="convite-card__rotulo convite-card__rotulo--pend">• Aguardando resposta ({cv.pendentes.length})</span>
                  <div className="convite-card__pessoas">
                    {cv.pendentes.map((n, k) => <span key={k} className="pessoa-chip pessoa-chip--pend">{n}</span>)}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
