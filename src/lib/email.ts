/**
 * EMAIL SERVICE - Envio de E-mails
 * 
 * Centraliza o envio de e-mails da aplicação.
 * Suporta dois tipos de conta SMTP:
 * - "pagamento": Para e-mails de transações e pagamentos
 * - "convite": Para e-mails de convites e confirmações
 * 
 * Cada tipo pode ter suas próprias credenciais SMTP diferentes.
 * Exemplo de uso:
 * await sendEmail({
 *   to: "usuario@email.com",
 *   subject: "Confirmação de Presença",
 *   html: "<p>Sua presença foi confirmada!</p>",
 *   userType: "convite"
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

type EmailUserType = "pagamento" | "convite";

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  userType: EmailUserType;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

/**
 * Retorna as credenciais SMTP baseado no tipo de conta
 * Cada tipo pode ter usuário/senha diferentes
 */
function accountFor(type: EmailUserType) {
  if (type === "pagamento") {
    const user = env("SMTP_USER_PAGAMENTO");
    return {
      user,
      pass: env("SMTP_PASS_PAGAMENTO"),
      from: env("SMTP_FROM_PAGAMENTO", user),
    };
  }

  const user = env("SMTP_USER_CONVITE");
  return {
    user,
    pass: env("SMTP_PASS_CONVITE"),
    from: env("SMTP_FROM_CONVITE", user),
  };
}

export async function sendEmail(options: SendEmailOptions) {
  // Obtém credenciais SMTP do tipo de conta
  const account = accountFor(options.userType);

  // Valida se as credenciais estão configuradas
  if (!account.user || !account.pass) {
    throw new Error(`SMTP ${options.userType} não configurado.`);
  }

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
