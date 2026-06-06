import type * as React from "react";

export function MessagesSection() {
  return (
    <section id="recados" className="secao-conteudo secao-aparecer">
    <div className="container">
    <h2 className="titulo-recados cascata-item" style={{ "--delay": "0s" } as React.CSSProperties}>
    Deixe seu recado
    </h2>
    <div
    className="divisor-rd cascata-item"
    style={{ margin: "1rem auto 2rem", "--delay": "0.15s" } as React.CSSProperties}
    ></div>
    
    <div className="cartao-recado cascata-item" style={{ "--delay": "0.3s" } as React.CSSProperties}>
    <form
    id="form-recado"
    className="form-recado"
    action="#"
    method="post"
    >
    <div className="grupo-recado">
    <label htmlFor="recado-nome">Seu nome</label>
    <input
    id="recado-nome"
    name="nome"
    type="text"
    className="entrada-recado"
    placeholder="Digite seu nome"
    maxLength={80}
    required
    />
    </div>
    <div className="grupo-recado">
    <label htmlFor="recado-email">Email</label>
    <input
    id="recado-email"
    name="email"
    type="email"
    className="entrada-recado"
    placeholder="Digite seu email"
    maxLength={120}
    required
    />
    </div>
    <div className="grupo-recado">
    <label htmlFor="recado-mensagem">Recado</label>
    <textarea
    id="recado-mensagem"
    name="mensagem"
    className="entrada-recado entrada-recado--textarea"
    placeholder="Escreva seu recado"
    rows={4}
    maxLength={600}
    required
    ></textarea>
    </div>
    <label className="termos-recado">
    <input id="recado-termos" type="checkbox" required />
    <span>
    Ao deixar um recado, declaro que tive acesso, li e
    concordo com os
    <a href="/termos-de-uso" target="_blank" rel="noopener"
    >Termos de uso</a
    >
    e
    <a
    href="/politica-de-privacidade"
    target="_blank"
    rel="noopener"
    >Política de Privacidade</a
    >.
    </span>
    </label>
    <p
    id="recado-feedback"
    className="feedback-recado"
    aria-live="polite"
    ></p>
    <div className="acoes-recado">
    <button
    id="btn-enviar-recado"
    type="submit"
    className="botao botao-primario"
    >
    Enviar recado
    </button>
    </div>
    </form>
    </div>
    
    <div
    id="lista-recados"
    className="lista-recados cascata-item"
    style={{ "--delay": "0.45s" } as React.CSSProperties}
    ></div>
    </div>
    </section>
  );
}
