import { queryRows } from "@/lib/db";
import { json, errorJson } from "@/lib/http";
import { releaseExpiredReservations } from "@/lib/payment";

export const runtime = "nodejs";

type Presente = Record<string, unknown> & {
  preco?: number | string;
  imagem?: string;
  modo_exibicao?: string;
  quantidade_disponivel?: number | string | null;
  preco_total_referencia?: number | string | null;
};

function versionarImagem(imagem: unknown) {
  const value = String(imagem || "").trim();
  if (!value) return value;
  if (/^(https?:)?\/\//i.test(value)) return value;
  if (value.startsWith("img/presentes/")) return value;
  return `img/presentes/${value}`;
}

function normalizarPresente(p: Presente) {
  const precoAtual = Number(p.preco || 0);
  const modo = String(p.modo_exibicao || "").trim().toLowerCase();
  const qtdRaw = p.quantidade_disponivel;
  const limiteDefinido = qtdRaw !== null && qtdRaw !== undefined && String(qtdRaw) !== "";
  const qtd = limiteDefinido ? Math.max(0, Number(qtdRaw)) : null;
  const usaCotas = modo === "cotas" || (modo === "" && qtd !== null && qtd > 1);

  if (usaCotas && qtd && qtd > 0) {
    const total = p.preco_total_referencia !== null && p.preco_total_referencia !== undefined && String(p.preco_total_referencia) !== ""
      ? Number(p.preco_total_referencia)
      : precoAtual;
    const unitario = Math.round((total / qtd) * 100) / 100;
    p.preco = precoAtual > 0 && Math.abs(precoAtual - total) > 0.01 ? precoAtual : unitario;
    p.preco_total_referencia = total;
  } else {
    p.preco = precoAtual;
  }

  p.quantidade_reservada = Number(p.quantidade_reservada || 0);
  p.imagem = versionarImagem(p.imagem);
  return p;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const acao = url.searchParams.get("acao") || "listar";

    if (acao !== "listar") {
      return errorJson("ação inválida.", 400);
    }

    // Libera reservas de Pix expirados para a lista refletir o estoque real.
    await releaseExpiredReservations().catch(() => undefined);

    const presentes = await queryRows<Presente>(
      `SELECT id, nome, categoria, preco, preco_base, preco_total_referencia, imagem, imagem_thumb,
        imagem_original_nome, imagem_mime, imagem_largura, imagem_altura,
        modo_exibicao, quantidade_disponivel, quantidade_vendida, quantidade_reservada
       FROM presentes
       WHERE status = 'disponivel'
       ORDER BY nome ASC`,
    );
    return json(presentes.map(normalizarPresente));
  } catch (error) {
    console.error("Erro em /api/presentes", error);
    return errorJson("Falha temporária ao listar presentes.", 500);
  }
}
