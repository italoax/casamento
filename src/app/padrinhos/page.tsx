/* eslint-disable @next/next/no-css-tags */
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Manual dos Padrinhos | Emanuelle & Ítalo",
  description: "Manual dos padrinhos e madrinhas do casamento de Emanuelle e Ítalo.",
};

export default function ManualDosPadrinhosPage() {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Playfair+Display:wght@500;600&family=Inter:wght@400;500;600&family=Great+Vibes&display=swap"
        rel="stylesheet"
      />
      <link rel="stylesheet" href="/padrinhos/style.css" />
      <link rel="stylesheet" href="/css/03-rodape-responsivo-animacoes.css" />
      <div id="pre-carregamento">
      <div className="coracao-pre-carregamento"></div>
      </div>
      <main className="pagina">
      <section id="inicio" className="hero secao-aparecer">
      <div className="container hero-inner">
      <div className="hero-titulo">
      <h1>MANUAL DOS PADRINHOS</h1>
      <p className="subtexto">Criamos este manual com carinho para orientar o traje e detalhes do grande dia.</p>
      <div className="hero-faixa">Emanuelle & Ítalo</div>
      </div>
      <div className="contagem" aria-live="polite">
      <div className="contagem-titulo">Contagem regressiva</div>
      <div className="contagem-grid">
      <div className="contagem-item">
      <strong id="cd-dias">0</strong>
      <span>Dias</span>
      </div>
      <div className="contagem-item">
      <strong id="cd-horas">0</strong>
      <span>Horas</span>
      </div>
      <div className="contagem-item">
      <strong id="cd-minutos">0</strong>
      <span>Minutos</span>
      </div>
      <div className="contagem-item">
      <strong id="cd-segundos">0</strong>
      <span>Segundos</span>
      </div>
      </div>
      </div>
      </div>
      </section>
      
      <div className="container manual-acoes-wrap">
      <div className="manual-acoes">
      <a className="manual-botao manual-botao--primario" href="/#confirmacao">
      Confirmar Presença
      </a>
      <a className="manual-botao manual-botao--secundario" href="/#presentes">
      Lista de Presentes
      </a>
      </div>
      </div>
      
      <section id="data" className="secao secao-aparecer">
      <div className="container">
      <div className="secao-topo">
      <h2>Save the date</h2>
      <p className="intro">Nosso grande dia está marcado. Contamos com você!</p>
      <div className="divisor"></div>
      </div>
      <div className="cartao-data destaque-sombra">
      <div className="cartao-data__evento">
      <h3>Data do casamento</h3>
      <p className="data">16 de agosto de 2026</p>
      <p className="hora">15:30</p>
      <p className="local local-nome">Espaço Hotel Fazenda Pouso Real</p>
      <p className="local local-endereco">Rua Juscelino Kubitscheck, 1000 - Jaboticatubas, MG</p>
      <a
      className="local-mapa"
      href="https://www.google.com/maps/dir/?api=1&destination=Rua%20Juscelino%20Kubitscheck%2C%201000%20-%20Jaboticatubas%2C%20MG%2C%2035830-000%2C%20Brasil"
      target="_blank"
      rel="noopener"
      >
      Ver no mapa
      </a>
      </div>
      <div className="calendario">
      <div className="linha dias">
      <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
      </div>
      <div className="linha"><span></span><span></span><span></span><span></span><span></span><span></span><span>01</span></div>
      <div className="linha"><span>02</span><span>03</span><span>04</span><span>05</span><span>06</span><span>07</span><span>08</span></div>
      <div className="linha"><span>09</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span><span>15</span></div>
      <div className="linha"><span className="marcado">16</span><span>17</span><span>18</span><span>19</span><span>20</span><span>21</span><span>22</span></div>
      <div className="linha"><span>23</span><span>24</span><span>25</span><span>26</span><span>27</span><span>28</span><span>29</span></div>
      <div className="linha"><span>30</span><span>31</span><span></span><span></span><span></span><span></span><span></span></div>
      </div>
      </div>
      </div>
      </section>
      
      <section id="madrinha" className="secao secao-aparecer">
      <div className="container">
      <div className="secao-topo">
      <h2>Querida Madrinha</h2>
      <p className="intro">Queremos que você se sinta linda e confortável no nosso grande dia.</p>
      <div className="divisor"></div>
      </div>
      <p className="texto-centro">Vestido no modelo de sua preferência na cor azul serenity.</p>
      <div className="grid">
      <div className="madrinha-stack">
      <div className="paleta simples">
      <div className="item">
      <span style={{ "--cor": "#92A8D1" } as React.CSSProperties}></span>
      <small>Azul serenity</small>
      </div>
      </div>
      <div className="madrinha-fotos" aria-label="Inspirações de vestidos para madrinhas">
      <div className="madrinha-fotos-track">
      <img src="/img/manual/img01.webp" alt="Inspiração de vestido para madrinha 1" loading="lazy" />
      <img src="/img/manual/img02.webp" alt="Inspiração de vestido para madrinha 2" loading="lazy" />
      <img src="/img/manual/img03.webp" alt="Inspiração de vestido para madrinha 3" loading="lazy" />
      <img src="/img/manual/img04.webp" alt="Inspiração de vestido para madrinha 4" loading="lazy" className="ajuste-baixo" />
      <img src="/img/manual/img01.webp" alt="Inspiração de vestido para madrinha 1" loading="lazy" />
      <img src="/img/manual/img02.webp" alt="Inspiração de vestido para madrinha 2" loading="lazy" />
      <img src="/img/manual/img03.webp" alt="Inspiração de vestido para madrinha 3" loading="lazy" />
      <img src="/img/manual/img04.webp" alt="Inspiração de vestido para madrinha 4" loading="lazy" className="ajuste-baixo" />
      </div>
      </div>
      </div>
      <div className="bloco-info">
      <h3>Azul serenity</h3>
      <p>Cor oficial das madrinhas. Use exatamente esse tom.</p>
      <div className="manual-links">
      <p className="manual-links__titulo">Opção para aluguel de vestido</p>
      <a className="manual-link-card" href="https://www.instagram.com/flaviamurtanoivas?igsh=YTAxd3RzZTdqZ25m" target="_blank" rel="noopener">
      Flávia Murta Noivas
      </a>
      </div>
      </div>
      </div>
      </div>
      </section>
      
      <section id="padrinho" className="secao secao-aparecer">
      <div className="container">
      <div className="secao-topo">
      <h2>Querido Padrinho</h2>
      <p className="intro">Queremos que você se sinta elegante e confortável no nosso grande dia.</p>
      <div className="divisor"></div>
      </div>
      <p className="texto-centro">Gostaríamos que usasse a gravata azul serenity, juntamente com um terno grafite.</p>
      <div className="grid">
      <div className="padrinho-stack">
      <div className="paleta simples">
      <div className="item">
      <span style={{ "--cor": "#808080" } as React.CSSProperties}></span>
      <small>Terno grafite</small>
      </div>
      <div className="item">
      <span style={{ "--cor": "#92A8D1" } as React.CSSProperties}></span>
      <small>Gravata azul serenity</small>
      </div>
      <div className="item">
      <span style={{ "--cor": "#ffffff" } as React.CSSProperties}></span>
      <small>Camisa branca</small>
      </div>
      <div className="item">
      <span style={{ "--cor": "#ffffff" } as React.CSSProperties}></span>
      <small>Tênis branco</small>
      </div>
      </div>
      <div className="padrinho-fotos" aria-label="Inspirações de trajes para padrinhos">
      <div className="padrinho-fotos-track">
      <img src="/img/manual/img05.webp" alt="Inspiração de traje para padrinho 1" loading="lazy" />
      <img src="/img/manual/img06.webp" alt="Inspiração de traje para padrinho 2" loading="lazy" />
      <img src="/img/manual/img07.webp" alt="Inspiração de traje para padrinho 3" loading="lazy" />
      <img src="/img/manual/img08.webp" alt="Inspiração de traje para padrinho 4" loading="lazy" />
      <img src="/img/manual/img09.webp" alt="Inspiração de traje para padrinho 5" loading="lazy" />
      <img src="/img/manual/img05.webp" alt="Inspiração de traje para padrinho 1" loading="lazy" />
      <img src="/img/manual/img06.webp" alt="Inspiração de traje para padrinho 2" loading="lazy" />
      <img src="/img/manual/img07.webp" alt="Inspiração de traje para padrinho 3" loading="lazy" />
      <img src="/img/manual/img08.webp" alt="Inspiração de traje para padrinho 4" loading="lazy" />
      <img src="/img/manual/img09.webp" alt="Inspiração de traje para padrinho 5" loading="lazy" />
      </div>
      </div>
      </div>
      <div className="bloco-info">
      <h3>Gravata azul serenity</h3>
      <p>Os padrinhos devem providenciar a gravata azul serenity. Combine com camisa branca e terno grafite.</p>
      <div className="manual-links">
      <p className="manual-links__titulo">Compra da gravata</p>
      <a className="manual-link-card" href="https://s.shopee.com.br/20s5hlW31U?share_channel_code=1" target="_blank" rel="noopener">
      Comprar gravata
      </a>
      </div>
      <div className="manual-links">
      <p className="manual-links__titulo">Opção para aluguel de terno</p>
      <a className="manual-link-card" href="https://www.instagram.com/viaternos?igsh=MTR5MXJyb3NhN2podA==" target="_blank" rel="noopener">
      Via Ternos
      </a>
      </div>
      </div>
      </div>
      </div>
      </section>
      
      <section id="dicas" className="secao secao-aparecer">
      <div className="container">
      <div className="secao-topo">
      <h2>Dicas para o grande dia</h2>
      <div className="divisor"></div>
      </div>
      <div className="lista-dicas">
      <div className="dica">
      <div>
      <h3><span className="icone" aria-hidden="true"><img src="/padrinhos/img/img01.png" alt="" loading="lazy" decoding="async" /></span>Chegue cedo</h3>
      <p>Chegue com 30 minutos de antecedência. Assim garantimos que tudo comece no horário.</p>
      </div>
      </div>
      <div className="dica">
      <div>
      <h3><span className="icone" aria-hidden="true"><img src="/padrinhos/img/img02.png" alt="" loading="lazy" decoding="async" /></span>Registre o momento</h3>
      <p>Registre muitos momentos e nos ajude a eternizar esse dia especial.</p>
      </div>
      </div>
      </div>
      </div>
      </section>
      </main>
      
      <footer className="rodape-principal secao-aparecer">
      <div className="container rodape-container">
      <div className="rodape-topo cascata-item" style={{ "--delay": "0s" } as React.CSSProperties}>
      <div className="rodape-bloco rodape-identidade">
      <h3 id="rodape-nomes" className="rodape-nomes">Emanuelle &amp; Ítalo</h3>
      </div>
      <div className="rodape-bloco rodape-links">
      <div id="rodape-nav" className="nav-rodape">
      <a href="/termos-de-uso">Termos de uso</a>
      <a href="/politica-de-privacidade">Política de privacidade</a>
      </div>
      </div>
      </div>
      <div className="rodape-payments cascata-item" style={{ "--delay": "0.15s" } as React.CSSProperties}>
      <img className="rodape-payments-img" src="/img/icones/payments.webp" alt="Formas de pagamento aceitas" loading="lazy" decoding="async" draggable="false" />
      </div>
      <p id="rodape-credito" className="credito-rodape credito-rodape--destaque cascata-item" style={{ "--delay": "0.22s" } as React.CSSProperties}>&copy; 2026 - Desenvolvido por Ítalo Xavier</p>
      <div className="rodape-base cascata-item" style={{ "--delay": "0.3s" } as React.CSSProperties}>
      <span className="recaptcha-info">Protegido por reCAPTCHA &middot; <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Privacidade</a> &middot; <a href="https://policies.google.com/terms" target="_blank" rel="noopener">Termos</a></span>
      </div>
      </div>
      </footer>
      <Script src="/padrinhos/app.js" strategy="afterInteractive" />
    </>
  );
}
