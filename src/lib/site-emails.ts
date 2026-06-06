import { sendEmail } from "./email";
import { env } from "./env";
import { SafeLog } from "./security";

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

function emailShell(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${esc(title)}</title></head>
<body style="font-family:Arial,sans-serif;color:#6e7983;background:#f7fafb;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7fafb;">
    <tr><td align="center" style="padding:24px 10px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border:1px solid #eceeee;border-radius:10px;overflow:hidden;">
        <tr><td style="background:#e583a2;height:8px;line-height:8px;font-size:0;"></td></tr>
        <tr><td style="padding:24px;">${body}</td></tr>
        <tr><td style="padding:0 24px 20px;text-align:center;font-size:11px;color:#9a9a9a;">Enviado automaticamente pelo site do casamento.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function itensHtml(itens: unknown) {
  const raw = Array.isArray(itens) ? itens.map((item) => String(item)).join("|") : String(itens || "");
  const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return "<div style='padding:8px 0;font-size:13px;color:#6e7983;'>Presente selecionado.</div>";
  return parts.map((parte) => `<div style='border-bottom:1px solid #f0e3c7;padding:8px 0;font-size:13px;color:#6e7983;'>${esc(parte)}</div>`).join("");
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
    html: emailShell("Novo recado", `<div style="font-size:20px;font-weight:bold;color:#6e7983;text-align:center;margin-bottom:14px;">Novo recado recebido</div>
      <div style="background:#fff5dc;border:1px dashed #ead7a8;border-radius:10px;padding:14px;font-size:13px;line-height:1.6;">
        <strong style="color:#e583a2;">Nome:</strong><br>${esc(data.nome)}<br><br>
        <strong style="color:#e583a2;">Email:</strong><br>${esc(data.email)}<br><br>
        <strong style="color:#e583a2;">Mensagem:</strong><br>${esc(data.mensagem).replace(/\n/g, "<br>")}
      </div>
      <p style="text-align:center;font-size:13px;">Acesse o painel para aprovar.</p>`),
  }));
}

export async function enviarComprovanteAprovado(data: { email: string; nome: string; itens: unknown; total: number }) {
  if (!data.email) return false;
  return sendSafe("EMAIL comprovante", () => sendEmail({
    to: data.email,
    userType: "pagamento",
    subject: "Comprovante de Presente - Casamento Emanuelle e Ítalo",
    html: emailShell("Comprovante de Presente", `<div style="text-align:center;">
        <div style="font-size:14px;color:#9aa4ad;margin-bottom:6px;">Olá, ${esc(data.nome || "Convidado")}!</div>
        <div style="font-size:20px;font-weight:bold;color:#6e7983;margin-bottom:8px;">Seu presente foi recebido.</div>
        <div style="display:inline-block;background:#e583a2;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:bold;">Comprovante verificado</div>
      </div>
      <div style="padding:18px 0 0;">
        <div style="background:#fff5dc;border:1px dashed #ead7a8;border-radius:10px;padding:12px 16px;font-size:13px;line-height:1.6;color:#6e7983;">
          <div style="font-weight:bold;color:#e583a2;text-align:center;margin-bottom:8px;">Resumo do Presente</div>
          ${itensHtml(data.itens)}
          <div style="border-top:2px solid #ead7a8;margin-top:10px;padding-top:10px;font-size:15px;font-weight:bold;color:#e583a2;text-align:right;">Total: ${money(data.total)}</div>
        </div>
      </div>
      <p style="text-align:center;font-size:13px;line-height:1.6;">Agradecemos pelo carinho. Seu presente foi recebido com amor.</p>
      <div style="text-align:center;"><a href="${siteUrl()}" style="display:inline-block;background:#e583a2;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:14px;font-weight:bold;">Acessar Site do Casamento</a></div>`),
  }));
}

export async function enviarCartaoRecusado(data: { email: string; nome: string; motivo?: string; itens: unknown; total: number }) {
  if (!data.email) return false;
  return sendSafe("EMAIL cartão recusado", () => sendEmail({
    to: data.email,
    userType: "pagamento",
    subject: "Pagamento com cartão não autorizado - Casamento Emanuelle e Ítalo",
    html: emailShell("Pagamento não autorizado", `<div style="text-align:center;">
        <div style="font-size:14px;color:#9aa4ad;margin-bottom:6px;">Olá, ${esc(data.nome || "Convidado")}!</div>
        <div style="font-size:20px;font-weight:bold;color:#6e7983;margin-bottom:8px;">Seu pagamento com cartão não foi autorizado.</div>
      </div>
      <div style="background:#fff5f7;border:1px dashed #f0c3d0;border-radius:10px;padding:12px 16px;font-size:13px;line-height:1.6;color:#6e7983;margin:16px 0;">
        <strong style="color:#d55e83;">Motivo informado:</strong><br>${esc(data.motivo || "Não foi possível autorizar a transação no momento.")}
      </div>
      <div style="background:#fff5dc;border:1px dashed #ead7a8;border-radius:10px;padding:12px 16px;font-size:13px;line-height:1.6;color:#6e7983;">
        <div style="font-weight:bold;color:#e583a2;text-align:center;margin-bottom:8px;">Resumo do pedido</div>
        ${itensHtml(data.itens)}
        <div style="border-top:2px solid #ead7a8;margin-top:10px;padding-top:10px;font-size:15px;font-weight:bold;color:#e583a2;text-align:right;">Total: ${money(data.total)}</div>
      </div>
      <p style="text-align:center;font-size:13px;line-height:1.6;">Você pode tentar novamente com os dados do cartão revisados ou escolher outra forma de pagamento.</p>
      <div style="text-align:center;"><a href="${siteUrl()}" style="display:inline-block;background:#e583a2;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:14px;font-weight:bold;">Tentar novamente no site</a></div>`),
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
    html: emailShell("Pagamento Pix", `<div style="text-align:center;">
        <div style="font-size:14px;color:#9aa4ad;margin-bottom:6px;">Olá, ${esc(data.nome || "Convidado")}!</div>
        <div style="font-size:20px;font-weight:bold;color:#6e7983;margin-bottom:10px;">Recebemos o seu pedido de compra.</div>
        <div style="display:inline-block;background:#e583a2;color:#fff;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:bold;">você escolheu pagar o presente por PIX.</div>
      </div>
      <p style="text-align:center;font-size:13px;line-height:1.6;">Se você ainda não realizou o pagamento, escaneie o QR Code ou use o código Pix abaixo.</p>
      <div style="text-align:center;margin:16px 0;">${cleanBase64 ? `<img src="cid:pix-qrcode" alt="QR Code Pix" style="width:180px;height:180px;display:block;margin:0 auto;">` : "<p style='color:#999;'>QR Code indisponível.</p>"}</div>
      <div style="background:#fff5dc;border:1px dashed #ead7a8;border-radius:10px;padding:12px;text-align:center;font-size:14px;">
        <div style="color:#e583a2;font-weight:bold;">Valor total:</div><div>${money(data.total)}</div>${vencimento ? `<div style="margin-top:6px;">Expira em: ${esc(vencimento)}</div>` : ""}
      </div>
      <p style="text-align:center;font-size:13px;color:#6e7983;">código PIX para cópia e cola:</p>
      <div style="background:#f7f7f7;border:1px dashed #e4ddc7;border-radius:10px;padding:12px;font-size:12px;color:#6e7983;word-break:break-all;font-family:monospace;">${esc(data.qrCode)}</div>`),
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
    html: emailShell("Novo presente recebido", `<div style="font-size:20px;font-weight:bold;color:#6e7983;text-align:center;margin-bottom:14px;">Novo presente recebido</div>
      <div style="background:#fff5dc;border:1px dashed #ead7a8;border-radius:10px;padding:12px 16px;font-size:13px;line-height:1.6;color:#6e7983;">
        <strong style="color:#e583a2;">Nome:</strong><br>${esc(data.nome || "-")}<br><br>
        <strong style="color:#e583a2;">Email:</strong><br>${esc(data.email || "-")}<br><br>
        <strong style="color:#e583a2;">Método:</strong><br>${esc(data.metodo || "-")}<br><br>
        <strong style="color:#e583a2;">Status:</strong><br>${esc(data.status || "aprovado")}<br><br>
        <strong style="color:#e583a2;">Itens:</strong>${itensHtml(data.itens)}
        <div style="border-top:2px solid #ead7a8;margin-top:10px;padding-top:10px;font-size:15px;font-weight:bold;color:#e583a2;text-align:right;">Total: ${money(data.total)}</div>
      </div>
      <p style="text-align:center;font-size:13px;">Acesse o painel para ver os detalhes da venda.</p>`),
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
    html: emailShell("Nova confirmação de presença", `<div style="font-size:20px;font-weight:bold;color:#6e7983;text-align:center;margin-bottom:14px;">Nova confirmação de presença</div>
      <div style="background:#fcfaf3;border:1px dashed #e4ddc7;border-radius:10px;padding:14px;text-align:center;font-size:13px;line-height:1.6;">
        <span style="color:#e583a2;font-weight:bold;">Nome do convite:</span><br>${esc(data.nomeConvite || "-")}<br><br>
        <span style="color:#e583a2;font-weight:bold;">Quantidade confirmada:</span><br>${esc(data.qtd)}<br><br>
        <span style="color:#e583a2;font-weight:bold;">Email informado:</span><br>${esc(data.email || "-")}<br><br>
        <span style="color:#e583a2;font-weight:bold;">Convidados confirmados:</span><br>${esc(data.nomesConfirmados || "-").replace(/\n/g, "<br>")}<br><br>
        <span style="color:#e583a2;font-weight:bold;">Observações:</span><br>${esc(data.observacoes || "-")}
      </div>
      <p style="text-align:center;font-size:13px;">Acesse o painel para acompanhar a lista de convidados.</p>`),
  }));
}

export async function enviarConfirmacaoPresenca(data: { email: string; nomeConvite: string; qtd: number; nomesConfirmados: string; observacoes?: string }) {
  if (!data.email) return false;
  return sendSafe("EMAIL RSVP", () => sendEmail({
    to: data.email,
    userType: "convite",
    subject: "Confirmação de presença - Casamento Emanuelle e Ítalo",
    html: emailShell("Confirmação de presença", `<div style="text-align:center;font-size:14px;">Olá, <strong>${esc(data.nomeConvite || "Convidado")}</strong>! Tudo bem?</div>
      <p style="text-align:center;font-size:13px;line-height:1.6;">O casal Emanuelle Fernanda e Ítalo Adson já recebeu sua resposta ao Formulário de confirmação de presença.</p>
      <div style="background:#fcfaf3;border:1px dashed #e4ddc7;border-radius:6px;padding:14px;text-align:center;font-size:13px;line-height:1.6;">
        <strong>Confira os dados informados por você abaixo:</strong><br><br>
        <span style="color:#e583a2;font-weight:bold;">Nome do convite:</span><br>${esc(data.nomeConvite)}<br><br>
        <span style="color:#e583a2;font-weight:bold;">Convidados confirmados:</span><br>${esc(data.nomesConfirmados || "-").replace(/\n/g, "<br>")}<br><br>
        <span style="color:#e583a2;font-weight:bold;">Quantidade confirmada:</span><br>${esc(data.qtd)}<br><br>
        <span style="color:#e583a2;font-weight:bold;">Observações deixadas:</span><br>${esc(data.observacoes || "-")}
      </div>
      <div style="text-align:center;margin-top:18px;"><a href="${siteUrl()}" style="display:inline-block;background:#e583a2;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:14px;font-weight:bold;">Acessar Site do Casamento</a></div>
      <p style="text-align:center;font-size:12px;line-height:1.6;color:#657787;">após o envio do Formulário, não é possível alterar as respostas.</p>`),
  }));
}
