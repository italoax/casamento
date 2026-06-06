import type * as React from "react";

export function GiftsSection() {
  return (
    <section id="presentes" className="secao-conteudo secao-aparecer">
    <div className="container">
    <h2
    id="titulo-presentes"
    className="cascata-item"
    style={{ "--delay": "0s" } as React.CSSProperties}
    ></h2>
    <div
    className="divisor-rd cascata-item"
    style={{ margin: "1rem auto 3rem", "--delay": "0.15s" } as React.CSSProperties}
    ></div>
    <p
    id="intro-presentes"
    className="intro-secao cascata-item"
    style={{ "--delay": "0.3s" } as React.CSSProperties}
    ></p>
    
    {/* ========= CARRINHO FIXO (CONTAINER UNICO) ========= */}
    <section
    id="carrinho-fixo"
    className="estilo-carrinho-fixo cascata-item"
    style={{ "--delay": "0.45s" } as React.CSSProperties}
    >
    {/* Conteudo gerenciado pelo JavaScript */}
    </section>
    
    {/* Filtros de Ordenação */}
    <div className="controles-presentes cascata-item" style={{ "--delay": "0.6s" } as React.CSSProperties}>
    <button
    id="btn-resumo-carrinho"
    className="carrinho-resumo"
    type="button"
    >
    <svg
    className="carrinho-icone"
    viewBox="0 0 24 24"
    aria-hidden="true"
    >
    <path
    d="M6 6h14l-1.5 7.5H8.2L7 4H3"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    />
    <circle cx="9" cy="19" r="1.6" fill="currentColor" />
    <circle cx="17" cy="19" r="1.6" fill="currentColor" />
    </svg>
    <span id="texto-carrinho-resumo">Carrinho vazio</span>
    </button>
    <div className="ordenacao-presentes">
    <label
    id="label-ordenar-presentes"
    htmlFor="ordenar-presentes"
    ></label>
    <select id="ordenar-presentes" className="selecao-formulario">
    <option value="az"></option>
    <option value="menor-preco"></option>
    <option value="maior-preco"></option>
    </select>
    </div>
    </div>
    
    {/* Lista de presentes dinâmica */}
    <div className="lista-presentes cascata-item" style={{ "--delay": "0.75s" } as React.CSSProperties}>
    <p className="lista-presentes__feedback">Carregando presentes...</p>
    </div>
    <div
    className="container-carregar-mais cascata-item"
    style={{ "--delay": "0.9s" } as React.CSSProperties}
    >
    <button
    id="carregar-mais-presentes"
    className="botao botao-secundario"
    style={{ cursor: "pointer" }}
    ></button>
    </div>
    </div>
    </section>
  );
}
