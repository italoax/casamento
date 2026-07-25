import { calcularFase, getEventoConfig, EVENTO_DEFAULTS } from "@/lib/evento-fases";

export async function HeroSection() {
  // Conteúdo do hero renderizado já no HTML do servidor (não mais vazio + JS).
  // Isso faz o maior elemento da tela (o nome do casal) pintar de imediato,
  // derrubando o LCP no mobile. O content.js/atualizarHero continua rodando e
  // apenas re-escreve os MESMOS valores (sem piscada). A fonte canônica dos
  // dados segue sendo public/js/config.js (hero.* e dados.dataCasamento) —
  // se mudar nomes/data lá, atualize também este snapshot.
  //
  // A fase do evento também vem do servidor: assim o bloco certo já nasce no
  // HTML e entra na MESMA cascata de animação dos demais elementos do topo.
  // (Revelar por JS depois da resposta da API deixava o texto fora do efeito.)
  // Falha de banco cai no padrão "contagem", que é o estado seguro.
  let config = EVENTO_DEFAULTS;
  try {
    config = await getEventoConfig();
  } catch {
    config = EVENTO_DEFAULTS;
  }
  const fase = calcularFase(config);
  const emContagem = fase === "contagem";
  // Na contagem, os elementos da fase nascem ocultos já preenchidos com o texto
  // de "acontecendo" (a próxima fase). O content.js reescreve na virada.
  const faseTitulo = fase === "agradecimento" ? config.agradecimentoTitulo : config.acontecendoTitulo;
  const faseMensagem = fase === "agradecimento" ? config.agradecimentoMensagem : config.acontecendoMensagem;

  return (
    <section id="inicio" className="destaque reserve-a-data">
    <div className="conteudo-destaque">
    <p className="rotulo-rd">SAVE THE DATE</p>
    <h1 className="titulo-destaque">Emanuelle + Ítalo</h1>
    <p className="data-destaque">16 . 08 . 2026</p>
    <div className="divisor-rd"></div>
    <p className="local-rd">MINAS GERAIS</p>
    <h2 id="titulo-contagem-hero" className="titulo-contagem-hero" hidden={!emContagem}>Contagem Regressiva</h2>
    <div id="contagem-regressiva" className="container-contagem" hidden={!emContagem}>
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
    {/* Irmãos diretos de .conteudo-destaque de propósito: é o que os coloca na
        cascata de animação do hero, com os mesmos atrasos escalonados. */}
    <h2 id="fase-evento-titulo" className="fase-evento__titulo" data-fase={fase} hidden={emContagem}>{faseTitulo}</h2>
    <p id="fase-evento-mensagem" className="fase-evento__mensagem" hidden={emContagem}>{faseMensagem}</p>
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
