"use client";

import type { FormEvent } from "react";
import { dateBR, datetimeLocalBR, utcStoredDate } from "../utils/formatting";

type RsvpProps = {
  data: any;
  api: (url: string, options: RequestInit, successMessage: string) => Promise<unknown>;
};

export function Rsvp({ data, api }: RsvpProps) {
  const rsvpDeadline = utcStoredDate(data.rsvpDeadline);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());

    await api(
      "/api/painel/rsvp",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      "Prazo salvo."
    );
  }

  function removerPrazo() {
    if (!confirm("Remover prazo?")) return;
    api("/api/painel/rsvp", { method: "DELETE" }, "Prazo removido.");
  }

  return (
    <div id="tab-confirmacao" className="tab-conteudo ativo rsvp-tab">
      <div className="painel-header compact rsvp-heading">
        <div>
          <span className="rsvp-eyebrow">RSVP</span>
          <h3 className="painel-subtitulo">Prazo da confirmação de presença</h3>
        </div>
      </div>

      <div className="painel-card-form rsvp-config-card">
        <div className="rsvp-status-card">
          <span className="rsvp-status-label">Prazo atual</span>
          <strong>{dateBR(rsvpDeadline)}</strong>
        </div>

        <form id="form-rsvp-deadline" className="form-modal rsvp-deadline-form" onSubmit={submit}>
          <label className="rsvp-date-field">
            <span>Nova data limite</span>
            <input
              type="datetime-local"
              name="data_limite_confirmacao"
              defaultValue={datetimeLocalBR(rsvpDeadline)}
              required
            />
          </label>

          <div className="rsvp-actions">
            <button className="toolbar-btn toolbar-btn--primary" type="submit">
              Salvar prazo
            </button>
            <button type="button" className="toolbar-btn toolbar-btn--danger" onClick={removerPrazo}>
              Remover prazo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
