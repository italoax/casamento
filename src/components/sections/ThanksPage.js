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
import { AlbumGallery } from "./AlbumGallery";

export function ThanksPage({ titulo, mensagem }) {
    return (<div id="site-root" className="pagina-agradecimento">
      <main className="agradecimento-conteudo">
        <div className="agradecimento-moldura">
          <span className="agradecimento-monograma" aria-hidden="true">E &amp; Í</span>
          <p className="agradecimento-rotulo">Emanuelle + Ítalo</p>
          <h1 className="agradecimento-titulo">{titulo}</h1>
          <div className="agradecimento-divisor" aria-hidden="true"></div>
          <p className="agradecimento-mensagem">{mensagem}</p>
          <p className="agradecimento-data">16 . 08 . 2026</p>
        </div>
        <section className="agradecimento-album" aria-labelledby="agradecimento-album-titulo">
          <p className="agradecimento-album-rotulo">O nosso dia, para sempre</p>
          <h2 id="agradecimento-album-titulo" className="agradecimento-album-titulo">Memórias que ficam</h2>
          <p className="agradecimento-album-instrucao">Cada foto, um pedacinho desse dia. Toque para ver de perto.</p>
          <AlbumGallery />
          <a className="agradecimento-album-link" href="https://adobe.ly/4dAcyd1" target="_blank" rel="noopener noreferrer">
            Ver todas as fotos <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>
    </div>);
}
