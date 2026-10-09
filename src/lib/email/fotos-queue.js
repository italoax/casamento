import { db, queryOne, queryRows, tableExists } from "@/lib/db";
import { env } from "@/lib/env";
import { SafeLog } from "@/lib/security";
import { sendEmail } from "./email";
import { montarAvisoFotos } from "./site-emails";
import { prepararDestinatarios } from "./fotos-mail.mjs";

const estado = globalThis.__emailFotosWorker ||= { timer: null, iniciado: false, schema: null, ocupado: false };
async function garantirTabelas() {
    if (!estado.schema) estado.schema = (async () => {
        await db().execute(`CREATE TABLE IF NOT EXISTS email_fotos_jobs (
          id INT AUTO_INCREMENT PRIMARY KEY, request_id VARCHAR(36) NOT NULL UNIQUE,
          usuario_id INT NOT NULL, assunto VARCHAR(150) NOT NULL, mensagem TEXT NOT NULL,
          url VARCHAR(500) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'processando',
          falhas_seguidas INT NOT NULL DEFAULT 0, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
        await db().execute(`CREATE TABLE IF NOT EXISTS email_fotos_fila (
          id INT AUTO_INCREMENT PRIMARY KEY, job_id INT NOT NULL, convidado_id INT NOT NULL,
          nome VARCHAR(150) NOT NULL, email VARCHAR(150) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pendente', erro VARCHAR(255) NULL,
          atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY job_email (job_id, email), INDEX job_status (job_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    })().catch(error => { estado.schema = null; throw error; });
    return estado.schema;
}

export async function contatosFotos(ids) {
    const where = ids ? `WHERE id IN (${ids.map(() => "?").join(",")})` : "";
    return prepararDestinatarios(await queryRows(`SELECT id, nome, email FROM convidados ${where} ORDER BY nome, id`, ids || []));
}

export async function statusEmailsFotos() {
    await garantirTabelas();
    const jobs = await queryRows(`SELECT j.id, j.assunto, j.status, j.criado_em, COUNT(f.id) AS total,
      COALESCE(SUM(f.status='enviado'),0) AS enviados,
      COALESCE(SUM(f.status='falha'),0) AS falhas,
      COALESCE(SUM(f.status='incerto'),0) AS incertos,
      COALESCE(SUM(f.status='pendente'),0) AS pendentes
      FROM email_fotos_jobs j LEFT JOIN email_fotos_fila f ON f.job_id=j.id
      GROUP BY j.id ORDER BY j.id DESC LIMIT 5`);
    const itens = jobs[0] ? await queryRows("SELECT nome, email, status, erro FROM email_fotos_fila WHERE job_id=? ORDER BY id", [jobs[0].id]) : [];
    return { jobs, itens };
}

export async function criarEnvioFotos(dados, usuarioId, requestId) {
    if (!env("SMTP_HOST") || !env("SMTP_USER") || !env("SMTP_PASS")) throw new Error("Configure o SMTP do site antes de enviar e-mails.");
    await garantirTabelas();
    const { destinatarios } = await contatosFotos(dados.ids);
    if (!destinatarios.length) throw new Error("Nenhum convidado selecionado tem e-mail válido.");
    const connection = await db().getConnection();
    let locked = false;
    try {
        const [lock] = await connection.query("SELECT GET_LOCK('casamento-email-fotos-create', 5) AS adquirido");
        locked = Number(lock[0].adquirido) === 1;
        if (!locked) throw new Error("Há outro envio sendo preparado. Tente novamente.");
        await connection.beginTransaction();
        const [existentes] = await connection.execute("SELECT id FROM email_fotos_jobs WHERE request_id=?", [requestId]);
        if (existentes[0]) { await connection.commit(); acordar(); return existentes[0].id; }
        const [ativos] = await connection.query("SELECT id FROM email_fotos_jobs WHERE status IN ('processando','pausado') LIMIT 1");
        if (ativos.length) throw new Error("Conclua ou cancele o envio atual antes de criar outro.");
        const [job] = await connection.execute("INSERT INTO email_fotos_jobs (request_id, usuario_id, assunto, mensagem, url) VALUES (?, ?, ?, ?, ?)", [requestId, usuarioId, dados.assunto, dados.mensagem, dados.url]);
        for (const contato of destinatarios) await connection.execute("INSERT INTO email_fotos_fila (job_id, convidado_id, nome, email) VALUES (?, ?, ?, ?)", [job.insertId, contato.id, contato.nome.slice(0, 150), contato.email]);
        await connection.commit();
        acordar();
        return job.insertId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        if (locked) await connection.query("SELECT RELEASE_LOCK('casamento-email-fotos-create')").catch(() => {});
        connection.release();
    }
}

export async function controlarEnvioFotos(id, acao) {
    await garantirTabelas();
    if (acao === "cancelar") {
        await db().execute("UPDATE email_fotos_jobs SET status='cancelado' WHERE id=? AND status IN ('processando','pausado')", [id]);
        await db().execute("UPDATE email_fotos_fila SET status='cancelado' WHERE job_id=? AND status='pendente'", [id]);
    } else if (acao === "pausar" || acao === "retomar") {
        await db().execute("UPDATE email_fotos_jobs SET status=?, falhas_seguidas=0 WHERE id=? AND status=?", [acao === "pausar" ? "pausado" : "processando", id, acao === "pausar" ? "processando" : "pausado"]);
        if (acao === "retomar") acordar();
    }
}

function agendar(ms) {
    clearTimeout(estado.timer);
    estado.timer = setTimeout(tick, ms);
    estado.timer.unref?.();
}
function acordar() {
    estado.iniciado = true;
    if (!estado.ocupado) agendar(100);
}
export function iniciarWorkerEmailsFotos() {
    if (estado.iniciado || process.env.NEXT_PHASE === "phase-production-build") return;
    estado.iniciado = true;
    agendar(5000);
}
async function tick() {
    if (estado.ocupado) return;
    estado.ocupado = true;
    let intervalo = 60000;
    let connection, locked = false;
    try {
        // O startup não cria tabelas nem inicia disparos sem uma fila existente.
        if (!estado.schema && !(await tableExists("email_fotos_jobs"))) return;
        if (estado.schema) await estado.schema;
        connection = await db().getConnection();
        const [lock] = await connection.query("SELECT GET_LOCK('casamento-email-fotos-worker', 0) AS adquirido");
        locked = Number(lock[0].adquirido) === 1;
        if (!locked) return;
        // Um envio interrompido pode ter chegado: não o reenviamos automaticamente.
        await connection.query("UPDATE email_fotos_fila SET status='incerto', erro='Envio interrompido. Confira com o convidado antes de reenviar.' WHERE status='enviando' AND atualizado_em < DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
        const [jobs] = await connection.query("SELECT * FROM email_fotos_jobs WHERE status='processando' ORDER BY id LIMIT 1");
        const job = jobs[0];
        if (!job) return;
        intervalo = 3000;
        const [pendentes] = await connection.execute("SELECT * FROM email_fotos_fila WHERE job_id=? AND status='pendente' ORDER BY id LIMIT 1", [job.id]);
        const item = pendentes[0];
        if (!item) {
            await connection.execute("UPDATE email_fotos_jobs SET status='concluido' WHERE id=? AND status='processando' AND NOT EXISTS (SELECT id FROM email_fotos_fila WHERE job_id=? AND status IN ('pendente','enviando'))", [job.id, job.id]);
            return;
        }
        const [claim] = await connection.execute("UPDATE email_fotos_fila SET status='enviando' WHERE id=? AND status='pendente'", [item.id]);
        if (claim.affectedRows !== 1) return;
        try {
            const mail = montarAvisoFotos({ ...job, nome: item.nome, email: item.email });
            const result = await sendEmail({ ...mail, messageId: `<fotos-${job.id}-${item.id}@emanuelleitalo.com>` });
            if (!result.accepted?.length) throw new Error("Destinatário recusado pelo servidor de e-mail.");
            await connection.execute("UPDATE email_fotos_fila SET status='enviado', erro=NULL WHERE id=?", [item.id]);
            await connection.execute("UPDATE email_fotos_jobs SET falhas_seguidas=0 WHERE id=?", [job.id]);
        } catch (error) {
            SafeLog.error("Envio de aviso das fotos", error);
            const erroEndereco = error.responseCode === 553 || /sem acentos antes do @|SMTP_FROM|SMTP_USER precisa/.test(error.message || "");
            const mensagemErro = erroEndereco
                ? "Endereço incompatível com o servidor de e-mail. Confira SMTP_FROM e o e-mail do convidado antes de reenviar."
                : "Falha no envio; confira se chegou antes de reenviar.";
            await connection.execute("UPDATE email_fotos_fila SET status='falha', erro=? WHERE id=?", [mensagemErro, item.id]);
            await connection.execute("UPDATE email_fotos_jobs SET falhas_seguidas=falhas_seguidas+1, status=IF(falhas_seguidas>=5,'pausado',status) WHERE id=?", [job.id]);
        }
    } catch (error) { SafeLog.error("Fila de e-mail das fotos", error); }
    finally {
        if (connection) {
            if (locked) await connection.query("SELECT RELEASE_LOCK('casamento-email-fotos-worker')").catch(() => {});
            connection.release();
        }
        estado.ocupado = false;
        agendar(intervalo);
    }
}
