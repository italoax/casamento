import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { emailValido, prepararDestinatarios, validarAvisoFotos, FOTOS_EMAIL_DEFAULTS } from "../src/lib/email/fotos-mail.mjs";

test("destinatários inválidos e repetidos ficam fora do envio", () => {
    const data = prepararDestinatarios([
        { id: 1, nome: "Ana", email: " ANA@example.com " },
        { id: 2, nome: "Ana 2", email: "ana@example.com" },
        { id: 3, nome: "Sem e-mail", email: "" },
        { id: 4, nome: "Inválido", email: "a@example.com,b@example.com" },
    ]);
    assert.equal(data.destinatarios.length, 1);
    assert.equal(data.destinatarios[0].email, "ana@example.com");
    assert.equal(data.invalidos, 2);
    assert.equal(data.repetidos, 1);
    assert.equal(emailValido('"a@b.com'), false);
});

test("aviso exige assunto seguro, link HTTP e destinatários válidos", () => {
    assert.deepEqual(validarAvisoFotos({ ...FOTOS_EMAIL_DEFAULTS, ids: [1, "1", 2] }).ids, [1, 2]);
    for (const patch of [{ assunto: "Olá\r\nBcc: outro@example.com" }, { url: "javascript:alert(1)" }, { ids: [] }, { ids: [-1] }, { mensagem: "" }]) {
        assert.throws(() => validarAvisoFotos({ ...FOTOS_EMAIL_DEFAULTS, ids: [1], ...patch }));
    }
});

test("prévia personalizada escapa nome, assunto, mensagem e link sem enviar", async () => {
    let enviados = 0;
    const context = vm.createContext({});
    const values = {
        "./email": { sendEmail: () => { enviados++; } },
        "../env": { env: (name, fallback) => fallback },
        "../security": { SafeLog: { error() {} } },
    };
    const mod = new vm.SourceTextModule(readFileSync(new URL("../src/lib/email/site-emails.js", import.meta.url), "utf8"), { context });
    await mod.link(specifier => {
        const exports = values[specifier];
        return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
    });
    await mod.evaluate();
    const result = mod.namespace.montarAvisoFotos({ nome: '<img src=x onerror="alert(1)">', email: "teste@example.com", assunto: "Fotos <script>", mensagem: "Olá <script>\nSegunda linha", url: "https://example.com/?a=1&b=2" });
    assert.equal(enviados, 0);
    assert.equal(result.to, "teste@example.com");
    assert.match(result.html, /&lt;img/);
    assert.match(result.html, /&lt;script&gt;<br>Segunda linha/);
    assert.match(result.html, /a=1&amp;b=2/);
    assert.doesNotMatch(result.html, /<script>/);
});

async function workerFixture({ falhar = false, status = "pendente", lock = 1 } = {}) {
    const item = { id: 1, job_id: 1, nome: "Convidado", email: "teste@example.com", status };
    const job = { id: 1, status: "processando", assunto: "Fotos", mensagem: "Mensagem", url: "https://example.com", falhas_seguidas: 0 };
    let envios = 0;
    async function sql(query) {
        if (query.includes("GET_LOCK")) return [[{ adquirido: lock }]];
        if (query.includes("RELEASE_LOCK")) return [[{ released: 1 }]];
        if (query.startsWith("UPDATE email_fotos_fila SET status='incerto'")) { if (item.status === "enviando") item.status = "incerto"; return [{}]; }
        if (query.startsWith("SELECT * FROM email_fotos_jobs")) return [[job.status === "processando" ? job : null].filter(Boolean)];
        if (query.startsWith("SELECT * FROM email_fotos_fila")) return [[item.status === "pendente" ? item : null].filter(Boolean)];
        if (query.startsWith("UPDATE email_fotos_jobs SET status='concluido'")) { job.status = "concluido"; return [{}]; }
        if (query.startsWith("UPDATE email_fotos_fila SET status='enviando'")) { const claimed = item.status === "pendente"; if (claimed) item.status = "enviando"; return [{ affectedRows: claimed ? 1 : 0 }]; }
        if (query.startsWith("UPDATE email_fotos_fila SET status='enviado'")) { item.status = "enviado"; return [{}]; }
        if (query.startsWith("UPDATE email_fotos_fila SET status='falha'")) { item.status = "falha"; item.erro = params[0]; return [{}]; }
        if (query.startsWith("UPDATE email_fotos_jobs SET falhas_seguidas")) return [{}];
        throw new Error(`SQL inesperado no teste: ${query}`);
    }
    const connection = { query: sql, execute: sql, release() {} };
    const context = vm.createContext({ setTimeout: () => ({ unref() {} }), clearTimeout() {}, process: { env: {} } });
    const exports = {
        "@/lib/db": { db: () => ({ getConnection: async () => connection }), queryOne() {}, queryRows() {}, tableExists: async () => true },
        "@/lib/env": { env: () => "test" },
        "@/lib/security": { SafeLog: { error() {} } },
        "./email": { sendEmail: async () => { envios++; if (falhar) throw new Error("SMTP indisponível"); return { accepted: [item.email] }; } },
        "./site-emails": { montarAvisoFotos: data => ({ to: data.email, subject: data.assunto }) },
        "./fotos-mail.mjs": { prepararDestinatarios },
    };
    const source = readFileSync(new URL("../src/lib/email/fotos-queue.js", import.meta.url), "utf8");
    const mod = new vm.SourceTextModule(`${source}\nexport { tick as testTick };`, { context });
    await mod.link(specifier => {
        const values = exports[specifier];
        return new vm.SyntheticModule(Object.keys(values), function () { for (const [name, value] of Object.entries(values)) this.setExport(name, value); }, { context });
    });
    await mod.evaluate();
    return { tick: () => mod.namespace.testTick(), item, job, envios: () => envios };
}

test("fila envia individualmente uma vez e conclui sem repetir o envio", async () => {
    const fixture = await workerFixture();
    await fixture.tick();
    assert.equal(fixture.item.status, "enviado");
    await fixture.tick();
    assert.equal(fixture.envios(), 1);
    assert.equal(fixture.job.status, "concluido");
});

test("falhas e envios interrompidos não são reenviados automaticamente", async () => {
    const falha = await workerFixture({ falhar: true });
    await falha.tick(); await falha.tick();
    assert.equal(falha.item.status, "falha");
    assert.equal(falha.envios(), 1);
    const incerto = await workerFixture({ status: "enviando" });
    await incerto.tick();
    assert.equal(incerto.item.status, "incerto");
    assert.equal(incerto.envios(), 0);
});

test("worker concorrente sem lock não envia", async () => {
    const fixture = await workerFixture({ lock: 0 });
    await fixture.tick();
    assert.equal(fixture.envios(), 0);
    assert.equal(fixture.item.status, "pendente");
});
