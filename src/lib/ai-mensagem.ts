/**
 * Geração de mensagens para os noivos com IA (Claude / Anthropic).
 *
 * Gera uma felicitação curta e calorosa endereçada ao casal, em pt-BR,
 * opcionalmente assinada pelo convidado. Requer ANTHROPIC_API_KEY no ambiente;
 * sem a chave, lança erro e o front cai no gerador por modelos (fallback).
 */

import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import { clean } from "./payment/payment-utils";

const MAX_CHARS = 400;

export async function gerarMensagemNoivos(input: { nome?: string }): Promise<string> {
  const apiKey = env("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("IA não configurada (ANTHROPIC_API_KEY ausente).");

  const nome = clean(input.nome, 80);
  const noivos = env("NOIVOS_NOMES", "Emanuelle & Ítalo");
  const assinatura = nome
    ? `Assine ao final exatamente como: "Com carinho, ${nome}."`
    : "Não assine a mensagem.";

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: env("ANTHROPIC_MODEL", "claude-opus-4-8"),
    max_tokens: 320,
    system:
      "Você escreve mensagens de felicitação de casamento em português do Brasil, " +
      "calorosas, sinceras e naturais, endereçadas ao casal. Evite clichês exagerados, " +
      "rimas forçadas e emojis. A mensagem deve ter no máximo 400 caracteres. " +
      "Responda APENAS com a mensagem final — sem aspas, sem comentários, sem opções, sem títulos.",
    messages: [
      {
        role: "user",
        content:
          `Escreva uma mensagem de felicitações para o casamento de ${noivos}. ` +
          `${assinatura} ` +
          `Varie o estilo para soar única e pessoal. Máximo 400 caracteres.`,
      },
    ],
  });

  const texto = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join(" ")
    .replace(/^["“”']|["“”']$/g, "")
    .trim();

  if (!texto) throw new Error("Resposta vazia da IA.");
  return texto.slice(0, MAX_CHARS);
}
