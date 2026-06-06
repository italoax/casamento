import type * as React from "react";

export function EventSection() {
  return (
    <section
    id="grande-dia"
    className="secao-conteudo secao-aparecer secao-grande-dia"
    >
    <div className="container">
    <h2
    id="titulo-grande-dia"
    className="cascata-item"
    style={{ "--delay": "0s" } as React.CSSProperties}
    ></h2>
    <div
    className="divisor-rd cascata-item"
    style={{ margin: "1rem auto 3rem", "--delay": "0.15s" } as React.CSSProperties}
    ></div>
    <p
    id="intro-cerimonia"
    className="intro-secao cascata-item"
    style={{ "--delay": "0.3s" } as React.CSSProperties}
    ></p>
    <div
    id="galeria-cerimonia"
    className="galeria-cerimonia cascata-item"
    style={{ "--delay": "0.45s" } as React.CSSProperties}
    ></div>
    <div className="detalhes-evento cascata-item" style={{ "--delay": "0.6s" } as React.CSSProperties}>
    <div className="info-evento">
    <h3 id="subtitulo-grande-dia"></h3>
    
    <div className="item-evento">
    <div className="icone-evento">
    <svg viewBox="0 0 24 24">
    <path
    d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"
    />
    </svg>
    </div>
    <div className="texto-evento">
    <strong id="label-data-evento"></strong>
    <span id="data-evento"></span>
    </div>
    </div>
    
    <div className="item-evento">
    <div className="icone-evento">
    <svg viewBox="0 0 24 24">
    <path
    d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
    />
    </svg>
    </div>
    <div className="texto-evento">
    <strong id="label-horario-evento"></strong>
    <span id="horario-evento"></span>
    </div>
    </div>
    
    <div className="item-evento">
    <div className="icone-evento">
    <svg viewBox="0 0 24 24">
    <path
    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
    />
    </svg>
    </div>
    <div className="texto-evento">
    <strong id="label-local-evento"></strong>
    <span id="nome-local-evento"></span><br />
    <span
    id="endereco-local-evento"
    style={{ fontSize: "0.9em", opacity: "0.8" }}
    ></span>
    <div className="acao-local">
    <a
    id="link-local-evento"
    href="#"
    target="_blank"
    className="botao botao-secundario"
    ></a>
    </div>
    </div>
    </div>
    </div>
    {/* O title no iframe é importante para acessibilidade (leitores de tela) */}
    <div className="mapa-evento">
    <iframe
    id="mapa-iframe"
    width="100%"
    height="350"
    style={{ border: "0" }}
    allowFullScreen
    loading="lazy"
    referrerPolicy="no-referrer-when-downgrade"
    title="Mapa do local do evento"
    >
    </iframe>
    </div>
    </div>
    </div>
    </section>
  );
}
