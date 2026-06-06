import type * as React from "react";

export function RsvpSection() {
  return (
    <section
    id="confirmacao"
    className="secao-conteudo secao-aparecer"
    style={{ backgroundColor: "var(--cor-superficie)" }}
    >
    <div className="container">
    <h2
    id="titulo-confirmacao"
    className="titulo-confirmacao cascata-item"
    style={{ "--delay": "0s" } as React.CSSProperties}
    ></h2>
    <div
    className="divisor-rd cascata-item"
    style={{ margin: "1rem auto 2rem", "--delay": "0.15s" } as React.CSSProperties}
    ></div>
    <p
    id="intro-confirmacao"
    className="intro-secao cascata-item"
    style={{ "--delay": "0.3s" } as React.CSSProperties}
    ></p>
    
    {/* Card de Pesquisa */}
    <div
    className="cartao-busca-confirmacao cascata-item"
    style={{ "--delay": "0.45s" } as React.CSSProperties}
    >
    <div id="area-busca">
    <div className="grupo-formulario">
    <label
    id="label-nome-convite"
    htmlFor="nome-convite"
    className="rotulo-confirmacao"
    ></label>
    <input
    type="text"
    id="nome-convite"
    className="entrada-confirmacao"
    placeholder=""
    />
    </div>
    <button
    id="btn-buscar-convite"
    className="botao-pilula-destaque"
    ></button>
    <p id="rsvp-disponibilidade-prazo" className="rsvp-disponibilidade-prazo oculto"></p>
    
    {/* Lista de Resultados */}
    <ul
    id="lista-resultados-confirmacao"
    className="resultados-confirmacao oculto"
    ></ul>
    
    {/* Mensagens de Feedback */}
    <div
    id="feedback-confirmacao"
    className="feedback-confirmacao oculto"
    ></div>
    </div>
    
    {/* Área de Confirmação (Inline) */}
    <div id="area-processo-confirmacao" className="oculto">
    <h3 id="titulo-confirmar-presenca"></h3>
    <p id="texto-confirmar-presenca"></p>
    <p
    id="nome-convidado-destaque"
    className="destaque-modal-confirmacao"
    ></p>
    
    {/* ETAPA 1: Validação de Segurança */}
    <div id="step-validacao">
    <p
    id="texto-validacao-telefone"
    style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1rem" }}
    ></p>
    <div className="grupo-formulario">
    <input
    type="tel"
    id="input-validacao-telefone"
    placeholder="Ex: 9999"
    maxLength={4}
    />
    </div>
    <div
    id="feedback-validacao"
    className="feedback-confirmacao oculto"
    style={{ marginBottom: "1rem" }}
    ></div>
    <button
    id="btn-validar-telefone"
    className="botao botao-primario"
    ></button>
    </div>
    
    {/* ETAPA 2: Seleção de Pessoas */}
    <div id="step-confirmacao" className="oculto">
    <div
    id="container-selecao-pessoas"
    className="campo-qtd-confirmacao"
    ></div>
    <div className="acoes-modal-confirmacao">
    <button
    id="btn-confirmar-presenca"
    className="botao botao-primario"
    ></button>
    </div>
    </div>
    
    <div style={{ marginTop: "1rem" }}>
    <button
    id="btn-cancelar-confirmacao"
    className="botao botao-secundario"
    ></button>
    </div>
    </div>
    </div>
    </div>
    </section>
  );
}
