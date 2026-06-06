export function HeroSection() {
  return (
    <section id="inicio" className="destaque reserve-a-data">
    <div className="conteudo-destaque">
    <p className="rotulo-rd"></p>
    <h1 className="titulo-destaque"></h1>
    <p className="data-destaque"></p>
    <div className="divisor-rd"></div>
    <p className="local-rd"></p>
    <h2 className="titulo-contagem-hero"></h2>
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
    <div className="botoes-destaque">
    <a
    id="btn-hero-primario"
    href="#confirmacao"
    className="botao botao-primario"
    ></a>
    <a
    id="btn-hero-secundario"
    href="#presentes"
    className="botao botao-secundario"
    ></a>
    </div>
    </div>
    </section>
  );
}
