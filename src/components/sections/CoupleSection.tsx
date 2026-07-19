import type * as React from "react";

export function CoupleSection() {
  return (
    <section id="o-casal" className="secao-conteudo secao-aparecer">
    <div className="container">
    <h2 id="titulo-casal" className="cascata-item" style={{ "--delay": "0s" } as React.CSSProperties}></h2>
    
    {/* Texto Romântico */}
    <div
    className="container-texto-casal cascata-item"
    style={{ "--delay": "0.3s" } as React.CSSProperties}
    >
    <p id="texto-casal" className="casal-texto"></p>
    </div>
    
    {/* Carrossel de Fotos */}
    <div className="carrossel-fotos cascata-item" style={{ "--delay": "0.45s" } as React.CSSProperties}>
    <div className="trilho-fotos"></div>
    <button
    className="seta-carrossel anterior"
    aria-label="Foto anterior"
    >
    &#10094;
    </button>
    <button className="seta-carrossel proxima" aria-label="Próxima foto">
    &#10095;
    </button>
    <div className="navegacao-bolinhas">
    {/* Bolinhas geradas via JS */}
    </div>
    </div>
    
    {/* Vídeo do Casal */}
    <div className="video-casal cascata-item" style={{ "--delay": "0.55s" } as React.CSSProperties}>
    <div className="video-player" data-video-player>
    <video playsInline preload="metadata" poster="/img/video-poster.webp">
    <source src="/video/video1-web.mp4" type="video/mp4" />
    Seu navegador não suporta vídeo.
    </video>
    <button className="video-play" type="button" aria-label="Reproduzir">
    <span aria-hidden="true"></span>
    </button>
    <div className="video-controls">
    <button
    className="video-toggle"
    type="button"
    aria-label="Reproduzir"
    ></button>
    <input
    className="video-range"
    type="range"
    min="0"
    max="100"
    defaultValue="0"
    step="0.1"
    aria-label="Progresso do vídeo"
    />
    <input
    className="video-volume"
    type="range"
    min="0"
    max="1"
    defaultValue="0.5"
    step="0.01"
    aria-label="Volume"
    />
    <span className="video-time" aria-label="Tempo do vídeo">0:00</span>
    </div>
    </div>
    </div>
    
    {/* 3. Timeline (Nossa História) */}
    <div
    id="container-linha-tempo"
    className="container-linha-tempo cascata-item"
    style={{ "--delay": "0.6s" } as React.CSSProperties}
    >
    <div
    className="linha-tempo-casal"
    aria-label="Linha do tempo do casal"
    >
    <div className="linha-tempo-item">
    <div className="linha-tempo-lado linha-tempo-lado--icone">
    <img
    className="linha-tempo-icone" loading="lazy" decoding="async" src="/img/linha-tempo/img1.webp"
    alt="Coração"
    />
    </div>
    <div className="linha-tempo-centro">
    <span className="linha-tempo-ponto"></span>
    </div>
    <div className="linha-tempo-lado linha-tempo-lado--texto">
    <h4>2021</h4>
    <p>n&oacute;s nos conhecemos</p>
    </div>
    </div>
    
    <div className="linha-tempo-item">
    <div className="linha-tempo-lado linha-tempo-lado--texto">
    <h4>16/09/2021</h4>
    <p>o primeiro beijo</p>
    </div>
    <div className="linha-tempo-centro">
    <span className="linha-tempo-ponto"></span>
    </div>
    <div className="linha-tempo-lado linha-tempo-lado--icone">
    <img
    className="linha-tempo-icone" loading="lazy" decoding="async" src="/img/linha-tempo/img2.webp"
    alt="Primeiro beijo"
    />
    </div>
    </div>
    
    <div className="linha-tempo-item">
    <div className="linha-tempo-lado linha-tempo-lado--icone">
    <img
    className="linha-tempo-icone" loading="lazy" decoding="async" src="/img/linha-tempo/img3.webp"
    alt="Pedido de namoro"
    />
    </div>
    <div className="linha-tempo-centro">
    <span className="linha-tempo-ponto"></span>
    </div>
    <div className="linha-tempo-lado linha-tempo-lado--texto">
    <h4>27/11/2021</h4>
    <p>o pedido de namoro</p>
    </div>
    </div>
    
    <div className="linha-tempo-item">
    <div className="linha-tempo-lado linha-tempo-lado--texto">
    <h4>01/01/2026</h4>
    <p>pedido de casamento</p>
    </div>
    <div className="linha-tempo-centro">
    <span className="linha-tempo-ponto"></span>
    </div>
    <div className="linha-tempo-lado linha-tempo-lado--icone">
    <img
    className="linha-tempo-icone" loading="lazy" decoding="async" src="/img/linha-tempo/img4.webp"
    alt="Pedido de casamento"
    />
    </div>
    </div>
    
    <div className="linha-tempo-item">
    <div className="linha-tempo-lado linha-tempo-lado--icone">
    <img
    className="linha-tempo-icone" loading="lazy" decoding="async" src="/img/linha-tempo/img5.webp"
    alt="Nosso grande dia"
    />
    </div>
    <div className="linha-tempo-centro">
    <span className="linha-tempo-ponto"></span>
    </div>
    <div className="linha-tempo-lado linha-tempo-lado--texto">
    <h4>16/08/2026</h4>
    <p className="linha-tempo-destaque">NOSSO GRANDE DIA!</p>
    </div>
    </div>
    
    <div className="linha-tempo-item linha-tempo-item--final">
    <div className="linha-tempo-lado linha-tempo-lado--texto">
    <p className="linha-tempo-final">
    E &Eacute; S&Oacute; O COME&Ccedil;O...
    </p>
    </div>
    <div className="linha-tempo-centro"></div>
    <div className="linha-tempo-lado"></div>
    </div>
    </div>
    </div>
    </div>
    </section>
  );
}
