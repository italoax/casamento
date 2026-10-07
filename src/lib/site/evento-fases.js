import { db, queryRows, tableExists } from "../db";

const MODOS = new Set(["contagem", "acontecendo", "agradecimento", "encerrado"]);
export const EVENTO_DEFAULTS = {
    modo: "contagem",
    acontecendoTitulo: "É hoje!",
    acontecendoMensagem: "Estamos celebrando neste momento. Obrigado por fazer parte deste dia com a gente.",
    agradecimentoTitulo: "Obrigado por celebrar conosco",
    agradecimentoMensagem: "Cada abraço, cada sorriso e cada presença tornaram esse dia inesquecível. Muito obrigado!",
};
const CHAVES = {
    modo: "evento_modo",
    acontecendoTitulo: "evento_acontecendo_titulo",
    acontecendoMensagem: "evento_acontecendo_mensagem",
    agradecimentoTitulo: "evento_agradecimento_titulo",
    agradecimentoMensagem: "evento_agradecimento_mensagem",
};

export function calcularFase(config) {
    return MODOS.has(config.modo) ? config.modo : EVENTO_DEFAULTS.modo;
}

export async function getEventoConfig() {
    const config = { ...EVENTO_DEFAULTS };
    if (!(await tableExists("rsvp_config").catch(() => false))) return config;
    const chaves = Object.values(CHAVES);
    const marcadores = chaves.map(() => "?").join(", ");
    const linhas = await queryRows(`SELECT chave, valor FROM rsvp_config WHERE chave IN (${marcadores})`, chaves).catch(() => []);
    const porChave = new Map(linhas.map((l) => [String(l.chave), String(l.valor ?? "")]));
    for (const [campo, chave] of Object.entries(CHAVES)) {
        const valor = porChave.get(chave);
        if (!valor) continue;
        if (campo === "modo") {
            if (MODOS.has(valor)) config.modo = valor;
        } else {
            config[campo] = valor;
        }
    }
    return config;
}

export async function setEventoConfig(parcial) {
    await db().execute(`CREATE TABLE IF NOT EXISTS rsvp_config (
        chave VARCHAR(120) NOT NULL PRIMARY KEY,
        valor TEXT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    for (const [campo, chave] of Object.entries(CHAVES)) {
        if (parcial[campo] === undefined) continue;
        await db().execute("INSERT INTO rsvp_config (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)", [chave, String(parcial[campo])]);
    }
    return getEventoConfig();
}

export function validarEventoConfig(body) {
    const dados = {};
    const erros = [];
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { dados, erros: ["Dados inválidos."] };
    }
    if (body.modo !== undefined) {
        const modo = String(body.modo);
        if (!MODOS.has(modo)) erros.push("Fase inválida.");
        else dados.modo = modo;
    }
    for (const campo of ["acontecendoTitulo", "acontecendoMensagem", "agradecimentoTitulo", "agradecimentoMensagem"]) {
        if (body[campo] === undefined) continue;
        const valor = String(body[campo]).trim().slice(0, campo.endsWith("Titulo") ? 120 : 600);
        if (!valor) erros.push("Os textos não podem ficar vazios.");
        else dados[campo] = valor;
    }
    return { dados, erros };
}
