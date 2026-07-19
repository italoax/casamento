import type * as React from "react";

export function Footer() {
  return (
    <>
    <footer className="rodape-principal secao-aparecer">
    <div className="container rodape-container">
    <div className="rodape-topo cascata-item" style={{ "--delay": "0s" } as React.CSSProperties}>
    <div className="rodape-bloco rodape-identidade">
    <h3 id="rodape-nomes" className="rodape-nomes">Emanuelle &amp; &Iacute;talo</h3>
    </div>
    <div className="rodape-bloco rodape-links">
    <div id="rodape-nav" className="nav-rodape">
    <a href="/termos-de-uso">Termos de uso</a>
    <a href="/politica-de-privacidade">Pol&iacute;tica de privacidade</a>
    </div>
    </div>
    </div>
    <div className="rodape-payments cascata-item" style={{ "--delay": "0.15s" } as React.CSSProperties}>
    <img className="rodape-payments-img" src="/img/icones/payments.webp" alt="Formas de pagamento aceitas" loading="lazy" decoding="async" draggable="false" />
    </div>
    <p id="rodape-credito" className="credito-rodape credito-rodape--destaque cascata-item" style={{ "--delay": "0.22s" } as React.CSSProperties}>&copy; 2026 - Desenvolvido por &Iacute;talo Xavier</p>
    <div className="rodape-base cascata-item" style={{ "--delay": "0.3s" } as React.CSSProperties}>
    <span className="recaptcha-info">Protegido por Cloudflare Turnstile &middot; <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener">Privacidade</a></span>
    </div>
    </div>
    </footer>
    
    <button
    id="btn-topo-mobile"
    className="btn-topo-mobile"
    type="button"
    aria-label="Voltar ao topo"
    aria-hidden="true"
    >
    <span aria-hidden="true">&#8593;</span>
    </button>
    </>
  );
}
