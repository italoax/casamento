const IMAGE_BASE = "https://lightroom.adobe.com/v2c/spaces/c259270cc06e4781b16c4acb8426e040/";

export async function GET(request) {
    const caminho = new URL(request.url).searchParams.get("foto") || "";
    const match = caminho.match(/^assets\/([a-f0-9]{32})\/revisions\/[a-f0-9]{32}\/renditions\/[a-f0-9]{32}$/);
    if (!match) return Response.json({ erro: "Foto inválida." }, { status: 400 });
    try {
        const response = await fetch(IMAGE_BASE + caminho, {
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
            throw new Error("Foto indisponível");
        }
        // Transmite a versão JPEG do Adobe sem salvar arquivos no servidor.
        return new Response(response.body, {
            headers: {
                "Content-Type": response.headers.get("content-type"),
                "Content-Disposition": `attachment; filename="Emanuelle-Italo-${match[1]}.jpg"`,
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch {
        return Response.json({ erro: "Não foi possível baixar esta foto. Tente novamente." }, { status: 502 });
    }
}
