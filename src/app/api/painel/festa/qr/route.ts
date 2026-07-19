/**
 * QR Code do mural de fotos da festa (PNG para imprimir).
 * GET /api/painel/festa/qr  -> imagem PNG que aponta para /festa.
 */

import QRCode from "qrcode";
import { errorJson } from "@/lib/http";
import { requirePainelRole } from "@/lib/painel-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await requirePainelRole("admin"))) return errorJson("Acesso negado.", 403);

  // Resolve o domínio público (atrás do Cloudflare/Passenger o request.url pode vir
  // com host interno). Prioridade: SITE_URL -> x-forwarded-host/host -> request.url.
  let base = process.env.SITE_URL?.trim() || "";
  if (!base) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    if (host && !/^(localhost|127\.0\.0\.1|0\.0\.0\.0)/.test(host)) {
      const proto = request.headers.get("x-forwarded-proto") || "https";
      base = `${proto}://${host}`;
    } else {
      base = new URL(request.url).origin;
    }
  }
  const destino = `${base.replace(/\/+$/, "")}/festa`;

  try {
    const png = await QRCode.toBuffer(destino, {
      type: "png",
      width: 900,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#544b45", light: "#ffffff" },
    });
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'inline; filename="qrcode-fotos-festa.png"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return errorJson("Falha ao gerar o QR Code.", 500);
  }
}
