import { sendEmail } from "./email";
import { env } from "./env";
import { SafeLog } from "./security";

/* ---------------------------------------------------------------------------
 * Paleta e helpers de e-mail — alinhados à identidade do site
 * (champagne/dourado + marrom café + bege marfim, tipografia serifada).
 * Usa apenas estilos inline e tabelas para máxima compatibilidade com clientes
 * de e-mail (Gmail, Outlook, Apple Mail).
 * ------------------------------------------------------------------------- */
const COR = {
  marrom: "#544b45",
  marromSuave: "#6c625b",
  dourado: "#c2a878",
  douradoEsc: "#a8895a",
  textoClaro: "#a99f95",
  fundo: "#f7f4ef",
  creme: "#faf7f0",
  borda: "#e9dcc2",
  bordaClara: "#efe7d8",
};
const FONTE_SERIFA = "Georgia, 'Times New Roman', serif";
const FONTE_SANS = "Arial, Helvetica, sans-serif";

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value: unknown) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function siteUrl() {
  return env("BASE_URL", "https://emanuelleitalo.com").replace(/\/$/, "");
}

/** Casca do e-mail: cabeçalho com a marca dos noivos, corpo e rodapé. */
function emailShell(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${COR.fundo};font-family:${FONTE_SANS};color:${COR.marromSuave};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COR.fundo};">
    <tr><td align="center" style="padding:28px 12px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #ece3d2;border-radius:16px;overflow:hidden;">
        <tr><td style="background:${COR.dourado};height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px 34px 6px;text-align:center;">
          <div style="font-family:${FONTE_SERIFA};font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${COR.dourado};">Casamento</div>
          <div style="font-family:${FONTE_SERIFA};font-size:30px;color:${COR.marrom};margin-top:6px;">Emanuelle &amp; Ítalo</div>
          <div style="width:54px;height:1px;background:${COR.dourado};margin:14px auto 4px;line-height:1px;font-size:0;">&nbsp;</div>
        </td></tr>
        <tr><td style="padding:14px 34px 30px;">${body}</td></tr>
        <tr><td style="background:${COR.creme};padding:18px 34px;text-align:center;font-size:11px;line-height:1.6;color:${COR.textoClaro};border-top:1px solid ${COR.bordaClara};">
          Enviado automaticamente pelo site do casamento.<br>
          <a href="${siteUrl()}" style="color:${COR.dourado};text-decoration:none;">emanuelleitalo.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Saudação centralizada. */
function saudacao(nome: string) {
  return `<div style="text-align:center;font-size:14px;color:${COR.textoClaro};margin-bottom:4px;">Olá, ${esc(nome || "Convidado")}!</div>`;
}

/** Título principal do corpo (serifada). */
function titulo(t: string) {
  return `<div style="font-family:${FONTE_SERIFA};font-size:21px;font-weight:bold;color:${COR.marrom};text-align:center;margin:2px 0 12px;line-height:1.3;">${esc(t)}</div>`;
}

/** Selo/pílula de destaque dourado. */
function selo(label: string) {
  return `<div style="text-align:center;margin:0 0 6px;"><span style="display:inline-block;background:#f3ebda;color:${COR.douradoEsc};border:1px solid ${COR.borda};padding:9px 20px;border-radius:999px;font-size:13px;font-weight:bold;">${esc(label)}</span></div>`;
}

/** Parágrafo centralizado. */
function paragrafo(html: string) {
  return `<p style="text-align:center;font-size:13px;line-height:1.7;color:${COR.marromSuave};margin:14px 0;">${html}</p>`;
}

/** Caixa de informações em creme com borda dourada. */
function caixa(inner: string) {
  return `<div style="background:${COR.creme};border:1px solid ${COR.borda};border-radius:12px;padding:16px 18px;font-size:13px;line-height:1.7;color:${COR.marromSuave};">${inner}</div>`;
}

/** Rótulo dourado para campos dentro das caixas. */
function rotulo(label: string) {
  return `<strong style="color:${COR.douradoEsc};font-weight:bold;">${esc(label)}</strong>`;
}

/** Botão de ação (table-based para compatibilidade com Outlook). */
function botaoCta(href: string, label: string) {
  return `<table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:18px auto 4px;">
    <tr><td style="background:${COR.marrom};border-radius:999px;">
      <a href="${href}" style="display:inline-block;padding:13px 32px;font-family:${FONTE_SANS};font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">${esc(label)}</a>
    </td></tr>
  </table>`;
}

function itensHtml(itens: unknown) {
  const raw = Array.isArray(itens) ? itens.map((item) => String(item)).join("|") : String(itens || "");
  const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return `<div style="padding:8px 0;font-size:13px;color:${COR.marromSuave};">Presente selecionado.</div>`;
  return parts.map((parte) => `<div style="border-bottom:1px solid ${COR.borda};padding:8px 0;font-size:13px;color:${COR.marromSuave};">${esc(parte)}</div>`).join("");
}

function totalHtml(total: number) {
  return `<div style="border-top:2px solid ${COR.borda};margin-top:12px;padding-top:12px;font-family:${FONTE_SERIFA};font-size:16px;font-weight:bold;color:${COR.marrom};text-align:right;">Total: ${money(total)}</div>`;
}

async function sendSafe(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    return true;
  } catch (error) {
    SafeLog.error(label, error);
    return false;
  }
}

export async function enviarNotificacaoRecado(data: { nome: string; email: string; mensagem: string }) {
  const to = env("RECADO_ADMIN_EMAIL", "");
  if (!to) return false;
  return sendSafe("EMAIL recado", () => sendEmail({
    to,
    userType: "convite",
    replyTo: data.email,
    subject: "Novo recado recebido (pendente de aprovação)",
    text: `Você recebeu um novo recado no site.\n\nNome: ${data.nome}\nEmail: ${data.email}\nMensagem:\n${data.mensagem}\n\nAcesse o painel para aprovar.`,
    html: emailShell("Novo recado", `${titulo("Novo recado recebido")}
      ${caixa(`${rotulo("Nome:")}<br>${esc(data.nome)}<br><br>
        ${rotulo("Email:")}<br>${esc(data.email)}<br><br>
        ${rotulo("Mensagem:")}<br>${esc(data.mensagem).replace(/\n/g, "<br>")}`)}
      ${paragrafo("Acesse o painel para aprovar este recado.")}`),
  }));
}

export async function enviarComprovanteAprovado(data: { email: string; nome: string; itens: unknown; total: number }) {
  if (!data.email) return false;
  return sendSafe("EMAIL comprovante", () => sendEmail({
    to: data.email,
    userType: "pagamento",
    subject: "Comprovante de Presente - Casamento Emanuelle e Ítalo",
    html: emailShell("Comprovante de Presente", `${saudacao(data.nome)}
      ${titulo("Seu presente foi recebido")}
      ${selo("Pagamento confirmado")}
      ${caixa(`<div style="font-family:${FONTE_SERIFA};font-weight:bold;color:${COR.marrom};text-align:center;margin-bottom:10px;">Resumo do presente</div>
        ${itensHtml(data.itens)}
        ${totalHtml(data.total)}`)}
      ${paragrafo("Agradecemos de coração pelo carinho. Seu presente foi recebido com muito amor. 💛")}
      ${botaoCta(siteUrl(), "Acessar o site do casamento")}`),
  }));
}

export async function enviarCartaoRecusado(data: { email: string; nome: string; motivo?: string; itens: unknown; total: number }) {
  if (!data.email) return false;
  return sendSafe("EMAIL cartão recusado", () => sendEmail({
    to: data.email,
    userType: "pagamento",
    subject: "Pagamento com cartão não autorizado - Casamento Emanuelle e Ítalo",
    html: emailShell("Pagamento não autorizado", `${saudacao(data.nome)}
      ${titulo("Seu pagamento com cartão não foi autorizado")}
      <div style="background:#fdf3f3;border:1px solid #f0d2d2;border-radius:12px;padding:14px 18px;font-size:13px;line-height:1.7;color:${COR.marromSuave};margin:0 0 14px;">
        ${rotulo("Motivo informado:")}<br>${esc(data.motivo || "Não foi possível autorizar a transação no momento.")}
      </div>
      ${caixa(`<div style="font-family:${FONTE_SERIFA};font-weight:bold;color:${COR.marrom};text-align:center;margin-bottom:10px;">Resumo do pedido</div>
        ${itensHtml(data.itens)}
        ${totalHtml(data.total)}`)}
      ${paragrafo("Você pode tentar novamente com os dados do cartão revisados ou escolher outra forma de pagamento, como o Pix.")}
      ${botaoCta(siteUrl(), "Tentar novamente no site")}`),
  }));
}

export async function enviarPix(data: { email: string; nome: string; total: number; vencimento?: string; qrCode: string; qrCodeBase64?: string }) {
  if (!data.email) return false;
  const venc = data.vencimento ? new Date(data.vencimento) : null;
  const vencimento = venc && !Number.isNaN(venc.getTime())
    ? venc.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", "")
    : "";
  const cleanBase64 = String(data.qrCodeBase64 || "").replace(/^data:image\/png;base64,/, "");
  return sendSafe("EMAIL pix", () => sendEmail({
    to: data.email,
    userType: "pagamento",
    subject: "Pagamento Pix - Casamento Emanuelle e Ítalo",
    attachments: cleanBase64 ? [{ filename: "pix.png", content: Buffer.from(cleanBase64, "base64"), cid: "pix-qrcode" }] : undefined,
    html: emailShell("Pagamento Pix", `${saudacao(data.nome)}
      ${titulo("Recebemos o seu pedido")}
      ${selo("Você escolheu pagar por Pix")}
      ${paragrafo("Se você ainda não realizou o pagamento, escaneie o QR Code ou use o código Pix abaixo.")}
      <div style="text-align:center;margin:18px 0;">
        ${cleanBase64
          ? `<table cellpadding="0" cellspacing="0" border="0" align="center"><tr><td style="background:#ffffff;border:1px solid ${COR.borda};border-radius:14px;padding:14px;">
              <img src="cid:pix-qrcode" alt="QR Code Pix" width="190" height="190" style="display:block;width:190px;height:190px;">
            </td></tr></table>`
          : `<p style="color:#999;">QR Code indisponível.</p>`}
      </div>
      ${caixa(`<div style="text-align:center;">
        <div style="font-family:${FONTE_SERIFA};font-weight:bold;color:${COR.douradoEsc};font-size:13px;">Valor total</div>
        <div style="font-family:${FONTE_SERIFA};font-size:24px;font-weight:bold;color:${COR.marrom};margin-top:2px;">${money(data.total)}</div>
        ${vencimento ? `<div style="margin-top:8px;font-size:12px;color:${COR.marromSuave};">Expira em ${esc(vencimento)}</div>` : ""}
      </div>`)}
      <p style="text-align:center;font-size:12px;color:${COR.textoClaro};margin:18px 0 6px;">Código Pix para copiar e colar:</p>
      <div style="background:${COR.creme};border:1px dashed ${COR.borda};border-radius:10px;padding:12px;font-size:12px;color:${COR.marromSuave};word-break:break-all;font-family:monospace;line-height:1.5;">${esc(data.qrCode)}</div>`),
  }));
}

export async function enviarAvisoAdminPresente(data: { nome: string; email: string; itens: unknown; total: number; metodo?: string; status?: string }) {
  const to = env("PRESENTE_ADMIN_EMAIL", env("RECADO_ADMIN_EMAIL", ""));
  if (!to) return false;
  return sendSafe("EMAIL admin presente", () => sendEmail({
    to,
    userType: "convite",
    replyTo: data.email,
    subject: "Novo presente recebido - Casamento Emanuelle e Ítalo",
    text: `Novo presente recebido.\n\nNome: ${data.nome}\nEmail: ${data.email}\nMétodo: ${data.metodo || "-"}\nStatus: ${data.status || "aprovado"}\nTotal: ${money(data.total)}\n\nItens:\n${String(data.itens || "-").replace(/\|/g, "\n")}`,
    html: emailShell("Novo presente recebido", `${titulo("Novo presente recebido")}
      ${caixa(`${rotulo("Nome:")}<br>${esc(data.nome || "-")}<br><br>
        ${rotulo("Email:")}<br>${esc(data.email || "-")}<br><br>
        ${rotulo("Método:")}<br>${esc(data.metodo || "-")}<br><br>
        ${rotulo("Status:")}<br>${esc(data.status || "aprovado")}<br><br>
        ${rotulo("Itens:")}${itensHtml(data.itens)}
        ${totalHtml(data.total)}`)}
      ${paragrafo("Acesse o painel para ver os detalhes da venda.")}`),
  }));
}

export async function enviarAvisoAdminRsvp(data: { nomeConvite: string; qtd: number; nomesConfirmados: string; email?: string; observacoes?: string }) {
  const to = env("RSVP_ADMIN_EMAIL", env("RECADO_ADMIN_EMAIL", ""));
  if (!to) return false;
  return sendSafe("EMAIL admin RSVP", () => sendEmail({
    to,
    userType: "convite",
    replyTo: data.email,
    subject: "Nova confirmação de presença - Casamento Emanuelle e Ítalo",
    text: `Nova confirmação de presença.\n\nConvite: ${data.nomeConvite}\nQuantidade: ${data.qtd}\nEmail: ${data.email || "-"}\n\nNomes confirmados:\n${data.nomesConfirmados || "-"}\n\nObservações:\n${data.observacoes || "-"}`,
    html: emailShell("Nova confirmação de presença", `${titulo("Nova confirmação de presença")}
      ${caixa(`${rotulo("Nome do convite:")}<br>${esc(data.nomeConvite || "-")}<br><br>
        ${rotulo("Quantidade confirmada:")}<br>${esc(data.qtd)}<br><br>
        ${rotulo("Email informado:")}<br>${esc(data.email || "-")}<br><br>
        ${rotulo("Convidados confirmados:")}<br>${esc(data.nomesConfirmados || "-").replace(/\n/g, "<br>")}<br><br>
        ${rotulo("Observações:")}<br>${esc(data.observacoes || "-")}`)}
      ${paragrafo("Acesse o painel para acompanhar a lista de convidados.")}`),
  }));
}

export async function enviarConfirmacaoPresenca(data: { email: string; nomeConvite: string; qtd: number; nomesConfirmados: string; observacoes?: string }) {
  if (!data.email) return false;
  return sendSafe("EMAIL RSVP", () => sendEmail({
    to: data.email,
    userType: "convite",
    subject: "Confirmação de presença - Casamento Emanuelle e Ítalo",
    html: emailShell("Confirmação de presença", `${saudacao(data.nomeConvite)}
      ${titulo("Sua presença foi confirmada!")}
      ${paragrafo("O casal Emanuelle Fernanda e Ítalo Adson já recebeu a sua resposta ao formulário de confirmação de presença.")}
      ${caixa(`<div style="font-family:${FONTE_SERIFA};font-weight:bold;color:${COR.marrom};text-align:center;margin-bottom:10px;">Dados informados</div>
        ${rotulo("Nome do convite:")}<br>${esc(data.nomeConvite)}<br><br>
        ${rotulo("Convidados confirmados:")}<br>${esc(data.nomesConfirmados || "-").replace(/\n/g, "<br>")}<br><br>
        ${rotulo("Quantidade confirmada:")}<br>${esc(data.qtd)}<br><br>
        ${rotulo("Observações deixadas:")}<br>${esc(data.observacoes || "-")}`)}
      ${botaoCta(siteUrl(), "Acessar o site do casamento")}
      <p style="text-align:center;font-size:12px;line-height:1.6;color:${COR.textoClaro};margin-top:14px;">Após o envio do formulário, não é possível alterar as respostas.</p>`),
  }));
}

export async function enviarPixExpirado(data: { email: string; nome: string; itens?: unknown; total?: number }) {
  if (!data.email) return false;
  return sendSafe("EMAIL pix expirado", () => sendEmail({
    to: data.email,
    userType: "pagamento",
    subject: "Seu Pix expirou - Casamento Emanuelle e Ítalo",
    html: emailShell("Pix expirado", `${saudacao(data.nome)}
      ${titulo("Seu Pix expirou")}
      ${selo("Nenhuma cobrança foi feita")}
      ${paragrafo("O prazo para pagamento do Pix terminou antes da confirmação. Fique tranquilo(a): <strong>nada foi cobrado</strong>.")}
      ${data.total ? caixa(`<div style="font-family:${FONTE_SERIFA};font-weight:bold;color:${COR.marrom};text-align:center;margin-bottom:10px;">Presente escolhido</div>${itensHtml(data.itens)}${totalHtml(Number(data.total))}`) : ""}
      ${paragrafo("Se ainda quiser nos presentear, é só gerar um novo Pix no site, leva menos de um minuto. 💛")}
      ${botaoCta(siteUrl() + "/#presentes", "Gerar um novo Pix")}`),
  }));
}

export async function enviarAgradecimentoRecado(data: { email: string; nome: string }) {
  if (!data.email) return false;
  return sendSafe("EMAIL agradecimento recado", () => sendEmail({
    to: data.email,
    userType: "convite",
    subject: "Recebemos o seu recado - Casamento Emanuelle e Ítalo",
    html: emailShell("Recebemos seu recado", `${saudacao(data.nome)}
      ${titulo("Recebemos o seu recado!")}
      ${selo("Mensagem recebida")}
      ${paragrafo("Muito obrigado pelo carinho! Sua mensagem foi recebida e, após uma rápida aprovação, aparecerá no mural de recados do nosso site.")}
      ${botaoCta(siteUrl() + "/#recados", "Ver o mural de recados")}`),
  }));
}
