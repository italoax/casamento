/**
 * MURAL DE FOTOS DA FESTA
 *
 * GET  /api/festa/fotos  -> lista só as fotos JÁ APROVADAS.
 * POST /api/festa/fotos  -> convidado envia uma foto (nome + Turnstile).
 *
 * Envio sem cadastro nem verificação de e-mail: numa festa, mandar o convidado
 * abrir a caixa de entrada para buscar um código custa a maior parte das fotos.
 * O captcha barra robôs; contra conteúdo indevido a proteção é a MODERAÇÃO —
 * toda foto entra com `aprovado = 0` e só aparece no álbum após o aval do casal
 * na aba "Fotos da Festa" do painel.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import sharp from "@/lib/sharp-safe";
import { NextRequest } from "next/server";
import { execute, queryRows } from "@/lib/db";
import { cleanText } from "@/lib/http";
import { Security, SafeLog } from "@/lib/security";
import { festaUploadsDir } from "@/lib/uploads";
import { aparelhoLiberado } from "@/lib/festa-auth";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB de entrada (a foto é recomprimida)
const MAX_DIMENSAO = 1600; // lado maior, em px

type FotoFesta = { id: number; nome: string; arquivo: string; created_at: string };

async function ensureTabela() {
  await execute(`CREATE TABLE IF NOT EXISTS festa_fotos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nome VARCHAR(80) NOT NULL,
    email VARCHAR(160) NULL,
    arquivo VARCHAR(255) NOT NULL,
    ip VARCHAR(64) NULL,
    aprovado TINYINT(1) NOT NULL DEFAULT 1,
    INDEX idx_created_at (created_at),
    INDEX idx_aprovado (aprovado)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  // Tabelas criadas antes da verificação por e-mail: adiciona a coluna (idempotente).
  await execute("ALTER TABLE festa_fotos ADD COLUMN email VARCHAR(160) NULL").catch(() => undefined);
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new Response(null, { status: 204, headers: Security.corsHeaders(origin, request.url) });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);
  try {
    await ensureTabela();
    const fotos = (await queryRows(
      "SELECT id, nome, arquivo, created_at FROM festa_fotos WHERE aprovado = 1 ORDER BY created_at DESC, id DESC LIMIT 300",
    )) as FotoFesta[];
    return Response.json({ sucesso: true, fotos }, { headers: { ...corsHeaders, "Cache-Control": "no-store" } });
  } catch (error) {
    SafeLog.error("GET /api/festa/fotos", error);
    return Response.json({ sucesso: false, erro: "Falha ao carregar as fotos." }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = Security.corsHeaders(origin, request.url);

  if (!Security.isAllowedOrigin(origin, request.url)) {
    return Response.json({ sucesso: false, erro: "Origem não autorizada." }, { status: 403, headers: corsHeaders });
  }

  try {
    // Aparelho liberado em /api/festa/sessao (um Turnstile, válido 24h). O token
    // do captcha é de uso único, então validá-lo por foto impediria o envio de
    // várias de uma vez — daí a sessão.
    if (!aparelhoLiberado(request)) {
      return Response.json({ sucesso: false, erro: "Confirme a verificação de segurança para enviar." }, { status: 401, headers: corsHeaders });
    }

    const ip = Security.clientIp(request);
    // Numa festa, várias fotos por pessoa são esperadas: até 30 a cada 5 min por IP.
    if (!Security.checkRateLimit(`POST:festa-fotos:${ip}`, 30, 300)) {
      return Response.json({ sucesso: false, erro: "Muitos envios. Aguarde um pouquinho e tente de novo." }, { status: 429, headers: corsHeaders });
    }

    const form = await request.formData().catch(() => null);
    if (!form) {
      return Response.json({ sucesso: false, erro: "Envio inválido." }, { status: 400, headers: corsHeaders });
    }

    const nome = cleanText(form.get("nome"), 80);
    const arquivo = form.get("foto");

    if (nome.length < 2) {
      return Response.json({ sucesso: false, erro: "Informe seu nome." }, { status: 422, headers: corsHeaders });
    }

    if (!(arquivo instanceof File) || arquivo.size <= 0) {
      return Response.json({ sucesso: false, erro: "Selecione uma foto." }, { status: 422, headers: corsHeaders });
    }
    if (arquivo.size > MAX_UPLOAD_BYTES) {
      return Response.json({ sucesso: false, erro: "Foto muito grande (máx. 20 MB)." }, { status: 413, headers: corsHeaders });
    }
    if (!arquivo.type.startsWith("image/") && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(arquivo.name)) {
      return Response.json({ sucesso: false, erro: "Envie um arquivo de imagem." }, { status: 422, headers: corsHeaders });
    }

    // Recomprime para WebP (orienta pelo EXIF e reduz o lado maior a 1600px).
    const bytes = Buffer.from(await arquivo.arrayBuffer());
    let webp: Buffer;
    try {
      webp = await sharp(bytes, { failOn: "none" })
        .rotate()
        .resize({ width: MAX_DIMENSAO, height: MAX_DIMENSAO, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();
    } catch {
      return Response.json({ sucesso: false, erro: "Não foi possível processar a imagem." }, { status: 422, headers: corsHeaders });
    }

    await ensureTabela();
    const dir = festaUploadsDir();
    await mkdir(dir, { recursive: true });
    const filename = `festa-${Date.now()}-${randomBytes(4).toString("hex")}.webp`;
    await writeFile(path.join(dir, filename), webp);
    const caminho = `img/festa/${filename}`;

    const [result] = await execute(
      "INSERT INTO festa_fotos (nome, email, arquivo, ip, aprovado) VALUES (?, ?, ?, ?, 0)",
      [nome, "", caminho, ip],
    );
    const id = Number((result as { insertId?: number }).insertId || 0);

    // `foto` não vai na resposta de propósito: como entra pendente, o álbum do
    // convidado não deve exibi-la ainda (senão ele vê algo que os outros não).
    return Response.json(
      { sucesso: true, pendente: true, id },
      { status: 201, headers: corsHeaders },
    );
  } catch (error) {
    SafeLog.error("POST /api/festa/fotos", error);
    return Response.json({ sucesso: false, erro: "Não foi possível enviar a foto." }, { status: 500, headers: corsHeaders });
  }
}
