import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { carregarPaginaAlbum, validarSelecao } from "../src/lib/site/album-adobe.mjs";

const a = "a".repeat(32), b = "b".repeat(32);
const importar = source => import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const ler = path => readFile(new URL(path, import.meta.url), "utf8");

test("valida IDs, deduplica e distingue álbum completo de seleção vazia", () => {
    assert.equal(validarSelecao(null), null);
    assert.deepEqual(validarSelecao([]), []);
    assert.deepEqual(validarSelecao([a, b, a]), [a, b]);
    for (const ids of [undefined, {}, "todos", ["../foto"], [123], Array(10001).fill(a)]) assert.throws(() => validarSelecao(ids));
});

test("consulta Adobe com cursor, trata XSSI e ignora imagens com caminho inválido", async () => {
    const original = globalThis.fetch;
    let consulta;
    globalThis.fetch = async url => {
        consulta = new URL(url);
        return new Response('while (1) {}' + JSON.stringify({ resources: [
            { asset: { id: a, links: { "/rels/rendition_type/1280": { href: `assets/${a}/revisions/${b}/renditions/${a}` } } } },
            { asset: { id: b, links: { "/rels/rendition_type/1280": { href: "https://externo/foto" } } } },
        ], links: { next: { href: "?order_after=seguinte" } } }));
    };
    try {
        const pagina = await carregarPaginaAlbum("order_after=segunda");
        assert.equal(consulta.searchParams.get("order_after"), "segunda");
        assert.equal(consulta.searchParams.get("embed"), "asset");
        assert.deepEqual(pagina.fotos.map(foto => foto.id), [a]);
        assert.equal(pagina.proxima, "order_after=seguinte");
        await assert.rejects(carregarPaginaAlbum("url=externo"), error => error.status === 400);
    } finally { globalThis.fetch = original; }
});

test("salva no banco, mantém seleção vazia e não exibe todas em falha no banco", async () => {
    let row = null, erro = null;
    const queries = [];
    globalThis.__albumDbTest = {
        db: () => ({ execute: async (sql, params) => { queries.push(sql); if (params) row = { ids: params[0] }; } }),
        queryOne: async () => { if (erro) throw erro; return row; },
        validarSelecao,
    };
    const source = (await ler("../src/lib/site/album-config.js"))
        .replace(/import .*;\r?\n/g, "")
        .replace(/^/, "const { db, queryOne, validarSelecao } = globalThis.__albumDbTest;\n");
    const { getAlbumSelecao, setAlbumSelecao } = await importar(source);
    assert.equal(await getAlbumSelecao(), null);
    await setAlbumSelecao([a, b, a]);
    assert.deepEqual(await getAlbumSelecao(), [a, b]);
    assert.ok(queries[0].includes("CREATE TABLE IF NOT EXISTS"));
    await setAlbumSelecao([]);
    assert.deepEqual(await getAlbumSelecao(), []);
    erro = new Error("Banco indisponível");
    await assert.rejects(getAlbumSelecao(), /Banco indisponível/);
    erro.code = "ER_NO_SUCH_TABLE";
    assert.equal(await getAlbumSelecao(), null);
});

test("API do painel exige permissão, bloqueia origem externa e rejeita IDs inválidos", async () => {
    const ctx = { autorizado: false, origem: true, salvos: null };
    globalThis.__albumApiTest = {
        requirePainelPermission: async () => ctx.autorizado,
        errorJson: (erro, status, init) => Response.json({ erro }, { ...init, status }),
        json: (data, init) => Response.json(data, init),
        Security: { isAllowedOrigin: () => ctx.origem }, SafeLog: { error: () => {} },
        carregarPaginaAlbum: async () => ({ fotos: [], proxima: null }),
        validarSelecao, getAlbumSelecao: async () => ctx.salvos,
        setAlbumSelecao: async ids => { ctx.salvos = ids; return ids; },
    };
    const source = (await ler("../src/app/api/painel/album/route.js"))
        .replace(/import .*;\r?\n/g, "")
        .replace(/^/, "const {requirePainelPermission,errorJson,json,Security,SafeLog,carregarPaginaAlbum,validarSelecao,getAlbumSelecao,setAlbumSelecao} = globalThis.__albumApiTest;\n");
    const { GET, POST } = await importar(source);
    const request = ids => new Request("http://localhost/api/painel/album", { method: "POST", body: JSON.stringify({ ids }) });
    assert.equal((await GET(new Request("http://localhost/api/painel/album"))).status, 403);
    assert.equal((await POST(request([a]))).status, 403);
    ctx.autorizado = true; ctx.origem = false;
    assert.equal((await POST(request([a]))).status, 403);
    ctx.origem = true;
    assert.equal((await POST(request(["inválido"]))).status, 400);
    const result = await POST(request([a, a]));
    assert.equal(result.status, 200);
    assert.deepEqual(ctx.salvos, [a]);
    assert.equal(result.headers.get("cache-control"), "no-store");
});

test("API pública filtra IDs, preserva cursor em página vazia e lê seleção atual", async () => {
    let ids = [b], chamadas = 0;
    globalThis.__albumPublicTest = {
        getAlbumSelecao: async () => ids,
        carregarPaginaAlbum: async () => { chamadas++; return { fotos: [{ id: a }], proxima: "order_after=next" }; },
    };
    const source = (await ler("../src/app/api/album/route.js"))
        .replace(/import .*;\r?\n/g, "")
        .replace(/^/, "const {getAlbumSelecao,carregarPaginaAlbum} = globalThis.__albumPublicTest;\n");
    const { GET } = await importar(source);
    const request = new Request("http://localhost/api/album");
    let response = await GET(request);
    assert.deepEqual(await response.json(), { fotos: [], proxima: "order_after=next" });
    assert.equal(response.headers.get("cache-control"), "no-store");
    ids = [a]; response = await GET(request);
    assert.deepEqual((await response.json()).fotos, [{ id: a }]);
    ids = []; const before = chamadas;
    assert.deepEqual(await (await GET(request)).json(), { fotos: [], proxima: null });
    assert.equal(chamadas, before);
    ids = null;
    assert.deepEqual((await (await GET(request)).json()).fotos, [{ id: a }]);
});
