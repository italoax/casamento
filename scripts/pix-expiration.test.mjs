import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createPixExpirationScheduler } from "../src/lib/payment/pix-expiration-scheduler.mjs";

function fixture(initial = []) {
    let now = 0, reads = 0, expired = 0;
    let rows = [...initial];
    const timers = new Map();
    const errors = [];
    const worker = createPixExpirationScheduler({
        async readNextDelay() {
            reads++;
            return rows.length ? Math.min(...rows) - now : null;
        },
        async expire() { expired++; rows = rows.filter(expiration => expiration > now); },
        onError: error => errors.push(error),
        setTimer(callback, delay) {
            const timer = { unref() { timer.unreferenced = true; } };
            timers.set(timer, { callback, delay });
            return timer;
        },
        clearTimer: timer => timers.delete(timer),
    });
    return {
        worker, timers, errors, reads: () => reads, expired: () => expired,
        replace: values => { rows = values; },
        async advance(ms) {
            now += ms;
            for (const [timer, task] of [...timers]) {
                timers.delete(timer);
                task.callback();
            }
            await worker.refresh();
        },
    };
}

test("sem Pix, consulta uma vez no boot e fica sem timer ou consultas periódicas", async () => {
    const f = fixture();
    await f.worker.start();
    await f.worker.start();
    assert.equal(f.reads(), 1);
    assert.equal(f.timers.size, 0);
    assert.equal(f.expired(), 0);
});

test("novo Pix acorda o agendamento ocioso; vence somente no prazo e depois para", async () => {
    const f = fixture();
    await f.worker.start();
    f.replace([1800000]);
    await f.worker.refresh();
    assert.equal(f.timers.size, 1);
    assert.equal([...f.timers.values()][0].delay, 1800000);
    assert.equal([...f.timers.keys()][0].unreferenced, true);
    assert.equal(f.expired(), 0);
    await f.advance(1800000);
    assert.equal(f.expired(), 1);
    assert.equal(f.timers.size, 0);
});

test("reagenda para o menor vencimento e cancela o timer quando o último Pix é pago", async () => {
    const f = fixture([1800000]);
    await f.worker.start();
    f.replace([1800000, 300000]);
    await f.worker.refresh();
    assert.equal(f.timers.size, 1);
    assert.equal([...f.timers.values()][0].delay, 300000);
    f.replace([]);
    await f.worker.refresh();
    assert.equal(f.timers.size, 0);
    assert.equal(f.expired(), 0);
});

test("reinício recupera Pix vencido e mantém somente o próximo vencimento futuro", async () => {
    const f = fixture([-60000, 300000]);
    await f.worker.start();
    assert.equal(f.expired(), 1);
    assert.equal(f.timers.size, 1);
    assert.equal([...f.timers.values()][0].delay, 300000);
});

test("uma atualização durante a consulta não é perdida e não cria execução paralela", async () => {
    let resolveRead;
    let reads = 0, active = 0, maximum = 0;
    const timers = new Map();
    const worker = createPixExpirationScheduler({
        async readNextDelay() {
            reads++; active++; maximum = Math.max(maximum, active);
            const value = reads === 1 ? await new Promise(resolve => { resolveRead = resolve; }) : 20000;
            active--;
            return value;
        },
        expire: () => assert.fail("não há Pix vencido"),
        onError: error => { throw error; },
        setTimer(callback, delay) { const timer = {}; timers.set(timer, { callback, delay }); return timer; },
        clearTimer: timer => timers.delete(timer),
    });
    const starting = worker.start();
    await Promise.resolve();
    const updating = worker.refresh();
    resolveRead(null);
    await Promise.all([starting, updating]);
    assert.equal(reads, 2);
    assert.equal(maximum, 1);
    assert.equal(timers.size, 1);
    assert.equal([...timers.values()][0].delay, 20000);
});

test("lote sem progresso não dispara em loop e falhas de banco têm tentativas limitadas", async () => {
    const timers = new Map();
    let broken = false;
    let errors = 0;
    const worker = createPixExpirationScheduler({
        async readNextDelay() { if (broken) throw new Error("DB indisponível"); return 0; },
        async expire() {},
        onError() { errors++; },
        setTimer(callback, delay) { const timer = {}; timers.set(timer, { callback, delay }); return timer; },
        clearTimer: timer => timers.delete(timer),
    });
    await worker.start();
    assert.equal([...timers.values()][0].delay, 60000);
    broken = true;
    for (let attempt = 0; attempt < 4; attempt++) await worker.refresh();
    assert.equal(errors, 4);
    assert.equal(timers.size, 0);
});

async function adapterFixture({ delay = null, build = false, missingTable = false } = {}) {
    const timers = new Map();
    const events = [];
    const queries = [];
    const context = vm.createContext({ process: { env: { NEXT_PHASE: build ? "phase-production-build" : "" } } });
    const options = {
        setTimer(callback, ms) { const timer = { unref() {} }; timers.set(timer, { callback, ms }); return timer; },
        clearTimer: timer => timers.delete(timer),
    };
    const values = {
        "../db": { async queryOne(sql) {
            queries.push(sql);
            if (missingTable) throw Object.assign(new Error("sem tabela"), { code: "ER_NO_SUCH_TABLE" });
            return { delay_ms: delay };
        } },
        "../security": { SafeLog: { error: error => events.push(error) } },
        "./payment-sales": { async pendingExpiredPixPaymentIds() { events.push("vencidos"); return ["pay_test"]; } },
        "./payment-stock": { async releaseExpiredReservations() { events.push("estoque"); delay = null; } },
        "./asaas": { async deleteAsaasPayment(id) { events.push(`cancelar:${id}`); return true; } },
        "./pix-expiration-scheduler.mjs": { createPixExpirationScheduler: deps => createPixExpirationScheduler({ ...deps, ...options }) },
    };
    const mod = new vm.SourceTextModule(readFileSync(new URL("../src/lib/payment/pix-expiration.js", import.meta.url), "utf8"), { context });
    await mod.link(specifier => new vm.SyntheticModule(Object.keys(values[specifier]), function () {
        for (const [key, value] of Object.entries(values[specifier])) this.setExport(key, value);
    }, { context }));
    await mod.evaluate();
    return { mod: mod.namespace, timers, events, queries };
}

test("integração usa prazo em UTC, ignora cartão e estados finais e não cria tabelas no boot", async () => {
    const f = await adapterFixture();
    await f.mod.iniciarExpiracaoPix();
    assert.equal(f.queries.length, 1);
    assert.match(f.queries[0], /UTC_TIMESTAMP\(6\)/);
    assert.match(f.queries[0], /status IN \('pending', 'in_process'\)/);
    assert.match(f.queries[0], /payment_method = 'pix'/);
    assert.equal(f.timers.size, 0);
    assert.deepEqual(f.events, []);
    const empty = await adapterFixture({ missingTable: true });
    await empty.mod.iniciarExpiracaoPix();
    assert.deepEqual(empty.events, []);
    assert.equal(empty.timers.size, 0);
});

test("integração expira cobranças antes de liberar estoque e não toca no banco durante build", async () => {
    const overdue = await adapterFixture({ delay: -1 });
    await overdue.mod.iniciarExpiracaoPix();
    assert.deepEqual(overdue.events, ["vencidos", "cancelar:pay_test", "estoque"]);
    assert.equal(overdue.timers.size, 0);
    const build = await adapterFixture({ delay: -1, build: true });
    await build.mod.iniciarExpiracaoPix();
    await build.mod.atualizarAgendamentoPix();
    assert.equal(build.queries.length, 0);
    assert.deepEqual(build.events, []);
});

async function salesFixture({ failInsert = false, paymentMethod = "pix" } = {}) {
    const events = [];
    const context = vm.createContext({});
    const values = {
        "node:crypto": { randomBytes() {} },
        "../db": {
            db: () => ({ async execute(sql) {
                if (sql.startsWith("INSERT INTO vendas")) {
                    if (failInsert) throw new Error("INSERT falhou");
                    events.push("salva");
                }
            } }),
            async queryOne() { return { id: 1, payment_method: paymentMethod, status: "pending" }; },
            queryRows() {},
        },
        "../auth/encryption": { encryptCPF() {}, encryptEmail() {}, encryptPhone() {}, decryptEmail() {} },
        "./payment-utils": { normalizeStatus: value => value === "RECEIVED" ? "approved" : "pending" },
        "./payment-stock": { async settleStockForPayment() { events.push("liquida"); } },
        "../email/site-emails": { enviarPixExpirado() {} },
        "./pix-expiration": { atualizarAgendamentoPix() { events.push("reagenda"); } },
    };
    const mod = new vm.SourceTextModule(readFileSync(new URL("../src/lib/payment/payment-sales.js", import.meta.url), "utf8"), { context });
    await mod.link(specifier => new vm.SyntheticModule(Object.keys(values[specifier]), function () {
        for (const [key, value] of Object.entries(values[specifier])) this.setExport(key, value);
    }, { context }));
    await mod.evaluate();
    return { mod: mod.namespace, events };
}

test("checkout agenda somente depois de salvar um Pix e cartão não acorda a rotina", async () => {
    const pix = await salesFixture();
    await pix.mod.insertSale({ paymentMethod: "pix" });
    assert.deepEqual(pix.events, ["salva", "reagenda"]);
    const card = await salesFixture();
    await card.mod.insertSale({ paymentMethod: "cartao" });
    assert.deepEqual(card.events, ["salva"]);
    const failure = await salesFixture({ failInsert: true });
    await assert.rejects(failure.mod.insertSale({ paymentMethod: "pix" }), /INSERT falhou/);
    assert.deepEqual(failure.events, []);
});

test("confirmação de Pix liquida estoque antes de atualizar o timer; cartão não altera o timer", async () => {
    const pix = await salesFixture();
    await pix.mod.updateSaleStatusByPayment("pay_test", "RECEIVED", "RECEIVED");
    assert.deepEqual(pix.events, ["liquida", "reagenda"]);
    const card = await salesFixture({ paymentMethod: "cartao" });
    await card.mod.updateSaleStatusByPayment("pay_test", "RECEIVED", "RECEIVED");
    assert.deepEqual(card.events, ["liquida"]);
});
