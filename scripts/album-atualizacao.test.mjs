import test from "node:test";
import assert from "node:assert/strict";
import { notificarAlbumAtualizado, observarAlbumAtualizado } from "../src/lib/site/album-atualizacao.mjs";

function ambiente(run) {
    const janelaAnterior = globalThis.window;
    const canalAnterior = globalThis.BroadcastChannel;
    const canais = new Set();
    const storage = [];
    globalThis.window = new EventTarget();
    window.localStorage = { setItem: (key, value) => storage.push({ key, value }) };
    globalThis.BroadcastChannel = class {
        constructor(nome) { this.nome = nome; canais.add(this); }
        postMessage(data) {
            for (const canal of canais) {
                if (canal !== this && canal.nome === this.nome) canal.onmessage?.({ data });
            }
        }
        close() { canais.delete(this); }
    };
    try { run({ canais, storage }); }
    finally {
        globalThis.window = janelaAnterior;
        globalThis.BroadcastChannel = canalAnterior;
    }
}

test("salvamento avisa a própria página e outras abas e remove listeners ao sair", () => ambiente(({ canais, storage }) => {
    let atualizacoes = 0;
    const parar = observarAlbumAtualizado(() => atualizacoes++);
    notificarAlbumAtualizado();
    assert.equal(atualizacoes, 1);
    assert.equal(canais.size, 1);
    assert.equal(storage.length, 0);
    const outraAba = new BroadcastChannel([...canais][0].nome);
    outraAba.postMessage({ origem: "outra-aba" });
    outraAba.close();
    assert.equal(atualizacoes, 2);
    parar();
    notificarAlbumAtualizado();
    assert.equal(atualizacoes, 2);
    assert.equal(canais.size, 0);
}));

test("sem BroadcastChannel, avisa outras abas por storage e ignora chaves alheias", () => ambiente(({ storage }) => {
    globalThis.BroadcastChannel = undefined;
    let atualizacoes = 0;
    const parar = observarAlbumAtualizado(() => atualizacoes++);
    notificarAlbumAtualizado();
    assert.equal(atualizacoes, 1);
    assert.equal(storage.length, 1);
    const evento = new Event("storage");
    evento.key = "outra-chave";
    window.dispatchEvent(evento);
    assert.equal(atualizacoes, 1);
    evento.key = storage[0].key;
    window.dispatchEvent(evento);
    assert.equal(atualizacoes, 2);
    parar();
    window.dispatchEvent(evento);
    assert.equal(atualizacoes, 2);
}));

test("storage e canal bloqueados não transformam salvamento em erro", () => ambiente(() => {
    globalThis.BroadcastChannel = class { constructor() { throw new Error("Bloqueado"); } };
    window.localStorage.setItem = () => { throw new Error("Bloqueado"); };
    let atualizacoes = 0;
    const parar = observarAlbumAtualizado(() => atualizacoes++);
    assert.doesNotThrow(notificarAlbumAtualizado);
    assert.equal(atualizacoes, 1);
    parar();
}));
