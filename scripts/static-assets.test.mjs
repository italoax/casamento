import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { prepararAssets } from "./static-assets.mjs";

function fixture(t) {
    const root = mkdtempSync(path.join(tmpdir(), "casamento-assets-test-"));
    t.after(() => {
        assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()));
        assert.ok(path.basename(root).startsWith("casamento-assets-test-"));
        rmSync(root, { recursive: true, force: true });
    });
    for (const dir of ["css", "js/core"]) mkdirSync(path.join(root, "public", dir), { recursive: true });
    writeFileSync(path.join(root, "public/css/site.css"), "body { background: url('../img/fundo.webp'); }");
    writeFileSync(path.join(root, "public/js/index.js"), 'import "./core/init.js";');
    writeFileSync(path.join(root, "public/js/core/init.js"), "console.log('v1');");
    writeFileSync(path.join(root, "public/sw.js"), "// worker v1");
    return root;
}

test("mesmo conteúdo mantém URLs e versão entre builds e diretórios", t => {
    const a = fixture(t);
    const b = fixture(t);
    assert.deepEqual(prepararAssets(a), prepararAssets(a));
    assert.deepEqual(prepararAssets(a), prepararAssets(b));
});

test("alterar módulo importado muda todo o conjunto JS, preservando CSS e cópias antigas", t => {
    const root = fixture(t);
    const antes = prepararAssets(root);
    writeFileSync(path.join(root, "public/js/core/init.js"), "console.log('v2');");
    const depois = prepararAssets(root);
    assert.notEqual(antes.paths["/js/index.js"], depois.paths["/js/index.js"]);
    assert.notEqual(antes.paths["/js/core/init.js"], depois.paths["/js/core/init.js"]);
    assert.equal(antes.paths["/css/site.css"], depois.paths["/css/site.css"]);
    assert.equal(readFileSync(path.join(root, "public", antes.paths["/js/core/init.js"]), "utf8"), "console.log('v1');");
    const dependency = new URL("./core/init.js", `https://site.invalid${depois.paths["/js/index.js"]}`);
    assert.equal(dependency.pathname, depois.paths["/js/core/init.js"]);
});

test("CSS preserva localização de imagens e alteração no SW atualiza apenas a versão da PWA", t => {
    const root = fixture(t);
    const antes = prepararAssets(root);
    const css = readFileSync(path.join(root, "public", antes.paths["/css/site.css"]), "utf8");
    assert.match(css, /url\("\/img\/fundo.webp"\)/);
    writeFileSync(path.join(root, "public/sw.js"), "// worker v2");
    const depois = prepararAssets(root);
    assert.deepEqual(antes.paths, depois.paths);
    assert.notEqual(antes.version, depois.version);
});
