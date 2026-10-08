import { requirePainelPermission } from "@/lib/auth/painel-auth";
import { errorJson, json } from "@/lib/http";
import { Security, SafeLog } from "@/lib/security";
import { env } from "@/lib/env";
import { contatosFotos, criarEnvioFotos, controlarEnvioFotos, statusEmailsFotos } from "@/lib/email/fotos-queue";
import { FOTOS_EMAIL_DEFAULTS, validarAvisoFotos } from "@/lib/email/fotos-mail.mjs";
import { montarAvisoFotos } from "@/lib/email/site-emails";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function GET(request) {
    if (!(await requirePainelPermission("manage_rsvp"))) return errorJson("Acesso negado.", 403);
    try {
        if (new URL(request.url).searchParams.get("status") === "1") return json({ sucesso: true, ...(await statusEmailsFotos()) }, { headers });
        return json({ sucesso: true, ...(await contatosFotos()), ...(await statusEmailsFotos()), defaults: FOTOS_EMAIL_DEFAULTS,
            smtpConfigurado: Boolean(env("SMTP_HOST") && env("SMTP_USER") && env("SMTP_PASS")),
        }, { headers });
    } catch (error) {
        SafeLog.error("Consultar e-mail das fotos", error);
        return errorJson("Não foi possível carregar os convidados e envios.", 500, { headers });
    }
}
export async function POST(request) {
    const session = await requirePainelPermission("manage_rsvp");
    if (!session) return errorJson("Acesso negado.", 403);
    if (!Security.isAllowedOrigin(request.headers.get("origin"), request.url)) return errorJson("Origem não permitida.", 403);
    const body = await request.json().catch(() => ({}));
    try {
        if (["pausar", "retomar", "cancelar"].includes(body.acao)) {
            if (!Number.isSafeInteger(body.jobId) || body.jobId < 1) throw new Error("Envio inválido.");
            await controlarEnvioFotos(body.jobId, body.acao);
            return json({ sucesso: true }, { headers });
        }
        const dados = validarAvisoFotos(body);
        if (body.acao === "preview") {
            const { destinatarios } = await contatosFotos(dados.ids);
            if (!destinatarios.length) throw new Error("Selecione convidados com e-mail válido.");
            return json({ sucesso: true, total: destinatarios.length, destinatarios,
                html: montarAvisoFotos({ ...dados, ...destinatarios[0] }).html,
            }, { headers });
        }
        if (body.acao !== "enviar" || !/^[a-f0-9-]{36}$/i.test(body.requestId || "")) throw new Error("Solicitação de envio inválida.");
        const jobId = await criarEnvioFotos(dados, session.id, body.requestId);
        return json({ sucesso: true, jobId }, { headers });
    } catch (error) {
        SafeLog.error("Preparar e-mail das fotos", error);
        return errorJson(error.message || "Não foi possível preparar o envio.", 400, { headers });
    }
}
