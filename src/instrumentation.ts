/**
 * Instrumentação do Next: roda uma vez quando o servidor sobe.
 * Usamos para iniciar o worker da fila de disparo de WhatsApp dentro do processo
 * do Next (que é onde o DB e as libs estão). Só no runtime Node (não em edge/build).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { iniciarWorkerFila } = await import("@/lib/whatsapp-queue");
    iniciarWorkerFila();
  }
}
