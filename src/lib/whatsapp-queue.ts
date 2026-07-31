/**
 * FILA DE DISPARO DE WHATSAPP (servidor)
 *
 * Move o disparo em massa do navegador para uma fila no servidor, processada por
 * um worker em segundo plano (iniciado por instrumentation.ts). Vantagens:
 *  - sobrevive ao fechamento da aba e a reinícios do processo (estado no MySQL);
 *  - entrega "no máximo uma vez": nunca reenvia uma mensagem de entrega incerta
 *    (evita DUPLICADO). Falhas viram "falha" para reenvio manual, não automático;
 *  - retomável: continua dos itens ainda "pendente"; itens "enviando" órfãos (de
 *    um restart no meio do envio) viram "falha" (não reenviados).
 *
 * Um job ativo por vez (a sessão de WhatsApp é única).
 */

import { execute, queryOne, queryRows } from "@/lib/db";
import { SafeLog } from "@/lib/security";
import { aplicarVariaveis } from "@/app/painel/utils/whatsapp-helpers";
import { convitePublicUrl, enviarDocumento, enviarTexto, obterStatus, type WhatsappSlot } from "@/lib/whatsapp";
import { obterModelo } from "@/lib/whatsapp-config";
import { registrarEnvio } from "@/lib/whatsapp-log";

export type JobStatus = "processando" | "pausado" | "concluido" | "cancelado";
export type ItemStatus = "pendente" | "enviando" | "enviado" | "falha" | "sem_whatsapp" | "cancelado";

export type FilaJob = {
  id: number;
  criado_em: string;
  atualizado_em: string;
  status: JobStatus;
  slot: string;
  modelo_id: number | null;
  mensagem: string;
  anexar_pdf: number;
  intervalo: number;
  total: number;
  enviados: number;
  falhas: number;
  ultimo_envio_em: string | null;
  motivo_pausa: string | null;
};

export type FilaItem = {
  id: number;
  job_id: number;
  convidado_id: number | null;
  nome: string;
  telefone: string;
  lista: string | null;
  status: ItemStatus;
  tentativas: number;
  erro: string | null;
  message_id: string | null;
  atualizado_em: string;
};

export type Destinatario = { id?: number | null; nome: string; telefone: string; lista?: string | null };

const MAX_FALHAS_SEGUIDAS = 5;
const TICK_OCIOSO_MS = 5000;
// Quando NÃO há disparo ativo, o worker checa o banco bem devagar (economia de
// CPU/conexões em hospedagem compartilhada). Não atrasa envios: criar/retomar um
// disparo chama acordarWorker(), que acorda o loop na hora (50ms).
const TICK_SEM_JOB_MS = 60000;
const JITTER_MAX_MS = 2500;
// Reconexão automática do Baileys: aguarda até este tempo antes de pausar de vez.
const MAX_ESPERA_RECONEXAO_MS = 90000;
// Estados que NÃO se resolvem sozinhos (precisam de ação do usuário) → pausa já.
const STATUS_TERMINAIS = new Set(["desconectado", "erro", "qr", "loggedout"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResultHeader = { insertId?: number; affectedRows?: number };
async function exec(sql: string, params: unknown[] = []): Promise<ResultHeader> {
  const res = (await execute(sql, params)) as unknown as [ResultHeader];
  return res[0] || {};
}

let tabelasGarantidas = false;
async function ensureTabelas() {
  if (tabelasGarantidas) return;
  await exec(`CREATE TABLE IF NOT EXISTS whatsapp_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status ENUM('processando','pausado','concluido','cancelado') NOT NULL DEFAULT 'processando',
    slot VARCHAR(8) NOT NULL,
    modelo_id INT NULL,
    mensagem TEXT NOT NULL,
    anexar_pdf TINYINT(1) NOT NULL DEFAULT 0,
    intervalo INT NOT NULL DEFAULT 8,
    total INT NOT NULL DEFAULT 0,
    enviados INT NOT NULL DEFAULT 0,
    falhas INT NOT NULL DEFAULT 0,
    ultimo_envio_em TIMESTAMP NULL,
    motivo_pausa VARCHAR(255) NULL,
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await exec(`CREATE TABLE IF NOT EXISTS whatsapp_fila (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    convidado_id INT NULL,
    nome VARCHAR(120) NOT NULL,
    telefone VARCHAR(30) NOT NULL,
    lista VARCHAR(40) NULL,
    status ENUM('pendente','enviando','enviado','falha','sem_whatsapp','cancelado') NOT NULL DEFAULT 'pendente',
    tentativas INT NOT NULL DEFAULT 0,
    erro VARCHAR(255) NULL,
    message_id VARCHAR(64) NULL,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_job_status (job_id, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  tabelasGarantidas = true;
}

/** O job que está em andamento ou pausado (bloqueia criar outro). */
export async function obterJobAtivo(): Promise<FilaJob | null> {
  await ensureTabelas();
  return queryOne<FilaJob>(
    "SELECT * FROM whatsapp_jobs WHERE status IN ('processando','pausado') ORDER BY id DESC LIMIT 1",
  );
}

/** Status do job mais recente + itens já processados (para o painel acompanhar). */
export async function statusJobAtual(): Promise<{ job: FilaJob | null; itens: FilaItem[] }> {
  await ensureTabelas();
  const job = await queryOne<FilaJob>("SELECT * FROM whatsapp_jobs ORDER BY id DESC LIMIT 1");
  if (!job) return { job: null, itens: [] };
  // Deriva os contadores dos próprios itens (sempre verdadeiro, mesmo se a coluna
  // do job ficar defasada por uma corrida). O painel mostra esses valores.
  const counts = await queryOne<{ enviados: number; falhas: number }>(
    "SELECT COALESCE(SUM(status='enviado'),0) AS enviados, COALESCE(SUM(status IN ('falha','sem_whatsapp')),0) AS falhas FROM whatsapp_fila WHERE job_id=?",
    [job.id],
  );
  job.enviados = Number(counts?.enviados || 0);
  job.falhas = Number(counts?.falhas || 0);
  const itens = await queryRows<FilaItem>(
    `SELECT id, job_id, convidado_id, nome, telefone, lista, status, tentativas, erro, message_id, atualizado_em
     FROM whatsapp_fila WHERE job_id = ? AND status IN ('enviado','falha','sem_whatsapp')
     ORDER BY atualizado_em DESC, id DESC LIMIT 300`,
    [job.id],
  );
  return { job, itens };
}

/** Cria um novo job de disparo (recusa se já houver um ativo). */
export async function enfileirarJob(params: {
  slot: WhatsappSlot;
  modeloId?: number | null;
  mensagem: string;
  anexarPdf?: boolean;
  intervalo?: number;
  destinatarios: Destinatario[];
}): Promise<{ jobId: number }> {
  await ensureTabelas();
  const ativo = await obterJobAtivo();
  if (ativo) throw new Error("Já existe um disparo em andamento. Aguarde terminar ou cancele-o antes de iniciar outro.");

  const dests = (params.destinatarios || []).filter((d) => d && String(d.telefone || "").trim());
  if (dests.length === 0) throw new Error("Nenhum destinatário válido para enviar.");
  const mensagem = String(params.mensagem || "").trim();
  if (!mensagem) throw new Error("Mensagem vazia.");
  const intervalo = Math.max(0, Math.min(120, Number(params.intervalo) || 0));

  const ins = await exec(
    `INSERT INTO whatsapp_jobs (status, slot, modelo_id, mensagem, anexar_pdf, intervalo, total)
     VALUES ('processando', ?, ?, ?, ?, ?, ?)`,
    [params.slot, params.modeloId || null, mensagem.slice(0, 8000), params.anexarPdf ? 1 : 0, intervalo, dests.length],
  );
  const jobId = Number(ins.insertId);

  const placeholders = dests.map(() => "(?,?,?,?,?)").join(",");
  const flat: unknown[] = [];
  for (const d of dests) {
    flat.push(
      jobId,
      d.id || null,
      String(d.nome || "").slice(0, 120),
      String(d.telefone || "").slice(0, 30),
      d.lista ? String(d.lista).slice(0, 40) : null,
    );
  }
  await exec(
    `INSERT INTO whatsapp_fila (job_id, convidado_id, nome, telefone, lista) VALUES ${placeholders}`,
    flat,
  );

  acordarWorker();
  return { jobId };
}

/** Pausa / retoma / cancela um job. */
export async function acaoJob(jobId: number, acao: "pausar" | "retomar" | "cancelar"): Promise<void> {
  await ensureTabelas();
  if (acao === "pausar") {
    await exec(
      "UPDATE whatsapp_jobs SET status='pausado', motivo_pausa='Pausado manualmente' WHERE id=? AND status='processando'",
      [jobId],
    );
  } else if (acao === "retomar") {
    await exec(
      "UPDATE whatsapp_jobs SET status='processando', motivo_pausa=NULL WHERE id=? AND status='pausado'",
      [jobId],
    );
    acordarWorker();
  } else if (acao === "cancelar") {
    await exec("UPDATE whatsapp_jobs SET status='cancelado' WHERE id=? AND status IN ('processando','pausado')", [jobId]);
    await exec("UPDATE whatsapp_fila SET status='cancelado' WHERE job_id=? AND status IN ('pendente','enviando')", [jobId]);
  }
}

async function pausarJob(jobId: number, motivo: string) {
  await exec("UPDATE whatsapp_jobs SET status='pausado', motivo_pausa=? WHERE id=? AND status='processando'", [
    motivo.slice(0, 255),
    jobId,
  ]);
}

// ─────────────────────────── Worker ───────────────────────────

let timer: ReturnType<typeof setTimeout> | null = null;
let proximoEnvioMs = 0; // não enviar antes deste instante (intervalo + jitter)
let falhasSeguidas = 0;
let aguardandoConexaoDesde = 0; // quando começou a esperar uma reconexão (0 = não espera)

function jitter() {
  return Math.floor(Math.random() * JITTER_MAX_MS);
}

function agendar(ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void tick(), Math.max(0, ms));
}

function acordarWorker() {
  agendar(50);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Lê a conexão do WhatsApp (com até 3 tentativas p/ soluço da API). Retorna se
 * está conectado e o status textual (conectado/reconectando/desconectado/erro/qr).
 * Basta UMA leitura "conectado" para considerar conectado.
 */
async function lerConexao(slot: WhatsappSlot): Promise<{ connected: boolean; status: string }> {
  let ultimo = { connected: false, status: "sem_resposta_api" };
  for (let i = 0; i < 3; i++) {
    try {
      const st = await obterStatus(slot);
      if (st.connected) return { connected: true, status: String(st.status || "conectado") };
      ultimo = { connected: false, status: String(st.status || "desconhecido") };
    } catch {
      ultimo = { connected: false, status: "sem_resposta_api" };
    }
    if (i < 2) await sleep(1500);
  }
  return ultimo;
}

/** Inicia o worker (idempotente por processo). Chamado por instrumentation.ts. */
export function iniciarWorkerFila() {
  const g = globalThis as typeof globalThis & { __waQueueWorker?: boolean };
  if (g.__waQueueWorker) return;
  g.__waQueueWorker = true;
  // Recupera itens órfãos (travados em "enviando" por um restart) e começa.
  void recuperarItensOrfaos().finally(() => agendar(1500));
}

async function recuperarItensOrfaos() {
  try {
    await ensureTabelas();
    // Itens travados em "enviando" (o processo reiniciou no meio de um envio):
    // NÃO reenviar — podem já ter sido entregues. Reenviar geraria DUPLICADO.
    // Marca como falha p/ revisão manual; o usuário reenvia só os que não chegaram.
    await exec(
      "UPDATE whatsapp_fila SET status='falha', erro=? WHERE status='enviando'",
      ["Interrompido durante o envio, verifique se chegou (não reenviado para evitar duplicado)."],
    );
  } catch (error) {
    SafeLog.error("whatsapp-queue recuperarItensOrfaos", error);
  }
}

async function tick() {
  let proximo = TICK_OCIOSO_MS;
  try {
    proximo = await processar();
  } catch (error) {
    SafeLog.error("whatsapp-queue tick", error);
    proximo = TICK_OCIOSO_MS;
  }
  agendar(proximo);
}

/** Processa um passo. Retorna em quantos ms reavaliar. */
async function processar(): Promise<number> {
  await ensureTabelas();
  const job = await queryOne<FilaJob>("SELECT * FROM whatsapp_jobs WHERE status='processando' ORDER BY id ASC LIMIT 1");
  if (!job) return TICK_SEM_JOB_MS;

  const pend = await queryOne<{ id: number }>(
    "SELECT id FROM whatsapp_fila WHERE job_id=? AND status='pendente' ORDER BY id ASC LIMIT 1",
    [job.id],
  );
  if (!pend) {
    // Só conclui quando NÃO há item sendo enviado e todos os itens já foram
    // inseridos (itens >= total). Evita concluir cedo demais por corrida com o
    // enfileiramento (job criado mas itens ainda sendo inseridos).
    const resumo = await queryOne<{ itens: number; enviando: number }>(
      "SELECT COUNT(*) AS itens, COALESCE(SUM(status='enviando'),0) AS enviando FROM whatsapp_fila WHERE job_id=?",
      [job.id],
    );
    const itens = Number(resumo?.itens || 0);
    const enviando = Number(resumo?.enviando || 0);
    if (enviando === 0 && itens >= job.total) {
      await exec("UPDATE whatsapp_jobs SET status='concluido' WHERE id=? AND status='processando'", [job.id]);
    }
    return TICK_OCIOSO_MS;
  }

  // Conexão do WhatsApp. O Baileys cai e RECONECTA sozinho com frequência (anti-
  // spam / quedas 515/428). Nesse caso o status fica "reconectando" por alguns
  // segundos. Em vez de PAUSAR (que exigiria Retomar manual e antes gerava
  // reenvio), a fila ESPERA a reconexão automática e continua sozinha. Só pausa
  // de verdade se o estado for terminal (precisa re-parear) ou se a reconexão
  // demorar demais.
  const conexao = await lerConexao(job.slot as WhatsappSlot);
  if (conexao.connected) {
    aguardandoConexaoDesde = 0;
  } else {
    const terminal = STATUS_TERMINAIS.has(conexao.status.toLowerCase());
    if (!aguardandoConexaoDesde) aguardandoConexaoDesde = Date.now();
    const esperandoMs = Date.now() - aguardandoConexaoDesde;
    if (!terminal && esperandoMs < MAX_ESPERA_RECONEXAO_MS) {
      // Reconexão em andamento: aguarda e tenta de novo (NÃO reenvia nada).
      return 4000;
    }
    aguardandoConexaoDesde = 0;
    await pausarJob(job.id, "WhatsApp desconectado. Reconecte o aparelho e clique em Retomar.");
    return TICK_OCIOSO_MS;
  }

  // Respeita o intervalo entre envios.
  const agora = Date.now();
  if (proximoEnvioMs > agora) return Math.min(proximoEnvioMs - agora, 5000);

  // Reivindica o item de forma atômica (protege contra concorrência).
  const claim = await exec("UPDATE whatsapp_fila SET status='enviando' WHERE id=? AND status='pendente'", [pend.id]);
  if (claim.affectedRows !== 1) return 200;
  const item = await queryOne<FilaItem>("SELECT * FROM whatsapp_fila WHERE id=?", [pend.id]);
  if (!item) return 200;

  await enviarItem(job, item);
  proximoEnvioMs = Date.now() + (job.intervalo > 0 ? job.intervalo * 1000 + jitter() : 0);
  return 200;
}

async function enviarItem(job: FilaJob, item: FilaItem) {
  const mensagem = aplicarVariaveis(job.mensagem, item.nome);
  const comPdf = Boolean(job.anexar_pdf && job.modelo_id);
  try {
    let messageId = "";
    let anexouPdf = false;
    if (comPdf && job.modelo_id) {
      const modelo = await obterModelo(job.modelo_id);
      if (modelo?.pdf) {
        const pdfUrl = `${convitePublicUrl()}?modelo=${job.modelo_id}`;
        const r = await enviarDocumento(job.slot as WhatsappSlot, item.telefone, pdfUrl, mensagem);
        messageId = r.messageId;
        anexouPdf = true;
      } else {
        const r = await enviarTexto(job.slot as WhatsappSlot, item.telefone, mensagem);
        messageId = r.messageId;
      }
    } else {
      const r = await enviarTexto(job.slot as WhatsappSlot, item.telefone, mensagem);
      messageId = r.messageId;
    }
    await exec("UPDATE whatsapp_fila SET status='enviado', message_id=?, erro=NULL WHERE id=?", [
      String(messageId || "").slice(0, 64),
      item.id,
    ]);
    await exec("UPDATE whatsapp_jobs SET enviados=enviados+1, ultimo_envio_em=NOW() WHERE id=?", [job.id]);
    await registrarEnvio({
      convidadoId: item.convidado_id,
      nome: item.nome,
      telefone: item.telefone,
      lista: item.lista,
      sucesso: true,
      anexouPdf,
    });
    falhasSeguidas = 0;
  } catch (error) {
    const msg = (error as Error)?.message || "Falha ao enviar.";
    if (/sem whatsapp/i.test(msg)) {
      // Número não existe no WhatsApp: marca e segue (não adianta repetir).
      await exec("UPDATE whatsapp_fila SET status='sem_whatsapp', erro=? WHERE id=?", [msg.slice(0, 255), item.id]);
      await exec("UPDATE whatsapp_jobs SET falhas=falhas+1 WHERE id=?", [job.id]);
      await registrarEnvio({
        convidadoId: item.convidado_id, nome: item.nome, telefone: item.telefone, lista: item.lista, sucesso: false, erro: msg,
      });
      falhasSeguidas = 0;
      return;
    }
    // IMPORTANTE: NÃO reenviar automaticamente. O erro pode ter ocorrido DEPOIS
    // da entrega (ex.: a conexão caiu logo após o envio), então um retry geraria
    // mensagem DUPLICADA. Marca como falha (entrega incerta) e segue; o usuário
    // reenvia manualmente só para quem realmente não recebeu.
    const tentativas = item.tentativas + 1;
    const erroIncerto = `${msg} (não reenviado p/ evitar duplicado, confira se chegou)`;
    await exec("UPDATE whatsapp_fila SET status='falha', tentativas=?, erro=? WHERE id=?", [
      tentativas, erroIncerto.slice(0, 255), item.id,
    ]);
    await exec("UPDATE whatsapp_jobs SET falhas=falhas+1 WHERE id=?", [job.id]);
    await registrarEnvio({
      convidadoId: item.convidado_id, nome: item.nome, telefone: item.telefone, lista: item.lista, sucesso: false, erro: msg,
    });
    falhasSeguidas++;
    if (falhasSeguidas >= MAX_FALHAS_SEGUIDAS) {
      await pausarJob(job.id, "Muitas falhas seguidas. Verifique a conexão do WhatsApp e clique em Retomar.");
      falhasSeguidas = 0;
    }
  }
}
