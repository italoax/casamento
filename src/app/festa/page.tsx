/**
 * MURAL DE FOTOS DA FESTA — /festa
 *
 * Página que o convidado abre ao escanear o QR Code. Permite enviar uma foto
 * (com nome + Turnstile) e ver a galeria com as fotos de todos, em tempo real.
 */

import type { Metadata } from "next";
import { FestaClient } from "./FestaClient";
import "./festa.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mural de Fotos · Emanuelle & Ítalo",
  description: "Envie suas fotos da festa e veja os momentos compartilhados por todos.",
  robots: { index: false, follow: false },
};

// Site key PÚBLICA do Turnstile (mesma do restante do site). Pode ser sobrescrita
// por env, mas o valor é público por natureza (vai para o navegador).
const TURNSTILE_SITEKEY = process.env.TURNSTILE_SITEKEY?.trim() || "0x4AAAAAADmFjx84Lu24WEVJ";

export default function FestaPage() {
  return (
    <FestaClient
      turnstileSiteKey={TURNSTILE_SITEKEY}
      cover="/img/noivos/img2.webp"
      dataFesta="16 de Agosto de 2026"
    />
  );
}
