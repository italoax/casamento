import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

async function fixture({ build = false, block = false } = {}) {
    const timers = new Map();
    const errors = [];
    let serial = 0, calls = 0, sends = 0, release;
    const blocked = new Promise(resolve => { release = resolve; });
    const items = [{ id: 1, status: "pendente" }, { id: 2, status: "pendente" }];
    const context = vm.createContext({
        process: { env: { NEXT_PHASE: build ? "phase-production-build" : "" } },
        setTimeout(callback, ms) { const timer = { id: ++serial, unref() {} }; timers.set(timer, { callback, ms }); return timer; },
        clearTimeout(timer) { timers.delete(timer); },
    });
    const dependencies = {
        "@/lib/db": {
            async execute(sql, params) {
                calls++;
                if (sql.includes("SET status='enviando' WHERE id=?")) items.find(i => i.id === params[0]).status = "enviando";
                if (sql.includes("SET status='enviado'")) items.find(i => i.id === params[1]).status = "enviado";
                return [{ affectedRows: 1 }];
            },
            async queryOne(sql, params) {
                calls++;
                if (sql.includes("FROM whatsapp_jobs WHERE status='processando'")) {
                    if (block) return blocked;
                    return { id: 1, slot: "1", intervalo: 8, mensagem: "Olá" };
                }
                if (sql.includes("status='pendente'")) return items.find(i => i.status === "pendente");
                if (sql.includes("WHERE id=?")) return items.find(i => i.id === params[0]);
                throw new Error(`Consulta inesperada: ${sql}`);
            },
            queryRows() {},
        },
        "@/lib/security": { SafeLog: { error: (...args) => errors.push(args) } },
        "@/app/painel/utils/whatsapp-helpers": { aplicarVariaveis: text => text },
        "@/lib/whatsapp/whatsapp": {
            convitePublicUrl() {}, enviarDocumento() {},
            async enviarTexto() { sends++; return { messageId: "test" }; },
            async obterStatus() { return { connected: true, status: "conectado" }; },
        },
        "@/lib/whatsapp/whatsapp-config": { obterModelo() {} },
        "@/lib/whatsapp/whatsapp-log": { registrarEnvio() {} },
    };
    const source = readFileSync(new URL("../src/lib/whatsapp/whatsapp-queue.js", import.meta.url), "utf8");
    async function load() {
        const mod = new vm.SourceTextModule(source + "\nexport { tick as testTick };", { context });
        await mod.link(specifier => {
            const values = dependencies[specifier];
            return new vm.SyntheticModule(Object.keys(values), function () {
                for (const [key, value] of Object.entries(values)) this.setExport(key, value);
            }, { context });
        });
        await mod.evaluate();
        return mod.namespace;
    }
    return { first: await load(), second: await load(), timers, errors, release, calls: () => calls, sends: () => sends };
}

test("bundles da fila compartilham a trava; retomar durante um tick não abre outro loop", async () => {
    const f = await fixture({ block: true });
    const running = f.first.testTick();
    await f.second.testTick();
    await f.second.acaoJob(1, "retomar");
    assert.equal(f.timers.size, 0);
    f.release(null);
    await running;
    assert.equal(f.timers.size, 1);
    assert.equal([...f.timers.values()][0].ms, 50);
    assert.equal(f.sends(), 0);
    assert.deepEqual(f.errors, []);
});

test("o intervalo entre envios é respeitado mesmo quando o próximo tick vem de outro bundle", async () => {
    const f = await fixture();
    await f.first.testTick();
    assert.equal(f.sends(), 1);
    await f.second.testTick();
    assert.equal(f.sends(), 1);
    assert.deepEqual(f.errors, []);
});

test("build não inicia timers nem recupera itens da fila real", async () => {
    const f = await fixture({ build: true });
    f.first.iniciarWorkerFila();
    f.second.iniciarWorkerFila();
    assert.equal(f.calls(), 0);
    assert.equal(f.timers.size, 0);
});
