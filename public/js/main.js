/**
 * MAIN.JS - Script Principal do Site
 * 
 * Responsável por:
 * - Inicializar o site
 * - Gerenciar modais de pagamento
 * - Coordenar fluxo de checkout (PIX, cartão)
 * - Tratamento de erros e feedback
 * - Atalhos de teclado
 */

// Imports de módulos core
import { inicializarLoggerGlobal } from "./core/logger.js";
import { iniciar } from "./core/init.js";
import { fecharModalAtivoComEscape, bloquearScrollModal, liberarScrollModal } from "./core/modals.js";

// Imports de utils
import { versionarImagemUrl } from "./utils/assets.js";

// Imports de UI e navegação
import { marcarRetornoModalPagamento, limparRetornoModalPagamento } from "./ui/navigation.js";

// Imports de carrinho e checkout
import { limparCarrinhoPersistido } from "./cart/cart.js";
import { limparCheckoutPersistido } from "./cart/checkout.js";

// Imports de pagamento
import { limparPixFormulario } from "./payment/pix.js";
import { limparCartaoFormulario, traduzirErroMpCartao } from "./payment/cartao.js";
import "./payment/logging.js";

// Configuração global
const siteConfig = window.siteConfig;

// ============================================
// INICIALIZAÇÃO GLOBAL
// ============================================

inicializarLoggerGlobal();

// ============================================
// ESTADO GLOBAL
// ============================================

const retornoPagamentoKey = "retornoModalPagamento";
const formasPagamento = siteConfig.pagamento.formas || [];
let opcaoPagamentoSelecionada = "pix"; // Seleção atual no modal

function definirOpcaoPagamentoSelecionada(opcao) {
  opcaoPagamentoSelecionada = opcao || "pix";
}

window.definirOpcaoPagamentoSelecionada = definirOpcaoPagamentoSelecionada;

/**
 * Limpa todos os dados de pagamento persistidos no localStorage
 * Chamado ao fechar modal de pagamento
 */
function limparDadosPagamento() {
  limparCarrinhoPersistido();
  limparCheckoutPersistido();
  limparPixFormulario();
  limparCartaoFormulario();
}

window.limparDadosPagamento = limparDadosPagamento;

// ============================================
// FUNÇÕES DE MODAL DE PAGAMENTO
// ============================================

/**
 * Cria o HTML do modal com as opções de pagamento
 */
function criarHTMLModalPagamento() {
  return `
    <div class="modal-pagamento-box">
      <button type="button" id="btn-fechar-modal-pagamento" class="btn-fechar-modal" aria-label="${siteConfig.ui.fecharAria}">&times;</button>
      <h3>${siteConfig.pagamento.titulo}</h3>
      <div class="modal-pagamento-grid">
        ${formasPagamento.map(forma => criarCardPagamento(forma)).join("")}
      </div>
    </div>
  `;
}

/**
 * Cria o HTML de um card de forma de pagamento
 */
function criarCardPagamento(forma) {
  const ativo = forma.id === opcaoPagamentoSelecionada ? "ativo" : "";
  const temBadge = forma.badge ? "tem-badge" : "";
  const recomendado = forma.recomendado ? "recomendado" : "";
  const imagemPix = forma.id === "pix" ? `<img class="modal-pagamento-logo-inline" src="${versionarImagemUrl("img/icones/pix-logo.webp")}" alt="" aria-hidden="true">` : "";
  const bandeiras = forma.id === "cartao" ? `
    <div class="modal-pagamento-bandeiras" aria-hidden="true">
      <img src="${versionarImagemUrl("img/bandeiras/visa.webp")}" alt="Visa">
      <img src="${versionarImagemUrl("img/bandeiras/mastercard.webp")}" alt="Mastercard">
      <img src="${versionarImagemUrl("img/bandeiras/amex.webp")}" alt="Amex">
      <img src="${versionarImagemUrl("img/bandeiras/elo.webp")}" alt="Elo">
      <img src="${versionarImagemUrl("img/bandeiras/hipercard.webp")}" alt="Hipercard">
    </div>
  ` : "";
  const badge = forma.badge ? `<span class="modal-pagamento-badge">${forma.badge}</span>` : "";

  return `
    <button type="button" class="modal-pagamento-card ${ativo} ${temBadge} ${recomendado}" data-opcao="${forma.id}">
      ${badge}
      <strong class="modal-pagamento-label">
        ${imagemPix}${forma.label}
      </strong>
      <p>${forma.subtitle}</p>
      ${bandeiras}
    </button>
  `;
}

/**
 * Atualiza seleção de forma de pagamento e UI
 */
function atualizarSelecaoPagamento(opcao) {
  definirOpcaoPagamentoSelecionada(opcao);
  const overlay = document.getElementById("modal-pagamento-overlay");
  if (!overlay) return;

  // Atualiza estado visual dos cards
  overlay.querySelectorAll(".modal-pagamento-card").forEach(card => {
    card.classList.toggle("ativo", card.dataset.opcao === opcao);
  });
}

/**
 * Configura event listeners do modal de pagamento
 */
function configurarListenersModal(overlay) {
  const fecharOverlay = () => {
    overlay.remove();
    liberarScrollModal();
    limparRetornoModalPagamento();
  };

  // Botão fechar
  const btnFechar = overlay.querySelector("#btn-fechar-modal-pagamento");
  if (btnFechar) {
    btnFechar.addEventListener("click", fecharOverlay);
  }

  // Cards de pagamento
  overlay.querySelectorAll(".modal-pagamento-card").forEach(card => {
    card.addEventListener("click", () => {
      atualizarSelecaoPagamento(card.dataset.opcao);
      seguirFluxoPagamento(fecharOverlay);
    });
  });
}

/**
 * Segue o fluxo da forma de pagamento selecionada
 */
function seguirFluxoPagamento(callback) {
  if (opcaoPagamentoSelecionada === "pix") {
    callback();
    window.mostrarFormularioPix();
  } else if (opcaoPagamentoSelecionada === "cartao") {
    callback();
    window.mostrarFormularioCartao();
  } else {
    mostrarFeedbackCheckout(siteConfig.pagamento.avisoIndisponivel, "aviso");
  }
}

/**
 * Mostra o modal de seleção de forma de pagamento
 */
window.mostrarModalPagamento = function mostrarModalPagamento() {
  mostrarFeedbackCheckout("");
  definirOpcaoPagamentoSelecionada("pix"); // Reseta para PIX como padrão
  
  // Não mostra duas vezes
  if (document.getElementById("modal-pagamento-overlay")) return;

  marcarRetornoModalPagamento();

  // Cria overlay e modal
  const overlay = document.createElement("div");
  overlay.id = "modal-pagamento-overlay";
  overlay.className = "modal-pagamento-overlay";
  overlay.style.display = "flex";
  overlay.innerHTML = criarHTMLModalPagamento();

  document.body.appendChild(overlay);
  bloquearScrollModal();

  configurarListenersModal(overlay);
};

// ============================================
// FUNÇÕES DE FEEDBACK E VALIDAÇÃO
// ============================================

/**
 * Mostra feedback/erro no checkout
 * Também mapeia erros de validação de cartão para campos específicos
 */
function mostrarFeedbackCheckout(mensagem, tipo = "erro") {
  const codigo = String(mensagem || "").trim().split(" ")[0];
  const traducao = traduzirErroMpCartao(mensagem);
  const temCartao = !!document.getElementById("cartao-numero");

  // Mapeia erros de cartão para campos de formulário
  if (temCartao) {
    const mapaCampo = {
      Invalid_card_number_length: "cartao-numero",
      invalid_card_number_length: "cartao-numero",
      invalid_card_number: "cartao-numero",
      Invalid_card_number: "cartao-numero",
      card_number_required: "cartao-numero",
      card_number_invalid: "cartao-numero",
      invalid_expiration_date: "cartao-validade",
      Invalid_expiration_date: "cartao-validade",
      expiration_date_required: "cartao-validade",
      invalid_security_code: "cartao-cvv",
      Invalid_security_code: "cartao-cvv",
      security_code_required: "cartao-cvv",
      invalid_card_token_id: "cartao-numero",
      Invalid_card_token_id: "cartao-numero",
      "Falha ao tokenizar o cartão.": "cartao-numero"
    };

    const campo = mapaCampo[codigo];
    if (campo && traducao) {
      window.mostrarErroCampo(campo, traducao);
    }
  }

  // Encontra elemento de feedback (pode estar em modal aberto ou na página)
  const modais = document.querySelectorAll(".modal-pagamento-overlay");
  const modal = modais.length ? modais[modais.length - 1] : null;
  const modalFeedback = modal ? modal.querySelector(".feedback-checkout-modal") : null;
  const feedback = modalFeedback || document.getElementById("feedback-checkout");

  if (!feedback) return;

  if (!mensagem) {
    feedback.style.display = "none";
    feedback.textContent = "";
    return;
  }

  // Não mostra erros de tokenização genéricos
  if ((traducao || mensagem) === "Falha ao tokenizar o cartão.") {
    feedback.style.display = "none";
    feedback.textContent = "";
    return;
  }

  feedback.style.display = "block";
  feedback.style.color = tipo === "erro" ? "#d54c7c" : "var(--cor-secundaria,#7a5a45)";
  feedback.textContent = traducao || mensagem;
}

window.mostrarFeedbackCheckout = mostrarFeedbackCheckout;

/**
 * Mostra erro em um campo específico do formulário
 */
window.mostrarErroCampo = function mostrarErroCampo(inputId, mensagem) {
  const input = document.getElementById(inputId);
  if (input) input.classList.add("entrada-erro");

  const erro = document.getElementById(`erro-${inputId}`);
  if (erro) {
    erro.textContent = mensagem;
    erro.classList.remove("oculto");
  }
};

/**
 * Limpa erro de um campo específico
 */
window.limparErroCampo = function limparErroCampo(inputId) {
  const input = document.getElementById(inputId);
  if (input) input.classList.remove("entrada-erro");

  const erro = document.getElementById(`erro-${inputId}`);
  if (erro) {
    erro.textContent = "";
    erro.classList.add("oculto");
  }

  // Limpa feedback geral também
  if (inputId === "nome-checkout" || inputId === "mensagem-checkout") {
    mostrarFeedbackCheckout("");
  }
};

/**
 * Valida se nome tem pelo menos 2 palavras (nome completo)
 */
window.validarNomeCompleto = function validarNomeCompleto(nome = "") {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return partes.length >= 2;
};

// ============================================
// INICIALIZAÇÃO DO DOCUMENTO
// ============================================

/**
 * Inicia o site quando o DOM estiver pronto
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}

// ============================================
// EVENT LISTENERS GLOBAIS
// ============================================

/**
 * Atalhos de teclado
 * - ESC: fecha modal ativo
 * - ALT+SHIFT+C: abre formulário de cartão (debug)
 */
document.addEventListener("keydown", event => {
  if (event.defaultPrevented) return;

  // ESC fecha modal
  if (event.key === "Escape" || event.key === "Esc") {
    if (fecharModalAtivoComEscape()) {
      event.preventDefault();
      return;
    }
  }

  // Ignora atalhos se em campo editável
  const target = event.target;
  const isEditable = target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
  if (isEditable) return;

  // ALT+SHIFT+C: abre formulário de cartão (debug)
  if (event.altKey && event.shiftKey && event.key.toLowerCase() === "c") {
    event.preventDefault();
    if (typeof window.mostrarFormularioCartao === "function") {
      window.mostrarFormularioCartao();
    }
  }
});

/**
 * Previne drag and drop (segurança)
 */
document.addEventListener("dragstart", event => {
  event.preventDefault();
});
