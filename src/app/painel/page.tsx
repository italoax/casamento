/**
 * PAINEL PAGE - Página Principal do Painel Administrativo
 * 
 * Página raiz do painel que renderiza o dashboard.
 * Fluxo:
 * 1. Verifica se usuário está autenticado
 * 2. Se não, redireciona para /painel/login
 * 3. Se sim, carrega dados iniciais do servidor em paralelo
 * 4. Passa dados para PainelClient (React component)
 * 
 * Dados carregados:
 * - Dashboard: estatísticas gerais
 * - Convidados: lista paginada
 * - Presentes: lista de presentes
 * - Vendas: histórico de vendas
 * - Recados: mensagens de convidados
 * - Logs: auditoria de ações
 * - RSVP deadline: data limite de confirmação
 */

import { redirect } from "next/navigation";
import { getPainelSession } from "@/lib/painel-auth";
import { getDashboardData, getRsvpDeadline, listarConvidados, listarLogs, listarPresentes, listarRecados, listarVendas } from "@/lib/painel-data";
import PainelClient from "./PainelClient";
// CSS do painel importado pelo pipeline do Next (render-blocking no <head>).
// Antes era carregado via <link> no corpo, o que causava FOUC: a tabela
// aparecia gigante (sem estilo) ao logar e só "encolhia" no primeiro clique.
import "../../../public/painel/css/painel.css";
import "../../../public/painel/css/painel-next.css";

// Force dynamic - não cachear (dados mudam com frequência)
export const dynamic = "force-dynamic";

export default async function PainelPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  // Aba inicial vinda da URL (?aba=...). Como é query param (não hash), o servidor
  // já renderiza a aba certa no refresh, sem mostrar o dashboard antes.
  const { aba: abaInicial } = await searchParams;

  // Obtém sessão do usuário
  const session = await getPainelSession();
  
  // Se não autenticado, redireciona para login
  if (!session) redirect("/painel/login");

  // Carrega todos os dados em paralelo (mais eficiente que sequencial)
  const [dashboard, convidados, presentes, vendas, recados, logs, rsvpDeadline] = await Promise.all([
    getDashboardData(),
    listarConvidados("", "recentes", 1, 20),
    listarPresentes("", "recentes"),
    listarVendas(1, 20),
    listarRecados(),
    listarLogs(1, 50),
    getRsvpDeadline(),
  ]);

  return (
    <>
      {/* Componente cliente que renderiza o dashboard */}
      <PainelClient
        initialAba={abaInicial}
        initialData={{
          session,
          dashboard,
          convidados,
          presentes,
          vendas,
          recados,
          logs,
          rsvpDeadline,
        }}
      />
    </>
  );
}
