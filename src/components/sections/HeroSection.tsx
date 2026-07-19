export function HeroSection() {
  // Conteúdo do hero renderizado já no HTML do servidor (não mais vazio + JS).
  // Isso faz o maior elemento da tela (o nome do casal) pintar de imediato,
  // derrubando o LCP no mobile. O content.js/atualizarHero continua rodando e
  // apenas re-escreve os MESMOS valores (sem piscada). A fonte canônica dos
  // dados segue sendo public/js/config.js (hero.* e dados.dataCasamento) —
  // se mudar nomes/data lá, atualize também este snapshot.
  return (
    <section id="inicio" className="destaque reserve-a-data">
    <div className="conteudo-destaque">
    <p className="rotulo-rd">SAVE THE DATE</p>
    <h1 className="titulo-destaque">Emanuelle + Ítalo</h1>
    <p className="data-destaque">16 . 08 . 2026</p>
    <div className="divisor-rd"></div>
    <p className="local-rd">MINAS GERAIS</p>
    <h2 className="titulo-contagem-hero">Contagem Regressiva</h2>
    <div id="contagem-regressiva" className="container-contagem">
    <div className="temporizador-contagem">
    <div className="cartao-contagem">
    <span id="dias">00</span><span className="rotulo">Dias</span>
    </div>
    <div className="cartao-contagem">
    <span id="horas">00</span><span className="rotulo">Horas</span>
    </div>
    <div className="cartao-contagem">
    <span id="minutos">00</span
    ><span className="rotulo">Minutos</span>
    </div>
    <div className="cartao-contagem">
    <span id="segundos">00</span
    ><span className="rotulo">Segundos</span>
    </div>
    </div>
    </div>
    <figure className="versiculo-hero">
    <blockquote className="versiculo-hero__texto">
    O amor &eacute; paciente, o amor &eacute; bondoso. O amor tudo sofre, tudo cr&ecirc;, tudo espera, tudo suporta.
    </blockquote>
    <figcaption className="versiculo-hero__ref">1 Cor&iacute;ntios 13:4</figcaption>
    </figure>
    </div>
    </section>
  );
}
