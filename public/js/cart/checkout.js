import { versionarImagemUrl } from "../utils/assets.js";

import { formatarMoedaBR, arredondarMoeda } from "../utils/formatting.js";

import { bloquearScrollModal, liberarScrollModal } from "../core/modals.js";

import { carrinho, calcularTotalPresentes, renderizarCarrinho } from "./cart.js";

const siteConfig = window.siteConfig;

const checkoutState = {
  cartaoSelecionado: true,
  modeloCartao: "padrao",
  nome: "",
  mensagem: ""
};

window.checkoutState = checkoutState;

const checkoutStorageKey = "checkout_state";

function salvarCheckoutState() {
  try {
    localStorage.setItem(checkoutStorageKey, JSON.stringify(checkoutState));
  } catch (err) {}
}

function carregarCheckoutPersistido() {
  try {
    const checkoutSalvo = localStorage.getItem(checkoutStorageKey);
    if (checkoutSalvo) {
      const estado = JSON.parse(checkoutSalvo);
      if (estado && typeof estado === "object") {
        Object.assign(checkoutState, estado);
        window.checkoutState = checkoutState;
      }
    }
  } catch (err) {}
}

function limparCheckoutPersistido() {
  checkoutState.nome = "";
  checkoutState.mensagem = "";
  window.checkoutState = checkoutState;
  salvarCheckoutState();
  const nomeEl = document.getElementById("nome-checkout");
  if (nomeEl) {
    nomeEl.value = "";
    window.limparErroCampo("nome-checkout");
  }
  const mensagemEl = document.getElementById("mensagem-checkout");
  if (mensagemEl) {
    mensagemEl.value = "";
    if (typeof window.atualizarContador === "function") {
      window.atualizarContador(mensagemEl);
    } else {
      const contador = document.getElementById("contador");
      if (contador) contador.textContent = "0";
    }
    window.limparErroCampo("mensagem-checkout");
  }
}

function calcularCustoCartaoPersonalizado() {
  return checkoutState.cartaoSelecionado ? siteConfig.checkout.valorCartao : 0;
}

function calcularTotalFinal() {
  const totalPresentes = calcularTotalPresentes();
  const baseTotal = totalPresentes + calcularCustoCartaoPersonalizado();
  return arredondarMoeda(baseTotal);
}

function validarValorMinimoPagamento(total) {
  const minimo = Number(siteConfig.pagamento.valorMinimo || 0);
  if (!minimo || total >= minimo) return true;
  if (typeof window.mostrarFeedbackCheckout === "function") {
    window.mostrarFeedbackCheckout(siteConfig.pagamento.valorMinimoMsg || "Valor mínimo inválido.");
  }
  return false;
}

function irParaCheckout() {
  renderizarCheckout();
}

function renderizarCheckout() {
  const container = document.getElementById("carrinho-fixo");
  if (!container) return;
  const valorCartao = siteConfig.checkout.valorCartao;
  const totalPresentes = calcularTotalPresentes();
  const custoCartao = checkoutState.cartaoSelecionado ? valorCartao : 0;
  const totalFinal = totalPresentes + custoCartao;
  container.innerHTML = `\n    <div class="checkout-box">\n      <div class="checkout-layout">\n        <div class="checkout-resumo-coluna">\n          <div class="resumo-compra">\n            <h3 class="titulo-checkout titulo-checkout-resumo">${siteConfig.checkout.resumoTitulo}</h3>\n            <div class="resumo-linha">\n              <span>${siteConfig.checkout.valorPresentes}</span>\n              <strong>${formatarMoedaBR(totalPresentes)}</strong>\n            </div>\n            <div id="linha-resumo-cartao" class="resumo-linha">\n              <span>${siteConfig.checkout.valorCartaoLabel}</span>\n              <strong>${formatarMoedaBR(valorCartao)}</strong>\n            </div>\n            <div id="linha-resumo-subtotal" class="resumo-linha resumo-subtotal" style="display:${checkoutState.cartaoSelecionado ? "none" : "flex"};">\n              <span>${siteConfig.checkout.subtotalLabel || "Subtotal"}</span>\n              <strong>${formatarMoedaBR(totalPresentes + valorCartao)}</strong>\n            </div>\n            <div id="linha-resumo-cartao-removido" class="resumo-linha resumo-cartao-removido" style="display:${checkoutState.cartaoSelecionado ? "none" : "flex"};">\n              <span>${siteConfig.checkout.cartaoRemovidoLabel || "Cartão removido"}</span>\n              <strong>- ${formatarMoedaBR(valorCartao)}</strong>\n            </div>\n            <div class="resumo-linha total-destaque">\n              <span>${siteConfig.checkout.totalLabel}</span>\n              <span id="resumo-total-final">${formatarMoedaBR(totalFinal)}</span>\n            </div>\n          </div>\n          <div class="parcelamento-checkout" aria-label="Parcelamento no cartão de crédito">\n            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">\n              <rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"></rect>\n              <path d="M3 10h18" fill="none" stroke="currentColor" stroke-width="1.8"></path>\n            </svg>\n            <span>Parcele suas compras em até 6x no cartão de crédito</span>\n          </div>\n        </div>\n\n        <div class="checkout-formulario">\n          <div class="grupo-input">\n            <label>${siteConfig.checkout.nomeLabel} <span class="obrigatorio">*</span></label>\n            <input type="text" id="nome-checkout" class="input-checkout" placeholder="${siteConfig.checkout.nomePlaceholder}" value="${checkoutState.nome}">\n            <p id="erro-nome-checkout" class="erro-msg oculto" aria-live="assertive"></p>\n          </div>\n          <div class="grupo-input">\n            <label>${siteConfig.checkout.mensagemLabel} <span class="obrigatorio">*</span></label>\n            <textarea id="mensagem-checkout" class="textarea-checkout compacta" maxlength="400" placeholder="${siteConfig.checkout.mensagemPlaceholder}">${checkoutState.mensagem}</textarea>\n            <p id="erro-mensagem-checkout" class="erro-msg oculto" aria-live="assertive"></p>\n            <div class="contador-caracteres"><span id="contador">0</span>/400</div>\n          </div>\n          <div id="feedback-checkout" class="feedback-checkout"></div>\n          <button type="button" id="btn-ia-gerar" class="btn-ia">${siteConfig.checkout.botaoIA}</button>\n        </div>\n      </div>\n\n      <div class="secao-checkout compacta">\n        <p class="titulo-secao-compacta">${siteConfig.checkout.cartaoInstrucao}</p>\n        <div class="cartoes-carrossel">\n          <button type="button" class="cartoes-seta cartoes-seta--esq" aria-label="Voltar cartões">\n            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">\n              <path d="M15.5 4.5a1 1 0 0 1 0 1.4L9.4 12l6.1 6.1a1 1 0 1 1-1.4 1.4l-6.8-6.8a1 1 0 0 1 0-1.4l6.8-6.8a1 1 0 0 1 1.4 0z"></path>\n            </svg>\n          </button>\n          <div class="grid-cartoes compacta" id="cartoes-track">\n          ${(siteConfig.checkout.cartaoOpcoes && siteConfig.checkout.cartaoOpcoes.length ? siteConfig.checkout.cartaoOpcoes : [ {
    id: "padrao",
    tag: siteConfig.checkout.cartaoPadraoTag,
    texto: siteConfig.checkout.cartaoPadraoTexto
  }, {
    id: "classico",
    tag: siteConfig.checkout.cartaoRecomendadoTag,
    texto: siteConfig.checkout.cartaoRecomendadoTexto,
    destaque: true
  } ]).map(opcao => `\n          <div id="cartao-${String(opcao.id).replace(/"/g, "&quot;")}" class="opcao-cartao ${checkoutState.cartaoSelecionado && checkoutState.modeloCartao === opcao.id ? "selecionado" : ""}" data-modelo-cartao="${String(opcao.id).replace(/"/g, "&quot;")}">\n            ${opcao.tag ? `<div class="opcao-cartao-tag${opcao.destaque ? " destaque" : ""}">${opcao.tag}</div>` : ""}\n            <div class="opcao-cartao-preview">\n              ${opcao.imagem ? `<img src="${versionarImagemUrl(opcao.imagem)}" alt="${opcao.texto}" loading="lazy">` : `<span>${opcao.texto}</span>`}\n            </div>\n            <div class="opcao-cartao-zoom">\n              <button type="button" class="opcao-cartao-zoom-btn" data-preview-src="${String(versionarImagemUrl(opcao.imagem || "") || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" data-preview-titulo="${String(opcao.texto || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">\n                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">\n                  <path d="M10.5 3a7.5 7.5 0 0 1 5.93 12.06l3.25 3.25a1 1 0 1 1-1.42 1.42l-3.25-3.25A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11z"></path>\n                </svg>\n              </button>\n            </div>\n          </div>\n        `).join("")}\n          </div>\n          <button type="button" class="cartoes-seta cartoes-seta--dir" aria-label="Avançar cartões">\n            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">\n              <path d="M8.5 4.5a1 1 0 0 1 1.4 0l6.8 6.8a1 1 0 0 1 0 1.4l-6.8 6.8a1 1 0 0 1-1.4-1.4L14.6 12 8.5 5.9a1 1 0 0 1 0-1.4z"></path>\n            </svg>\n          </button>\n        </div>\n        <button type="button" id="btn-alternar-cartao" class="btn-sem-cartao">\n          ${siteConfig.checkout.cartaoSem}\n        </button>\n      </div>\n\n        <div class="checkout-acoes">\n          <div class="checkout-compra-segura">\n          <img class="compra-segura-img compra-segura-img--checkout" src="${versionarImagemUrl("img/icones/compra-segura.webp")}" alt="Compra segura" draggable="false">\n          </div>\n        <div class="checkout-espaco"></div>\n        <button id="btn-voltar-carrinho-checkout" class="botao botao-secundario checkout-btn">${siteConfig.checkout.voltarCarrinho}</button>\n        <button id="btn-concluir-checkout" class="botao botao-primario checkout-btn botao-secundario-destaque">${siteConfig.checkout.concluirCompra}</button>\n      </div>\n    </div>\n  `;
  const btnVoltarCarrinho = document.getElementById("btn-voltar-carrinho-checkout");
  if (btnVoltarCarrinho) {
    btnVoltarCarrinho.addEventListener("click", event => {
      event.preventDefault();
      renderizarCarrinho();
    });
  }
  const btnConcluirCheckout = document.getElementById("btn-concluir-checkout");
  if (btnConcluirCheckout) {
    btnConcluirCheckout.addEventListener("click", event => {
      event.preventDefault();
      concluirCompraFinal();
    });
  }
  const btnGerarIa = document.getElementById("btn-ia-gerar");
  if (btnGerarIa) {
    btnGerarIa.addEventListener("click", event => {
      event.preventDefault();
      gerarMensagemIA();
    });
  }
  document.querySelectorAll(".opcao-cartao").forEach(cardEl => {
    cardEl.addEventListener("click", () => {
      const modelo = cardEl.getAttribute("data-modelo-cartao");
      if (modelo) selecionarCartao(modelo);
    });
  });
  document.querySelectorAll(".opcao-cartao-zoom-btn").forEach(btn => {
    btn.addEventListener("click", event => {
      event.stopPropagation();
      const src = btn.getAttribute("data-preview-src") || "";
      const titulo = btn.getAttribute("data-preview-titulo") || "";
      window.abrirPreviewCartao(src, titulo);
    });
  });
  const btnAlternarCartao = document.getElementById("btn-alternar-cartao");
  if (btnAlternarCartao) {
    btnAlternarCartao.addEventListener("click", event => {
      event.preventDefault();
      // Alterna: remove o cartão se estiver selecionado, ou readiciona se estiver removido.
      checkoutState.cartaoSelecionado = !checkoutState.cartaoSelecionado;
      salvarCheckoutState();
      atualizarInterfaceCheckout();
    });
  }
  const nomeCheckoutInput = document.getElementById("nome-checkout");
  if (nomeCheckoutInput) {
    nomeCheckoutInput.addEventListener("input", () => {
      checkoutState.nome = nomeCheckoutInput.value;
      if (window.limparErroCampo) window.limparErroCampo("nome-checkout");
    });
  }
  const textarea = document.getElementById("mensagem-checkout");
  if (textarea) {
    textarea.addEventListener("input", () => {
      window.atualizarContador(textarea);
      if (window.limparErroCampo) window.limparErroCampo("mensagem-checkout");
    });
    window.atualizarContador(textarea);
  }
  salvarCheckoutState();
  atualizarInterfaceCheckout();
  inicializarCarrosselCartoes();
}

function atualizarContador(el) {
  const contador = document.getElementById("contador");
  if (contador) contador.textContent = el.value.length;
  checkoutState.mensagem = el.value;
  salvarCheckoutState();
  if (window.limparErroCampo) window.limparErroCampo(el.id);
}

function selecionarCartao(modelo) {
  checkoutState.cartaoSelecionado = true;
  checkoutState.modeloCartao = modelo;
  salvarCheckoutState();
  window.atualizarInterfaceCheckout();
}

function alternarCartao() {
  checkoutState.cartaoSelecionado = !checkoutState.cartaoSelecionado;
  salvarCheckoutState();
  window.atualizarInterfaceCheckout();
}

function atualizarInterfaceCheckout() {
  document.querySelectorAll(".opcao-cartao").forEach(el => el.classList.remove("selecionado"));
  if (checkoutState.cartaoSelecionado) {
    const el = document.getElementById(`cartao-${checkoutState.modeloCartao}`);
    if (el) el.classList.add("selecionado");
  }
  const btn = document.getElementById("btn-alternar-cartao");
  if (btn) {
    // Rótulo = ação que o clique executa (evita ler "ao contrário").
    btn.textContent = checkoutState.cartaoSelecionado
      ? (siteConfig.checkout.cartaoRemover || "Remover cartão postal")
      : (siteConfig.checkout.cartaoComCartao || "Adicionar cartão postal");
    btn.style.display = "inline-flex";
  }
  const linhaCartao = document.getElementById("linha-resumo-cartao");
  if (linhaCartao) linhaCartao.style.display = "flex";
  const linhaSubtotal = document.getElementById("linha-resumo-subtotal");
  if (linhaSubtotal) linhaSubtotal.style.display = checkoutState.cartaoSelecionado ? "none" : "flex";
  const linhaCartaoRemovido = document.getElementById("linha-resumo-cartao-removido");
  if (linhaCartaoRemovido) linhaCartaoRemovido.style.display = checkoutState.cartaoSelecionado ? "none" : "flex";
  const totalPresentes = calcularTotalPresentes();
  const valorCartao = siteConfig.checkout.valorCartao;
  const custoCartao = checkoutState.cartaoSelecionado ? valorCartao : 0;
  const totalFinal = totalPresentes + custoCartao;
  const elTotal = document.getElementById("resumo-total-final");
  if (elTotal) elTotal.textContent = formatarMoedaBR(totalFinal);
}

function inicializarCarrosselCartoes() {
  const track = document.getElementById("cartoes-track");
  if (!track) return;
  const wrapper = track.closest(".cartoes-carrossel");
  if (!wrapper) return;
  const btnEsq = wrapper.querySelector(".cartoes-seta--esq");
  const btnDir = wrapper.querySelector(".cartoes-seta--dir");
  const getScrollAmount = () => {
    const card = track.querySelector(".opcao-cartao");
    if (!card) return 200;
    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
    return card.getBoundingClientRect().width + gap;
  };
  const atualizarBotoes = () => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (btnEsq) btnEsq.disabled = track.scrollLeft <= 0;
    if (btnDir) btnDir.disabled = track.scrollLeft >= maxScroll - 1;
  };
  const scrollByAmount = dir => {
    const amount = getScrollAmount();
    track.scrollBy({
      left: dir * amount,
      behavior: "smooth"
    });
  };
  if (btnEsq) btnEsq.addEventListener("click", () => scrollByAmount(-1));
  if (btnDir) btnDir.addEventListener("click", () => scrollByAmount(1));
  track.addEventListener("scroll", atualizarBotoes, {
    passive: true
  });
  window.addEventListener("resize", atualizarBotoes);
  atualizarBotoes();
}

function abrirPreviewCartao(src, titulo) {
  if (!src) return;
  if (document.getElementById("cartao-preview-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "cartao-preview-overlay";
  overlay.className = "cartao-preview-overlay";
  overlay.style.display = "flex";
  overlay.innerHTML = `\n    <div class="cartao-preview-modal" role="dialog" aria-modal="true" aria-label="${titulo || "Pré-visualização do cartão"}">\n      <button type="button" class="cartao-preview-fechar" aria-label="${siteConfig.ui.fecharAria}">&times;</button>\n      <img src="${versionarImagemUrl(src)}" alt="${titulo || "Cartão"}">\n    </div>\n  `;
  document.body.appendChild(overlay);
  bloquearScrollModal();
  const fechar = () => {
    overlay.remove();
    liberarScrollModal();
  };
  overlay.addEventListener("click", evt => {
    if (evt.target === overlay) fechar();
  });
  const btnFechar = overlay.querySelector(".cartao-preview-fechar");
  if (btnFechar) btnFechar.addEventListener("click", fechar);
}

function gerarMensagemIA() {
  const btn = document.querySelector(".btn-ia");
  const textarea = document.getElementById("mensagem-checkout");
  if (!(btn && textarea)) return;
  const textoOriginal = btn.innerHTML;
  btn.innerHTML = siteConfig.checkout.mensagemGerando;
  btn.disabled = true;
  btn.style.opacity = "0.8";
  btn.style.cursor = "wait";
  textarea.style.opacity = "0.5";
  setTimeout(() => {
    const noivos = (siteConfig?.dados?.noivos || "os noivos").trim();
    const nomeConvidado = (document.getElementById("nome-checkout")?.value || "").trim();
    const assinatura = nomeConvidado ? ` Com carinho, ${nomeConvidado}.` : "";
    const aberturas = [ `Parabéns, ${noivos}!`, `${noivos}, muitas felicidades nesta nova etapa!`, `Que alegria celebrar esse momento de ${noivos}!`, `${noivos}, votos de muito amor e cumplicidade!` ];
    const desejos = [ "Que a vida a dois seja cheia de leveza, respeito e descobertas especiais.", "Que nunca faltem diálogo, parceria e motivos para sorrir juntos.", "Que cada dia traga novas memórias bonitas e muito companheirismo.", "Que essa união seja sempre guiada por carinho, paz e admiração mútua.", "Que o lar de vocês seja repleto de amor, alegria e boas surpresas." ];
    const fechamentos = [ "Aproveitem cada instante dessa caminhada.", "Que esse novo capítulo seja inesquecível.", "Que essa história seja linda em cada detalhe.", "Muitas bênçãos e felicidade nessa jornada." ];
    let tentativas = 0;
    let mensagemEscolhida = "";
    const ultimaMensagem = sessionStorage.getItem("checkout.mensagem_ia.ultima") || "";
    do {
      const abertura = aberturas[Math.floor(Math.random() * aberturas.length)];
      const desejo = desejos[Math.floor(Math.random() * desejos.length)];
      const fechamento = fechamentos[Math.floor(Math.random() * fechamentos.length)];
      mensagemEscolhida = `${abertura} ${desejo} ${fechamento}${assinatura}`;
      if (mensagemEscolhida.length > 400) {
        mensagemEscolhida = `${abertura} ${desejo} ${fechamento}`;
      }
      tentativas += 1;
    } while (mensagemEscolhida === ultimaMensagem && tentativas < 5);
    sessionStorage.setItem("checkout.mensagem_ia.ultima", mensagemEscolhida);
    textarea.value = mensagemEscolhida;
    window.atualizarContador(textarea);
    textarea.style.opacity = "1";
    textarea.focus();
    btn.innerHTML = textoOriginal;
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
  }, 800);
}

function concluirCompraFinal() {
  if (carrinho.length === 0) return;
  const nomeEl = document.getElementById("nome-checkout");
  const mensagemEl = document.getElementById("mensagem-checkout");
  const nomeDigitado = nomeEl ? nomeEl.value.trim() : "";
  const mensagemDigitada = mensagemEl ? mensagemEl.value.trim() : "";
  checkoutState.nome = nomeDigitado;
  checkoutState.mensagem = mensagemDigitada;
  salvarCheckoutState();
  if (!nomeDigitado) {
    mostrarErroCampo("nome-checkout", siteConfig.checkout.erroNome);
    if (nomeEl) nomeEl.focus();
    return;
  }
  if (!window.validarNomeCompleto(nomeDigitado)) {
    mostrarErroCampo("nome-checkout", siteConfig.checkout.erroNomeCompleto);
    if (nomeEl) nomeEl.focus();
    return;
  }
  if (!mensagemDigitada) {
    mostrarErroCampo("mensagem-checkout", siteConfig.checkout.erroMensagem);
    if (mensagemEl) mensagemEl.focus();
    return;
  }
  window.limparErroCampo("nome-checkout");
  window.limparErroCampo("mensagem-checkout");
  window.mostrarModalPagamento();
}

window.irParaCheckout = irParaCheckout;

window.renderizarCheckout = renderizarCheckout;

window.atualizarContador = atualizarContador;

window.selecionarCartao = selecionarCartao;

window.alternarCartao = alternarCartao;

window.atualizarInterfaceCheckout = atualizarInterfaceCheckout;

window.abrirPreviewCartao = abrirPreviewCartao;

window.gerarMensagemIA = gerarMensagemIA;

window.concluirCompraFinal = concluirCompraFinal;

export { checkoutState, salvarCheckoutState, carregarCheckoutPersistido, limparCheckoutPersistido, calcularCustoCartaoPersonalizado, calcularTotalFinal, validarValorMinimoPagamento, irParaCheckout, renderizarCheckout, atualizarContador, selecionarCartao, alternarCartao, atualizarInterfaceCheckout, inicializarCarrosselCartoes, abrirPreviewCartao, gerarMensagemIA, concluirCompraFinal };
