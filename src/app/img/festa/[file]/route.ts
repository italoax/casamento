/**
 * SERVE FOTOS DA FESTA - GET /img/festa/[file]
 *
 * As fotos enviadas pelos convidados ficam num diretório PERSISTENTE fora da
 * pasta do deploy (ver src/lib/uploads.ts -> festaUploadsDir). Esta rota lê o
 * arquivo do disco e o devolve. Arquivos que existam em public/img/festa (dev)
 * são servidos estaticamente pelo Next e nem chegam aqui.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { festaUploadsDir } from "@/lib/uploads";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
};

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;

  // basename impede path traversal (../). Só aceita nome de arquivo simples.
  const safe = path.basename(String(file || ""));
  if (!safe || safe.includes("\0") || safe.startsWith(".")) {
    return new Response("Not found", { status: 404 });
  }

  const ext = path.extname(safe).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await readFile(path.join(festaUploadsDir(), safe));
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
