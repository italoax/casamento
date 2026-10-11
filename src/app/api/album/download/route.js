import { servirImagemAlbum } from "@/lib/site/album-imagens.mjs";

export const runtime = "nodejs";

export async function GET(request) {
    return servirImagemAlbum(request, true);
}
