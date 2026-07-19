/**
 * EMAIL SERVICE - Envio de E-mails
 *
 * Centraliza o envio de e-mails da aplicação.
 * Todos os e-mails são enviados pela mesma conta SMTP (SMTP_USER/SMTP_PASS).
 * Exemplo de uso:
 * await sendEmail({
 *   to: "usuario@email.com",
 *   subject: "Confirmação de Presença",
 *   html: "<p>Sua presença foi confirmada!</p>",
 * });
 */

import * as nodemailer from "nodemailer";
import { env, envBool } from "./env";

type EmailAttachment = {
  filename?: string;
  content?: Buffer | string;
  cid?: string;
  contentType?: string;
};

/** Mantido apenas por compatibilidade com chamadas existentes; não altera o remetente. */
type EmailUserType = "pagamento" | "convite";

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  userType?: EmailUserType;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

/**
 * Defesa em profundidade contra injeção de cabeçalho (CRLF).
 * Rejeita CR/LF em valores que viram cabeçalhos de e-mail (to, subject, etc.).
 * O fluxo do site só passa strings simples nesses campos, então qualquer
 * \r ou \n indica entrada maliciosa — falhamos em vez de enviar.
 */
function assertSemCRLF(campo: string, valor: string | undefined) {
  if (valor && /[\r\n]/.test(valor)) {
    throw new Error(`Valor inválido em "${campo}": quebra de linha não permitida.`);
  }
}

/** Conta SMTP única do site (suporte@). */
function smtpAccount() {
  const user = env("SMTP_USER");
  return {
    user,
    pass: env("SMTP_PASS"),
    from: env("SMTP_FROM", user),
  };
}

export async function sendEmail(options: SendEmailOptions) {
  const account = smtpAccount();

  // Valida se as credenciais estão configuradas
  if (!account.user || !account.pass) {
    throw new Error("SMTP não configurado (SMTP_USER/SMTP_PASS).");
  }

  // Defesa em profundidade: bloqueia injeção de cabeçalho via CRLF.
  assertSemCRLF("to", options.to);
  assertSemCRLF("subject", options.subject);
  assertSemCRLF("replyTo", options.replyTo);
  assertSemCRLF("from", account.from);

  // Cria transportador (conexão SMTP reutilizável)
  const transporter = nodemailer.createTransport({
    host: env("SMTP_HOST"),
    port: Number(env("SMTP_PORT", "587")),
    secure: envBool("SMTP_SECURE", false), // true = TLS, false = STARTTLS
    auth: { user: account.user, pass: account.pass },
  });

  // Envia o e-mail
  await transporter.sendMail({
    from: account.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo,
    attachments: options.attachments,
  });
}
