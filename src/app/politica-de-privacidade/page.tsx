/* eslint-disable @next/next/no-css-tags */
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Política de Privacidade | Emanuelle & Ítalo",
  description: "Como coletamos, usamos e protegemos seus dados pessoais no site de casamento de Emanuelle e Ítalo, em conformidade com a LGPD.",
};

export default function PoliticaDePrivacidadePage() {
  // Configuráveis pelo .env (com fallback caso não estejam definidos).
  const CONTATO_EMAIL = env("LEGAL_CONTATO_EMAIL", "suporte@emanuelleitalo.com");
  const ULTIMA_ATUALIZACAO = env("LEGAL_ATUALIZACAO", "7 de junho de 2026");
  return (
    <>
      <link rel="stylesheet" href="/css/paginas-legais.css" />

      <main className="legal-pagina">
        <header className="legal-hero">
          <span className="legal-eyebrow">Sua privacidade importa</span>
          <h1>Política de Privacidade</h1>
          <div className="legal-nomes">Emanuelle &amp; Ítalo</div>
          <div className="legal-divisor" aria-hidden="true"></div>
          <span className="legal-atualizacao">Última atualização: {ULTIMA_ATUALIZACAO}</span>
        </header>

        <article className="legal-conteudo">
          <p className="legal-intro">
            Esta Política de Privacidade explica, de forma clara e transparente, como tratamos os
            dados pessoais coletados neste site de casamento, em conformidade com a Lei Geral de
            Proteção de Dados Pessoais (Lei nº 13.709/2018, a LGPD). Ao utilizar o site, você concorda
            com as práticas aqui descritas.
          </p>

          <section className="legal-secao">
            <h2><span className="legal-num">1.</span> Quem é o responsável pelos dados</h2>
            <p>
              Os responsáveis pelo tratamento dos dados pessoais (controladores) são os noivos,
              Emanuelle e Ítalo, que utilizam este site exclusivamente para fins pessoais relacionados
              à celebração do seu casamento. Para qualquer assunto envolvendo seus dados, utilize o
              contato indicado ao final desta política.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">2.</span> Dados que coletamos</h2>
            <p>Coletamos apenas os dados necessários para cada funcionalidade:</p>
            <h3>Dados fornecidos por você</h3>
            <ul>
              <li><strong>Confirmação de presença:</strong> nome e informações de comparecimento;</li>
              <li><strong>Recados:</strong> nome, e-mail e a mensagem enviada;</li>
              <li><strong>Lista de presentes / pagamento:</strong> nome, e-mail, telefone, CPF e
              endereço (CEP e número), necessários para processar a contribuição e emitir a
              cobrança.</li>
            </ul>
            <h3>Dados coletados automaticamente</h3>
            <ul>
              <li>Endereço IP e registros de acesso (logs), por segurança e prevenção a fraudes;</li>
              <li>Dados técnicos de navegação fornecidos pelo seu navegador.</li>
            </ul>
            <p>
              <strong>Importante:</strong> os dados completos do cartão de crédito (número, CVV e
              validade) <strong>não são coletados nem armazenados por nós</strong>. Eles são tratados
              diretamente pela instituição de pagamento.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">3.</span> Para que usamos os dados e bases legais</h2>
            <p>Utilizamos seus dados pessoais para as seguintes finalidades:</p>
            <ul>
              <li>Processar contribuições da lista de presentes e emitir cobranças (execução de
              procedimentos a seu pedido);</li>
              <li>Enviar comprovantes e comunicações relacionadas à sua contribuição;</li>
              <li>Organizar o evento a partir das confirmações de presença;</li>
              <li>Publicar recados após moderação (com base no seu consentimento ao enviá-los);</li>
              <li>Garantir a segurança do site e prevenir fraudes (legítimo interesse);</li>
              <li>Cumprir obrigações legais e regulatórias, quando aplicável.</li>
            </ul>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">4.</span> Cookies e tecnologias semelhantes</h2>
            <p>
              Utilizamos tecnologias essenciais para o funcionamento do site e para sua segurança,
              incluindo o serviço <strong>Cloudflare Turnstile</strong>, que ajuda a distinguir
              acessos humanos de acessos automatizados (robôs). O uso do Turnstile está sujeito à{" "}
              <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener">Política de
              Privacidade</a> da Cloudflare.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">5.</span> Compartilhamento de dados</h2>
            <p>
              Nós <strong>não vendemos</strong> os seus dados pessoais. O compartilhamento ocorre
              apenas com parceiros necessários para o funcionamento do site:
            </p>
            <ul>
              <li><strong>Instituição de pagamento (Asaas):</strong> para processar pagamentos via Pix e
              cartão de crédito;</li>
              <li><strong>Cloudflare (Turnstile):</strong> para verificação de segurança;</li>
              <li><strong>Provedores de hospedagem e de envio de e-mail:</strong> para manter o site no
              ar e enviar comprovantes e notificações;</li>
              <li><strong>Autoridades públicas:</strong> quando houver obrigação legal ou ordem
              judicial.</li>
            </ul>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">6.</span> Transferência internacional</h2>
            <p>
              Alguns parceiros, como a Cloudflare, podem processar dados em servidores localizados fora do
              Brasil. Nesses casos, a transferência é realizada por empresas que adotam padrões de
              proteção compatíveis com a legislação aplicável.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">7.</span> Segurança dos dados</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados contra acessos não
              autorizados, perda ou alteração, incluindo conexão criptografada (HTTPS), controles de
              acesso e validações de segurança. Nenhum sistema é totalmente infalível, mas trabalhamos
              continuamente para reduzir riscos.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">8.</span> Por quanto tempo guardamos os dados</h2>
            <p>
              Os dados são mantidos apenas pelo tempo necessário às finalidades descritas ou para o
              cumprimento de obrigações legais. Após o casamento e cessadas as finalidades, os dados
              poderão ser eliminados ou anonimizados, ressalvadas as hipóteses de guarda obrigatória
              previstas em lei.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">9.</span> Seus direitos como titular</h2>
            <p>De acordo com a LGPD, você pode, a qualquer momento, solicitar:</p>
            <ul>
              <li>Confirmação da existência de tratamento dos seus dados;</li>
              <li>Acesso aos seus dados;</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em
              desconformidade;</li>
              <li>Portabilidade dos dados, quando aplicável;</li>
              <li>Informação sobre com quem seus dados foram compartilhados;</li>
              <li>Revogação do consentimento.</li>
            </ul>
            <p>
              Para exercer esses direitos, basta entrar em contato pelo e-mail indicado abaixo.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">10.</span> Dados de crianças e adolescentes</h2>
            <p>
              O site não se destina ao uso por menores de idade desacompanhados. Não coletamos
              intencionalmente dados de crianças e adolescentes sem o consentimento de seus
              responsáveis legais.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">11.</span> Alterações desta política</h2>
            <p>
              Esta Política de Privacidade pode ser atualizada periodicamente. A data da última
              revisão está indicada no topo desta página. Recomendamos consultá-la de tempos em
              tempos.
            </p>
          </section>

          <section className="legal-secao legal-destaque">
            <h2><span className="legal-num">12.</span> Contato</h2>
            <p>
              Para dúvidas, solicitações ou para exercer seus direitos relativos aos seus dados
              pessoais, fale com a gente pelo e-mail{" "}
              <a href={`mailto:${CONTATO_EMAIL}`}>{CONTATO_EMAIL}</a>.
            </p>
          </section>

          <a className="legal-voltar" href="/">← Voltar ao início</a>
        </article>
      </main>

      <Footer />
    </>
  );
}
