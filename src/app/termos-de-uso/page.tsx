/* eslint-disable @next/next/no-css-tags */
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Termos de Uso | Emanuelle & Ítalo",
  description: "Termos de uso do site de casamento de Emanuelle e Ítalo: lista de presentes, pagamentos, confirmação de presença e recados.",
};

export default function TermosDeUsoPage() {
  // Configuráveis pelo .env (com fallback caso não estejam definidos).
  const CONTATO_EMAIL = env("LEGAL_CONTATO_EMAIL", "suporte@emanuelleitalo.com");
  const ULTIMA_ATUALIZACAO = env("LEGAL_ATUALIZACAO", "7 de junho de 2026");
  return (
    <>
      <link rel="stylesheet" href="/css/paginas-legais.css" />

      <main className="legal-pagina">
        <header className="legal-hero">
          <span className="legal-eyebrow">Documento oficial</span>
          <h1>Termos de Uso</h1>
          <div className="legal-nomes">Emanuelle &amp; Ítalo</div>
          <div className="legal-divisor" aria-hidden="true"></div>
          <span className="legal-atualizacao">Última atualização: {ULTIMA_ATUALIZACAO}</span>
        </header>

        <article className="legal-conteudo">
          <p className="legal-intro">
            Bem-vindo(a)! Este site foi criado para celebrar o casamento de Emanuelle e Ítalo. Ao
            acessá-lo e utilizar suas funcionalidades (como a lista de presentes, a confirmação de
            presença e o mural de recados), você concorda com os termos descritos abaixo. Leia com
            atenção; caso não concorde, pedimos que não utilize o site.
          </p>

          <section className="legal-secao">
            <h2><span className="legal-num">1.</span> Aceitação dos termos</h2>
            <p>
              Ao navegar, enviar dados ou realizar uma contribuição neste site, você declara ter
              lido, compreendido e aceitado integralmente estes Termos de Uso e a nossa{" "}
              <a href="/politica-de-privacidade">Política de Privacidade</a>. Estes termos podem ser
              atualizados a qualquer momento, e a versão vigente é sempre a publicada nesta página.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">2.</span> Sobre o site</h2>
            <p>
              Trata-se de um site pessoal e de caráter comemorativo, sem finalidade comercial ou
              lucrativa. Seu objetivo é compartilhar informações sobre o casamento e oferecer aos
              convidados meios práticos de participar do momento, incluindo:
            </p>
            <ul>
              <li>Visualização de informações do evento (data, local e orientações);</li>
              <li>Confirmação de presença (RSVP);</li>
              <li>Lista de presentes com a possibilidade de presentear os noivos;</li>
              <li>Envio de recados e mensagens de carinho.</li>
            </ul>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">3.</span> Informações fornecidas pelo usuário</h2>
            <p>
              Algumas funcionalidades exigem que você informe dados como nome, e-mail, telefone, CPF
              e endereço. Você é responsável pela veracidade e exatidão das informações fornecidas e
              concorda em mantê-las corretas e atualizadas. O tratamento desses dados é descrito na{" "}
              <a href="/politica-de-privacidade">Política de Privacidade</a>.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">4.</span> Lista de presentes e natureza da contribuição</h2>
            <p>
              Os itens exibidos na lista de presentes representam <strong>contribuições simbólicas
              aos noivos</strong>. Ao escolher um presente, você não está adquirindo um produto
              físico com entrega, mas sim realizando uma doação em valor correspondente ao item, como
              forma de carinho e apoio ao casal.
            </p>
            <p>
              Os valores e a disponibilidade dos itens podem ser alterados a qualquer momento. Em
              caso de indisponibilidade de um item já reservado, a reserva poderá ser liberada
              automaticamente.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">5.</span> Pagamentos</h2>
            <p>
              Os pagamentos são processados por meio de instituição financeira parceira (Asaas), que
              opera de forma segura e regulamentada. O site <strong>não armazena os dados completos
              do seu cartão de crédito</strong>; esses dados são tratados diretamente pelo provedor
              de pagamento.
            </p>
            <h3>Formas de pagamento</h3>
            <ul>
              <li><strong>Pix:</strong> confirmação geralmente imediata após o pagamento;</li>
              <li><strong>Cartão de crédito:</strong> com possibilidade de parcelamento, conforme as
              condições exibidas no momento da finalização.</li>
            </ul>
            <p>
              O QR Code Pix possui prazo de validade. Após esse prazo, sem o pagamento, a cobrança
              expira e um novo código deverá ser gerado.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">6.</span> Cancelamento e reembolso</h2>
            <p>
              Por se tratar de uma contribuição voluntária e de caráter pessoal aos noivos,{" "}
              <strong>as contribuições realizadas são, em regra, não reembolsáveis</strong>. Em
              situações excepcionais (como cobrança em duplicidade ou erro comprovado no
              processamento), entre em contato pelo e-mail informado ao final destes termos para que
              possamos avaliar o caso.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">7.</span> Confirmação de presença (RSVP)</h2>
            <p>
              A confirmação de presença é uma cortesia para ajudar na organização do evento. As
              informações enviadas serão utilizadas exclusivamente para esse fim. Pedimos que confirme
              somente dados verdadeiros e dentro do prazo eventualmente indicado no site.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">8.</span> Recados e mensagens</h2>
            <p>
              O mural de recados permite que você deixe mensagens de carinho. Para preservar um
              ambiente respeitoso, <strong>todos os recados passam por moderação</strong> antes de
              serem publicados. Reservamo-nos o direito de não publicar ou de remover mensagens que
              contenham conteúdo ofensivo, discriminatório, ilegal, propaganda, spam ou que violem
              direitos de terceiros.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">9.</span> Uso adequado</h2>
            <p>Ao utilizar o site, você concorda em não:</p>
            <ul>
              <li>Fornecer informações falsas ou de terceiros sem autorização;</li>
              <li>Tentar burlar mecanismos de segurança, sobrecarregar ou comprometer o
              funcionamento do site;</li>
              <li>Utilizar robôs, raspadores ou meios automatizados sem autorização;</li>
              <li>Praticar qualquer conduta ilícita, fraudulenta ou que prejudique outros usuários ou
              os noivos.</li>
            </ul>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">10.</span> Propriedade intelectual</h2>
            <p>
              Todo o conteúdo do site (textos, imagens, fotografias, identidade visual e layout) é
              de uso pessoal dos noivos e protegido pela legislação aplicável. É vedada a reprodução,
              distribuição ou utilização para fins comerciais sem autorização prévia.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">11.</span> Disponibilidade e responsabilidade</h2>
            <p>
              Empenhamo-nos para manter o site disponível e funcionando corretamente, mas ele é
              fornecido "no estado em que se encontra". Não garantimos disponibilidade ininterrupta e
              não nos responsabilizamos por falhas decorrentes de terceiros (como provedores de
              pagamento, hospedagem ou conexão de internet do usuário) ou por caso fortuito e força
              maior.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">12.</span> Proteção de dados</h2>
            <p>
              O tratamento dos seus dados pessoais é realizado conforme a Lei Geral de Proteção de
              Dados (Lei nº 13.709/2018) e detalhado na nossa{" "}
              <a href="/politica-de-privacidade">Política de Privacidade</a>, que integra estes
              Termos de Uso.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">13.</span> Alterações dos termos</h2>
            <p>
              Estes termos podem ser modificados a qualquer momento para refletir melhorias ou
              exigências legais. Recomendamos a consulta periódica desta página. O uso contínuo do
              site após eventuais alterações representa a concordância com a versão atualizada.
            </p>
          </section>

          <section className="legal-secao">
            <h2><span className="legal-num">14.</span> Legislação aplicável e foro</h2>
            <p>
              Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Fica
              eleito o foro do domicílio do usuário para dirimir quaisquer controvérsias decorrentes
              destes termos, conforme garantido pela legislação consumerista quando aplicável.
            </p>
          </section>

          <section className="legal-secao legal-destaque">
            <h2><span className="legal-num">15.</span> Contato</h2>
            <p>
              Em caso de dúvidas sobre estes Termos de Uso, fale com a gente pelo e-mail{" "}
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
