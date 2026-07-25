/**
 * Página de agradecimento — o site inteiro na fase "encerrado".
 *
 * Substitui a home por completo (sem cabeçalho, seções ou rodapé de navegação):
 * passados os dias configurados, presentes/RSVP/recados não fazem mais sentido,
 * e deixar links quebrados ou um carrinho de compras no ar seria pior que nada.
 *
 * Os textos vêm da aba "Fases do Evento" do painel — os mesmos da fase
 * "agradecimento", para a mensagem não precisar ser escrita duas vezes.
 */
export function ThanksPage({ titulo, mensagem }: { titulo: string; mensagem: string }) {
  return (
    <div id="site-root" className="pagina-agradecimento">
      <main className="agradecimento-conteudo">
        <div className="agradecimento-moldura">
          <span className="agradecimento-monograma" aria-hidden="true">E &amp; Í</span>
          <p className="agradecimento-rotulo">Emanuelle + Ítalo</p>
          <h1 className="agradecimento-titulo">{titulo}</h1>
          <div className="agradecimento-divisor" aria-hidden="true"></div>
          <p className="agradecimento-mensagem">{mensagem}</p>
          <p className="agradecimento-data">16 . 08 . 2026</p>
        </div>
      </main>
    </div>
  );
}
