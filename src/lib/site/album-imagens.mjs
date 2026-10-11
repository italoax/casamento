import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getAlbumOrigem } from "./album-origem.mjs";

const CAMINHO = /^assets\/([a-f0-9]{32})\/revisions\/[a-f0-9]{32}\/renditions\/[a-f0-9]{32}$/;

function chave() {
    const secret = process.env.ENCRYPTION_KEY || "";
    if (!/^[a-f0-9]{64}$/i.test(secret)) throw new Error("Chave das imagens indisponível.");
    // Separa a chave dos links das outras utilizações de ENCRYPTION_KEY.
    return createHash("sha256").update("album-imagens-v1:").update(Buffer.from(secret, "hex")).digest();
}

export function criarLinkImagem(caminho, download = false) {
    if (!CAMINHO.test(caminho)) throw new Error("Foto inválida.");
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", chave(), iv);
    const conteudo = Buffer.concat([cipher.update(caminho, "utf8"), cipher.final()]);
    const token = Buffer.concat([iv, cipher.getAuthTag(), conteudo]).toString("base64url");
    return `/api/album/${download ? "download" : "imagem"}?foto=${token}`;
}

function lerImagem(token) {
    if (typeof token !== "string" || token.length > 512 || !/^[A-Za-z0-9_-]+$/.test(token)) throw new Error("Foto inválida.");
    const dados = Buffer.from(token, "base64url");
    if (dados.length < 29) throw new Error("Foto inválida.");
    const decipher = createDecipheriv("aes-256-gcm", chave(), dados.subarray(0, 12));
    decipher.setAuthTag(dados.subarray(12, 28));
    const caminho = Buffer.concat([decipher.update(dados.subarray(28)), decipher.final()]).toString("utf8");
    const match = caminho.match(CAMINHO);
    if (!match) throw new Error("Foto inválida.");
    return { caminho, id: match[1] };
}

export async function servirImagemAlbum(request, download = false) {
    let foto;
    try { foto = lerImagem(new URL(request.url).searchParams.get("foto")); }
    catch { return Response.json({ erro: "Foto inválida." }, { status: 400 }); }
    try {
        const response = await fetch(getAlbumOrigem().imageBase + foto.caminho, {
            cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
        });
        const tipo = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
        const extensoes = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };
        if (!response.ok || !extensoes[tipo]) throw new Error("Foto indisponível.");
        // Encaminha apenas o conteúdo e os headers locais, nunca o endereço de origem.
        return new Response(response.body, { headers: {
            "Content-Type": tipo,
            "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Emanuelle-Italo-${foto.id}.${extensoes[tipo]}"`,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        } });
    } catch {
        return Response.json({ erro: "Não foi possível carregar esta foto. Tente novamente." }, { status: 502 });
    }
}
