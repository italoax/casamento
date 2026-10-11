import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const codigo = await readFile(new URL("../public/js/atualizacao-site.js", import.meta.url), "utf8");
const finalizar = () => new Promise(resolve => setImmediate(resolve));

async function pagina({ versao = "v1", resposta = "v1", hidden = false, href = "https://site.test/?origem=convite#album-fotos" } = {}) {
    const recargas = [], eventos = {}, intervalos = [];
    const document = { currentScript: { dataset: { siteVersion: versao } }, hidden,
        addEventListener: (nome, callback) => { eventos[nome] = callback; } };
    let consultas = 0;
    const ctx = { document, URL, AbortSignal,
        window: { location: { href, replace: url => recargas.push(url) },
            addEventListener: (nome, callback) => { eventos[nome] = callback; } },
        setInterval: (callback, tempo) => intervalos.push({ callback, tempo }),
        fetch: async (url, options) => {
            consultas++;
            assert.equal(url, "/api/site/versao");
            assert.equal(options.cache, "no-store");
            if (resposta instanceof Error) throw resposta;
            return { ok: true, json: async () => ({ versao: resposta }) };
        },
    };
    runInNewContext(codigo, ctx);
    await finalizar();
    return { recargas, eventos, intervalos, document, consultas: () => consultas,
        responder: valor => { resposta = valor; } };
}

test("nova publicação recarrega uma vez, preservando caminho, parâmetros e seção", async () => {
    const p = await pagina({ resposta: "v2" });
    assert.equal(p.recargas.length, 1);
    const url = new URL(p.recargas[0]);
    assert.equal(url.searchParams.get("origem"), "convite");
    assert.equal(url.searchParams.get("_site_version"), "v2");
    assert.equal(url.hash, "#album-fotos");
    await p.intervalos[0].callback();
    assert.equal(p.recargas.length, 1);
});

test("mesma versão mantém a página aberta e verifica novamente em cinco segundos", async () => {
    const p = await pagina();
    assert.equal(p.recargas.length, 0);
    assert.equal(p.intervalos[0].tempo, 5000);
    p.responder("v2");
    await p.intervalos[0].callback();
    assert.equal(p.recargas.length, 1);
});

test("aba oculta espera voltar ao primeiro plano", async () => {
    const p = await pagina({ resposta: "v2", hidden: true });
    assert.equal(p.consultas(), 0);
    await p.intervalos[0].callback();
    assert.equal(p.consultas(), 0);
    p.document.hidden = false;
    await p.eventos.visibilitychange();
    assert.equal(p.recargas.length, 1);
});

test("falha de rede e versão vazia não recarregam; reconexão retoma a verificação", async () => {
    const p = await pagina({ resposta: new Error("Offline") });
    assert.equal(p.recargas.length, 0);
    p.responder("");
    await p.intervalos[0].callback();
    assert.equal(p.recargas.length, 0);
    p.responder("v2");
    await p.eventos.online();
    assert.equal(p.recargas.length, 1);
});

test("HTML antigo após recarga não entra em loop e desenvolvimento não consulta", async () => {
    const p = await pagina({ resposta: "v2", href: "https://site.test/?_site_version=v2" });
    assert.equal(p.recargas.length, 0);
    await p.intervalos[0].callback();
    assert.equal(p.recargas.length, 0);
    p.responder("v3");
    await p.intervalos[0].callback();
    assert.equal(p.recargas.length, 1);
    const dev = await pagina({ versao: "" });
    assert.equal(dev.consultas(), 0);
    assert.equal(dev.intervalos.length, 0);
});
