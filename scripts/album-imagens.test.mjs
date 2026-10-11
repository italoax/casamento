import test from "node:test";
import assert from "node:assert/strict";
import { criarLinkImagem, servirImagemAlbum } from "../src/lib/site/album-imagens.mjs";

const caminho = `assets/${"a".repeat(32)}/revisions/${"b".repeat(32)}/renditions/${"c".repeat(32)}`;
const request = link => new Request(`https://casamento.test${link}`);

async function ambiente(run) {
    const fetchOriginal = globalThis.fetch;
    const chaveOriginal = process.env.ENCRYPTION_KEY;
    const origemOriginal = process.env.ALBUM_ADOBE_URL;
    process.env.ALBUM_ADOBE_URL = `https://lightroom.adobe.com/v2/spaces/${"d".repeat(32)}/albums/${"e".repeat(32)}/assets`;
    process.env.ENCRYPTION_KEY = "ab".repeat(32);
    try { await run(); }
    finally {
        globalThis.fetch = fetchOriginal;
        if (chaveOriginal === undefined) delete process.env.ENCRYPTION_KEY;
        else process.env.ENCRYPTION_KEY = chaveOriginal;
        if (origemOriginal === undefined) delete process.env.ALBUM_ADOBE_URL;
        else process.env.ALBUM_ADOBE_URL = origemOriginal;
    }
}

test("serve imagem e download sem expor origem nos links, headers ou conteúdo", () => ambiente(async () => {
    globalThis.fetch = async (url, options) => {
        assert.ok(url.endsWith(caminho));
        assert.equal(options.redirect, "error");
        return new Response(new Uint8Array([1, 2, 3]), { headers: {
            "Content-Type": "image/jpeg", "Location": url, "X-Adobe-Link": url,
        } });
    };
    for (const download of [false, true]) {
        const link = criarLinkImagem(caminho, download);
        assert.doesNotMatch(link, /adobe|assets|revisions|renditions/);
        const token = new URL(link, "https://casamento.test").searchParams.get("foto");
        assert.ok(!Buffer.from(token, "base64url").includes(Buffer.from(caminho)));
        const response = await servirImagemAlbum(request(link), download);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("Content-Type"), "image/jpeg");
        assert.ok(response.headers.get("Content-Disposition").startsWith(download ? "attachment;" : "inline;"));
        assert.equal(response.headers.get("Location"), null);
        assert.equal(response.headers.get("X-Adobe-Link"), null);
        assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3]));
    }
}));

test("rejeita caminhos antigos, URL externa, token adulterado e token de outra chave", () => ambiente(async () => {
    let consultas = 0;
    globalThis.fetch = async () => { consultas++; throw new Error("Não consultar"); };
    const link = criarLinkImagem(caminho);
    const url = new URL(link, "https://casamento.test");
    const dados = Buffer.from(url.searchParams.get("foto"), "base64url");
    dados[30] ^= 1;
    for (const token of ["", caminho, "https://externo/foto", dados.toString("base64url"), "a".repeat(513)]) {
        assert.equal((await servirImagemAlbum(request(`/api/album/imagem?foto=${encodeURIComponent(token)}`))).status, 400);
    }
    process.env.ENCRYPTION_KEY = "cd".repeat(32);
    assert.equal((await servirImagemAlbum(request(link))).status, 400);
    assert.equal(consultas, 0);
    assert.throws(() => criarLinkImagem("https://externo/foto"));
}));

test("falhas e respostas que não sejam imagem retornam erro genérico sem origem", () => ambiente(async () => {
    const link = criarLinkImagem(caminho);
    for (const tipo of ["text/html", "image/svg+xml"]) {
        globalThis.fetch = async () => new Response("Conteúdo privado da origem", { headers: { "Content-Type": tipo } });
        const response = await servirImagemAlbum(request(link));
        assert.equal(response.status, 502);
        assert.doesNotMatch(await response.text(), /adobe|Conteúdo privado/);
    }
    globalThis.fetch = async () => { throw new Error("https://lightroom.adobe.com/privado"); };
    const response = await servirImagemAlbum(request(link));
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /adobe|privado/);
    delete process.env.ENCRYPTION_KEY;
    assert.throws(() => criarLinkImagem(caminho), /Chave/);
}));
