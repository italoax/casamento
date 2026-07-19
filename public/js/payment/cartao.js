import { versionarImagemUrl } from "../utils/assets.js";

import { normalizarDigitos, formatarCPF, formatarTelefone, formatarCEP, formatarNumeroCartao, formatarValidadeCartao, arredondarMoeda } from "../utils/formatting.js";

import { validarEmail, validarValidadeCartao, validarNumeroCartaoLuhn, validarCPF, validarTelefone } from "../utils/validation.js";

import { bloquearScrollModal, liberarScrollModal } from "../core/modals.js";

import { marcarRetornoModalPagamento, limparRetornoModalPagamento } from "../ui/navigation.js";

import { lerJsonComFallback } from "../features/recados.js";

import { atualizarDisponibilidadePresentesAposPagamento } from "../features/presentes.js";

import { carrinho } from "../cart/cart.js";

import { checkoutState, calcularTotalFinal, validarValorMinimoPagamento } from "../cart/checkout.js";

const siteConfig = window.siteConfig;

const cartaoFormData = {
  nomeCompleto: "",
  nomeCartao: "",
  email: "",
  cpf: "",
  telefone: "",
  cep: "",
  numeroEndereco: "",
  parcelas: "1",
  termos: false
};

window.cartaoFormData = cartaoFormData;

function limparCartaoFormulario() {
  Object.assign(cartaoFormData, {
    nomeCompleto: "",
    nomeCartao: "",
    email: "",
    cpf: "",
    telefone: "",
    cep: "",
    numeroEndereco: "",
    parcelas: "1",
    termos: false
  });
  window.cartaoFormData = cartaoFormData;
  [ "cartao-nome", "cartao-email", "cartao-cpf", "cartao-telefone", "cartao-cep", "cartao-numero-endereco", "cartao-numero", "cartao-nome-cartao", "cartao-validade", "cartao-cvv", "cartao-parcelas", "cartao-termos" ].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (el.type === "checkbox") {
        el.checked = false;
      } else {
        el.value = "";
      }
      if (window.limparErroCampo) window.limparErroCampo(id);
    }
  });
}

function mostrarFormularioCartaoPessoal(resetDados = false) {
  if (document.getElementById("modal-cartao-pessoal-overlay")) return;
  marcarRetornoModalPagamento();
  if (resetDados) {
    Object.assign(cartaoFormData, {
      nomeCompleto: "",
      nomeCartao: "",
      email: "",
      cpf: "",
      telefone: "",
      cep: "",
      numeroEndereco: "",
      parcelas: "1",
      termos: false
    });
    window.cartaoFormData = cartaoFormData;
  }
  const overlay = document.createElement("div");
  overlay.id = "modal-cartao-pessoal-overlay";
  overlay.className = "modal-pagamento-overlay";
  overlay.style.display = "flex";
  overlay.innerHTML = `
    <div class="modal-cartao-form">
      <button type="button" id="btn-fechar-cartao-pessoal" class="btn-fechar-modal" aria-label="${siteConfig.ui.fecharAria}">&times;</button>
      <h3 class="pagamento-titulo">Pagamento com cartão de crédito</h3>
      <p class="pagamento-info">Os campos marcados com asterisco (*) são de preenchimento obrigatório.</p>
      <div class="pix-campos">
        <label for="cartao-nome">${siteConfig.cartao.labelNome}*</label>
        <input type="text" id="cartao-nome" class="entrada-confirmacao" value="${cartaoFormData.nomeCompleto}" required autocomplete="name">
        <p id="erro-cartao-nome" class="erro-msg oculto" aria-live="assertive"></p>
        <label for="cartao-email">${siteConfig.cartao.labelEmail}*</label>
        <input type="email" id="cartao-email" class="entrada-confirmacao" value="${cartaoFormData.email}" required inputmode="email" autocomplete="email">
        <p id="erro-cartao-email" class="erro-msg oculto" aria-live="assertive"></p>
        <label for="cartao-cpf">${siteConfig.cartao.labelCpf}*</label>
        <input type="text" id="cartao-cpf" class="entrada-confirmacao" value="${formatarCPF(cartaoFormData.cpf)}" required inputmode="numeric" maxlength="14" placeholder="${siteConfig.cartao.placeholderCpf}">
        <p id="erro-cartao-cpf" class="erro-msg oculto" aria-live="assertive"></p>
        <label for="cartao-telefone">${siteConfig.cartao.labelTelefone}*</label>
        <input type="text" id="cartao-telefone" class="entrada-confirmacao" value="${formatarTelefone(cartaoFormData.telefone)}" required inputmode="tel" maxlength="16" placeholder="${siteConfig.cartao.placeholderTelefone}">
        <p id="erro-cartao-telefone" class="erro-msg oculto" aria-live="assertive"></p>
        <label for="cartao-cep">${siteConfig.cartao.labelCep}*</label>
        <input type="text" id="cartao-cep" class="entrada-confirmacao" value="${formatarCEP(cartaoFormData.cep)}" required inputmode="numeric" maxlength="9" placeholder="${siteConfig.cartao.placeholderCep}">
        <p id="erro-cartao-cep" class="erro-msg oculto" aria-live="assertive"></p>
        <label for="cartao-numero-endereco">${siteConfig.cartao.labelNumeroEndereco}*</label>
        <input type="text" id="cartao-numero-endereco" class="entrada-confirmacao" value="${cartaoFormData.numeroEndereco || ""}" required inputmode="numeric" maxlength="10" placeholder="${siteConfig.cartao.placeholderNumeroEndereco}">
        <p id="erro-cartao-numero-endereco" class="erro-msg oculto" aria-live="assertive"></p>
      </div>
      <div class="pix-termo">
        <input type="checkbox" id="cartao-termos" ${cartaoFormData.termos ? "checked" : ""}>
        <label for="cartao-termos">${siteConfig.cartao.termos}</label>
      </div>
      <p id="erro-cartao-termos" class="erro-msg oculto" aria-live="assertive"></p>
      <div class="pix-acoes">
        <button type="button" id="btn-voltar-cartao-pessoal" class="botao botao-secundario">${siteConfig.cartao.botaoVoltar}</button>
        <button type="button" id="btn-avancar-cartao-pessoal" class="botao botao-primario">Avançar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  bloquearScrollModal();
  const fecharOverlay = () => {
    overlay.remove();
    liberarScrollModal();
    limparRetornoModalPagamento();
  };
  const fechar = overlay.querySelector("#btn-fechar-cartao-pessoal");
  if (fechar) {
    fechar.addEventListener("click", fecharOverlay);
  }
  const btnVoltar = overlay.querySelector("#btn-voltar-cartao-pessoal");
  if (btnVoltar) {
    btnVoltar.addEventListener("click", () => {
      fecharOverlay();
      window.mostrarModalPagamento();
    });
  }
  const inputs = overlay.querySelectorAll(".pix-campos input");
  inputs.forEach(input => {
    input.addEventListener("input", () => {
      if (window.limparErroCampo) window.limparErroCampo(input.id);
    });
  });
  const termosCheckbox = overlay.querySelector("#cartao-termos");
  if (termosCheckbox) {
    termosCheckbox.addEventListener("change", () => {
      if (window.limparErroCampo) window.limparErroCampo("cartao-termos");
    });
  }
  const cpfInput = overlay.querySelector("#cartao-cpf");
  if (cpfInput) {
    cpfInput.addEventListener("input", () => {
      cpfInput.value = formatarCPF(cpfInput.value);
    });
  }
  const telefoneInput = overlay.querySelector("#cartao-telefone");
  if (telefoneInput) {
    telefoneInput.addEventListener("input", () => {
      telefoneInput.value = formatarTelefone(telefoneInput.value);
    });
  }
  const cepInput = overlay.querySelector("#cartao-cep");
  if (cepInput) {
    cepInput.addEventListener("input", () => {
      cepInput.value = formatarCEP(cepInput.value);
    });
  }
  const numeroEnderecoInput = overlay.querySelector("#cartao-numero-endereco");
  if (numeroEnderecoInput) {
    numeroEnderecoInput.addEventListener("input", () => {
      numeroEnderecoInput.value = normalizarDigitos(numeroEnderecoInput.value).slice(0, 10);
    });
  }
  const btnAvancar = overlay.querySelector("#btn-avancar-cartao-pessoal");
  if (btnAvancar) {
    btnAvancar.addEventListener("click", () => {
      if (validarFormularioCartaoPessoal()) {
        fecharOverlay();
        window.mostrarFormularioCartaoDetalhes();
      }
    });
  }
}

function mostrarFormularioCartao() {
  mostrarFormularioCartaoPessoal(true);
}

function mostrarFormularioCartaoDetalhes() {
  if (document.getElementById("modal-cartao-dados-overlay")) return;
  marcarRetornoModalPagamento();
  const totalFinal = calcularTotalFinal("cartao");
  const overlay = document.createElement("div");
  overlay.id = "modal-cartao-dados-overlay";
  overlay.className = "modal-pagamento-overlay";
  overlay.style.display = "flex";
  overlay.dataset.suppressFeedback = "true";
  overlay.innerHTML = `
    <div class="modal-cartao-form">
      <button type="button" id="btn-fechar-cartao-form" class="btn-fechar-modal" aria-label="${siteConfig.ui.fecharAria}">&times;</button>
      <h3 class="pagamento-titulo">Pagamento com cartão de crédito</h3>
      <p class="pagamento-info">Os campos marcados com asterisco (*) são de preenchimento obrigatório.</p>
      <form id="efi-cartao-form" class="pix-campos" autocomplete="off">
        <label for="cartao-numero">${siteConfig.cartao.labelNumero}*</label>
        <div class="cartao-numero-wrapper">
          <input type="text" id="cartao-numero" class="entrada-confirmacao" inputmode="numeric" autocomplete="cc-number">
          <img id="cartao-brand-icone" class="cartao-brand-icone oculto" alt="Bandeira do cartão">
          <span id="cartao-brand-texto" class="cartao-brand-texto oculto"></span>
        </div>
        <p id="erro-cartao-numero" class="erro-msg oculto" aria-live="assertive"></p>
        <label for="cartao-nome-cartao">Nome no cartao*</label>
        <input type="text" id="cartao-nome-cartao" class="entrada-confirmacao" autocomplete="cc-name" value="${cartaoFormData.nomeCartao || cartaoFormData.nomeCompleto || ""}">
        <p id="erro-cartao-nome-cartao" class="erro-msg oculto" aria-live="assertive"></p>
        <label for="cartao-validade">${siteConfig.cartao.labelValidade}*</label>
        <input type="text" id="cartao-validade" class="entrada-confirmacao" inputmode="numeric" autocomplete="cc-exp">
        <p id="erro-cartao-validade" class="erro-msg oculto" aria-live="assertive"></p>
        <label for="cartao-cvv">${siteConfig.cartao.labelCvv}*</label>
        <input type="text" id="cartao-cvv" class="entrada-confirmacao" inputmode="numeric" autocomplete="cc-csc">
        <p id="erro-cartao-cvv" class="erro-msg oculto" aria-live="assertive"></p>
        <label for="cartao-parcelas">${siteConfig.cartao.labelParcelas}*</label>
        <select id="cartao-parcelas" class="entrada-confirmacao">
          <option value="1">1x</option>
        </select>
        <p id="erro-cartao-parcelas" class="erro-msg oculto" aria-live="assertive"></p>
        <p id="cartao-parcelas-status" class="cartao-parcelas-status"></p>
      </form>
      <div class="feedback-checkout feedback-checkout-modal" aria-live="assertive"></div>
      <div class="pix-valor" id="cartao-total-valor">${siteConfig.checkout.totalLabel}: R$ ${totalFinal.toLocaleString("pt-BR", {
    minimumFractionDigits: 2
  })}</div>
      <div class="pix-seguro pix-seguro--form">
        <img class="compra-segura-img compra-segura-img--form" src="${versionarImagemUrl("img/icones/compra-segura.webp")}" alt="Compra segura" draggable="false">
      </div>
      <div class="pix-acoes">
        <button type="button" id="btn-voltar-cartao" class="botao botao-secundario">${siteConfig.cartao.botaoVoltar}</button>
        <button type="button" id="btn-avancar-cartao" class="botao botao-primario">${siteConfig.cartao.botaoAvancar}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  bloquearScrollModal();
  window.mostrarFeedbackCheckout("");
  [ "cartao-numero", "cartao-nome-cartao", "cartao-validade", "cartao-cvv", "cartao-parcelas" ].forEach(id => {
    if (window.limparErroCampo) window.limparErroCampo(id);
  });
  let parcelasObserver = null;
  const fecharOverlay = () => {
    if (parcelasObserver) {
      parcelasObserver.disconnect();
      parcelasObserver = null;
    }
    overlay.remove();
    liberarScrollModal();
    limparRetornoModalPagamento();
  };
  const fechar = overlay.querySelector("#btn-fechar-cartao-form");
  if (fechar) {
    fechar.addEventListener("click", fecharOverlay);
  }
  const btnVoltar = overlay.querySelector("#btn-voltar-cartao");
  if (btnVoltar) {
    btnVoltar.addEventListener("click", () => {
      fecharOverlay();
      mostrarFormularioCartaoPessoal(false);
    });
  }
  const parcelasSelect = overlay.querySelector("#cartao-parcelas");
  const numeroEl = overlay.querySelector("#cartao-numero");
  const nomeCartaoEl = overlay.querySelector("#cartao-nome-cartao");
  const validadeEl = overlay.querySelector("#cartao-validade");
  const cvvEl = overlay.querySelector("#cartao-cvv");
  const brandIconEl = overlay.querySelector("#cartao-brand-icone");
  const brandTextEl = overlay.querySelector("#cartao-brand-texto");
  const inputs = overlay.querySelectorAll(".pix-campos input, .pix-campos select");
  inputs.forEach(input => {
    input.addEventListener("input", () => {
      if (window.limparErroCampo) window.limparErroCampo(input.id);
    });
  });
  atualizarTotalCartaoModal(totalFinal, parseInt(cartaoFormData.parcelas, 10) || 1);
  preencherParcelasSimuladas(totalFinal, parcelasSelect);
  if (parcelasSelect) {
    parcelasSelect.addEventListener("change", () => {
      limitarParcelasSelect(parcelasSelect);
      cartaoFormData.parcelas = parcelasSelect.value;
      atualizarTotalCartaoModal(totalFinal, parseInt(cartaoFormData.parcelas, 10) || 1);
    });
    parcelasObserver = new MutationObserver(() => {
      limitarParcelasSelect(parcelasSelect);
    });
    parcelasObserver.observe(parcelasSelect, {
      childList: true
    });
  }
  if (numeroEl) {
    numeroEl.addEventListener("input", () => {
      numeroEl.value = formatarNumeroCartao(numeroEl.value);
      const digits = normalizarDigitos(numeroEl.value);
      const bandeiraId = detectarBandeiraPorBin(digits.slice(0, 6));
      if (bandeiraId) {
        if (brandTextEl) {
          brandTextEl.textContent = "";
          brandTextEl.classList.add("oculto");
        }
        if (brandIconEl) {
          const bandeiras = {
            visa: "visa",
            master: "mastercard",
            amex: "amex",
            elo: "elo",
            hipercard: "hipercard"
          };
          const arquivo = bandeiras[bandeiraId];
          if (arquivo) {
            brandIconEl.src = versionarImagemUrl(`img/bandeiras/${arquivo}.webp`);
            brandIconEl.alt = `Bandeira ${nomeBandeiraCartao(bandeiraId)}`;
            brandIconEl.classList.remove("oculto");
          } else {
            brandIconEl.src = "";
            brandIconEl.classList.add("oculto");
          }
        }
      } else {
        if (brandTextEl) {
          brandTextEl.textContent = "";
          brandTextEl.classList.add("oculto");
        }
        if (brandIconEl) {
          brandIconEl.src = "";
          brandIconEl.classList.add("oculto");
        }
      }
    });
  }
  if (validadeEl) {
    validadeEl.addEventListener("input", () => {
      validadeEl.value = formatarValidadeCartao(validadeEl.value);
    });
  }
  if (cvvEl) {
    cvvEl.addEventListener("input", () => {
      cvvEl.value = normalizarDigitos(cvvEl.value).slice(0, 4);
    });
  }
  if (nomeCartaoEl) {
    nomeCartaoEl.addEventListener("input", () => {
      nomeCartaoEl.value = nomeCartaoEl.value.replace(/\s{2,}/g, " ");
    });
  }
  const btnAvancar = overlay.querySelector("#btn-avancar-cartao");
  if (btnAvancar) {
    btnAvancar.addEventListener("click", () => {
      if (!validarFormularioCartao()) return;
      btnAvancar.disabled = true;
      window.iniciarPagamentoCartao({
        onSuccess: status => {
          if (status === "approved") {}
        },
        onFinally: () => {
          btnAvancar.disabled = false;
        }
      });
    });
  }
  const formEl = overlay.querySelector("#efi-cartao-form");
  if (formEl) {
    formEl.addEventListener("submit", event => {
      event.preventDefault();
      if (btnAvancar) btnAvancar.click();
    });
  }
}

window.mostrarFormularioCartaoDetalhes = mostrarFormularioCartaoDetalhes;

function calcularTotalComJuros(baseTotal, parcelas) {
  if (parcelas <= 1) return baseTotal;
  const taxa = siteConfig.cartao.jurosPorParcela || 0;
  return arredondarMoeda(baseTotal * (1 + taxa * parcelas));
}

function obterTotalParcelasSelecionadas() {
  const parcelasSelect = document.getElementById("cartao-parcelas");
  if (!parcelasSelect || !parcelasSelect.selectedOptions.length) return null;
  const optionEl = parcelasSelect.selectedOptions[0];
  const total = optionEl && optionEl.dataset ? parseFloat(optionEl.dataset.total) : NaN;
  if (Number.isFinite(total) && total > 0) return total;
  return null;
}

function sanitizarTextoParcela(texto) {
  if (!texto) return "";
  return texto.replace(/\s*\(R\$\s*[\d.,\s]+\)\s*$/i, "").replace(/\s+/g, " ").trim();
}

function normalizarParcelasSelect(parcelasSelect) {
  if (!parcelasSelect) return;
  Array.from(parcelasSelect.options).forEach(opt => {
    opt.textContent = sanitizarTextoParcela(opt.textContent);
  });
}

function preencherParcelasSimuladas(total, parcelasSelect) {
  if (!parcelasSelect) return;
  parcelasSelect.innerHTML = "";
  atualizarStatusParcelas("");
  if (siteConfig.cartao.minimoParcelamento > 0 && total < siteConfig.cartao.minimoParcelamento) {
    parcelasSelect.innerHTML = `<option value="1" data-total="${total.toFixed(2)}">1x</option>`;
    cartaoFormData.parcelas = "1";
    atualizarStatusParcelas(siteConfig.cartao.textoParcelamentoMinimo);
    atualizarTotalCartaoModal(total, parseInt(cartaoFormData.parcelas, 10) || 1);
    return;
  }
  const maxParcelas = Math.min(siteConfig.cartao.maxParcelas || 1, 6);
  for (let i = 1; i <= maxParcelas; i++) {
    const totalComJuros = calcularTotalComJuros(total, i);
    const valorParcela = arredondarMoeda(totalComJuros / i);
    const optionEl = document.createElement("option");
    optionEl.value = String(i);
    optionEl.textContent = `${i} ${i === 1 ? "parcela" : "parcelas"} de R$ ${valorParcela.toLocaleString("pt-BR", {
      minimumFractionDigits: 2
    })}`;
    optionEl.dataset.total = totalComJuros.toFixed(2);
    parcelasSelect.appendChild(optionEl);
  }
  normalizarParcelasSelect(parcelasSelect);
  cartaoFormData.parcelas = parcelasSelect.value || "1";
  atualizarStatusParcelas("");
  atualizarTotalCartaoModal(total, parseInt(cartaoFormData.parcelas, 10) || 1);
}

function limitarParcelasSelect(parcelasSelect) {
  if (!parcelasSelect) return;
  const maxParcelas = Math.min(siteConfig.cartao.maxParcelas || 1, 6);
  const options = Array.from(parcelasSelect.options);
  options.forEach(opt => {
    const val = parseInt(opt.value, 10);
    if (Number.isFinite(val) && val > maxParcelas) {
      parcelasSelect.removeChild(opt);
    }
  });
  normalizarParcelasSelect(parcelasSelect);
  const selectedVal = parseInt(parcelasSelect.value, 10);
  if (Number.isFinite(selectedVal) && selectedVal > maxParcelas) {
    const fallback = Array.from(parcelasSelect.options).find(opt => parseInt(opt.value, 10) === maxParcelas);
    if (fallback) parcelasSelect.value = fallback.value;
  }
}

function atualizarTotalCartaoModal(baseTotal, parcelas) {
  const totalEl = document.getElementById("cartao-total-valor");
  if (!totalEl) return;
  const totalSelecionado = obterTotalParcelasSelecionadas();
  const totalComJuros = totalSelecionado !== null ? totalSelecionado : calcularTotalComJuros(baseTotal, parcelas);
  const label = siteConfig.checkout.totalLabel;
  totalEl.textContent = `${label}: R$ ${totalComJuros.toLocaleString("pt-BR", {
    minimumFractionDigits: 2
  })}`;
}

function atualizarParcelasMp(total, parcelasSelect, installments) {
  if (!parcelasSelect) return;
  if (!Array.isArray(installments) || installments.length === 0) {
    parcelasSelect.innerHTML = `<option value="1">1x</option>`;
    atualizarStatusParcelas("Parcelas indisponíveis no momento.");
    return;
  }
  parcelasSelect.innerHTML = "";
  const maxParcelas = Math.min(siteConfig.cartao.maxParcelas || 1, 6);
  const lista = installments.filter(item => {
    const n = parseInt(item.installments, 10);
    return Number.isFinite(n) && n >= 1 && n <= maxParcelas;
  });
  if (!lista.length) {
    parcelasSelect.innerHTML = `<option value="1">1x</option>`;
    atualizarStatusParcelas("Parcelas indisponíveis no momento.");
    return;
  }
  lista.forEach(item => {
    const n = Number(item.installments) || 1;
    const totalAmount = Number(item.total_amount) || arredondarMoeda(Number(item.installment_amount || 0) * n);
    const texto = item.recommended_message || `${n}x de R$ ${Number(item.installment_amount || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2
    })}`;
    const optionEl = document.createElement("option");
    optionEl.value = String(n);
    optionEl.textContent = texto;
    if (Number.isFinite(totalAmount) && totalAmount > 0) {
      optionEl.dataset.total = totalAmount.toFixed(2);
    }
    parcelasSelect.appendChild(optionEl);
  });
  normalizarParcelasSelect(parcelasSelect);
  cartaoFormData.parcelas = parcelasSelect.value || "1";
  atualizarStatusParcelas("");
  atualizarTotalCartaoModal(total, parseInt(cartaoFormData.parcelas, 10) || 1);
  const statusEl = document.getElementById("cartao-parcelas-status");
  if (statusEl) statusEl.textContent = "Parcelas disponíveis para este pagamento.";
}

function atualizarStatusParcelas(mensagem = "") {
  const el = document.getElementById("erro-cartao-parcelas");
  if (!el) return;
  if (!mensagem) {
    el.textContent = "";
    el.classList.add("oculto");
    el.style.color = "";
    return;
  }
  el.textContent = mensagem;
  el.classList.remove("oculto");
  el.style.color = "#777";
}

function validarFormularioCartaoPessoal() {
  const nomeEl = document.getElementById("cartao-nome");
  const emailEl = document.getElementById("cartao-email");
  const cpfEl = document.getElementById("cartao-cpf");
  const telefoneEl = document.getElementById("cartao-telefone");
  const cepEl = document.getElementById("cartao-cep");
  const numeroEnderecoEl = document.getElementById("cartao-numero-endereco");
  const termosEl = document.getElementById("cartao-termos");
  let valido = true;
  if (!nomeEl || !emailEl || !cpfEl || !telefoneEl || !cepEl || !numeroEnderecoEl || !termosEl) return false;
  [ "cartao-nome", "cartao-email", "cartao-cpf", "cartao-telefone", "cartao-cep", "cartao-numero-endereco", "cartao-termos" ].forEach(id => {
    if (window.limparErroCampo) window.limparErroCampo(id);
  });
  const nome = nomeEl.value.trim();
  const email = emailEl.value.trim();
  const cpf = normalizarDigitos(cpfEl.value);
  const telefone = normalizarDigitos(telefoneEl.value);
  const cep = normalizarDigitos(cepEl.value);
  const numeroEndereco = normalizarDigitos(numeroEnderecoEl.value);
  if (!nome) {
    window.mostrarErroCampo("cartao-nome", siteConfig.cartao.validar.nomeObrigatorio);
    valido = false;
  } else if (!window.validarNomeCompleto(nome)) {
    window.mostrarErroCampo("cartao-nome", siteConfig.cartao.validar.nomeCompleto);
    valido = false;
  }
  if (!email) {
    window.mostrarErroCampo("cartao-email", siteConfig.cartao.validar.emailObrigatorio);
    valido = false;
  } else if (!validarEmail(email)) {
    window.mostrarErroCampo("cartao-email", siteConfig.cartao.validar.emailInvalido);
    valido = false;
  }
  if (!cpf) {
    window.mostrarErroCampo("cartao-cpf", siteConfig.cartao.validar.cpfObrigatorio);
    valido = false;
  } else if (!validarCPF(cpf)) {
    window.mostrarErroCampo("cartao-cpf", siteConfig.cartao.validar.cpfInvalido);
    valido = false;
  }
  if (!telefone) {
    window.mostrarErroCampo("cartao-telefone", siteConfig.cartao.validar.telefoneObrigatorio);
    valido = false;
  } else if (!validarTelefone(telefone)) {
    window.mostrarErroCampo("cartao-telefone", siteConfig.cartao.validar.telefoneInvalido);
    valido = false;
  }
  if (!cep) {
    window.mostrarErroCampo("cartao-cep", siteConfig.cartao.validar.cepObrigatorio);
    valido = false;
  } else if (cep.length !== 8) {
    window.mostrarErroCampo("cartao-cep", siteConfig.cartao.validar.cepInvalido);
    valido = false;
  }
  if (!numeroEndereco) {
    window.mostrarErroCampo("cartao-numero-endereco", siteConfig.cartao.validar.numeroEnderecoObrigatorio);
    valido = false;
  }
  if (!termosEl.checked) {
    window.mostrarErroCampo("cartao-termos", siteConfig.cartao.validar.termosObrigatorio);
    valido = false;
  }
  if (!valido) return false;
  Object.assign(cartaoFormData, {
    nomeCompleto: nome,
    email: email,
    cpf: cpf,
    telefone: telefone,
    cep: cep,
    numeroEndereco: numeroEndereco,
    termos: termosEl.checked
  });
  window.cartaoFormData = cartaoFormData;
  return true;
}

function validarFormularioCartao() {
  const parcelasEl = document.getElementById("cartao-parcelas");
  const numeroEl = document.getElementById("cartao-numero");
  const nomeCartaoEl = document.getElementById("cartao-nome-cartao");
  const validadeEl = document.getElementById("cartao-validade");
  const cvvEl = document.getElementById("cartao-cvv");
  if (!parcelasEl || !numeroEl || !nomeCartaoEl || !validadeEl || !cvvEl) return false;
  const ids = [ "cartao-numero", "cartao-nome-cartao", "cartao-validade", "cartao-cvv", "cartao-parcelas" ];
  ids.forEach(id => {
    if (window.limparErroCampo) window.limparErroCampo(id);
  });
  const parcelas = parcelasEl.value;
  if (!parcelas) {
    window.mostrarErroCampo("cartao-parcelas", siteConfig.cartao.validar.parcelasObrigatorio);
    return false;
  }
  const numero = normalizarDigitos(numeroEl.value);
  if (!numero || numero.length < 13 || !validarNumeroCartaoLuhn(numero)) {
    window.mostrarErroCampo("cartao-numero", "número do cartão inválido.");
    return false;
  }
  const nomeCartao = String(nomeCartaoEl.value || "").trim();
  if (!nomeCartao || !window.validarNomeCompleto(nomeCartao)) {
    window.mostrarErroCampo("cartao-nome-cartao", "Informe o nome completo como no cartão.");
    return false;
  }
  const validade = normalizarDigitos(validadeEl.value);
  if (!validade || !validarValidadeCartao(validade)) {
    window.mostrarErroCampo("cartao-validade", "Validade inválida.");
    return false;
  }
  const cvv = normalizarDigitos(cvvEl.value);
  const bandeiraId = detectarBandeiraPorBin(numero.slice(0, 6));
  const cvvEsperado = bandeiraId === "amex" ? 4 : 3;
  if (!cvv || cvv.length !== cvvEsperado) {
    window.mostrarErroCampo("cartao-cvv", `CVV inválido. Use ${cvvEsperado} dígitos.`);
    return false;
  }
  Object.assign(cartaoFormData, {
    nomeCartao: nomeCartao,
    parcelas: parcelas,
    cartao: {
      numero: numero,
      holderName: nomeCartao,
      validade: validade,
      cvv: cvv
    }
  });
  window.cartaoFormData = cartaoFormData;
  return true;
}

function detectarBandeiraPorBin(bin = "") {
  const valor = String(bin);
  if (valor.length < 1) return "";
  const startsWithAny = prefixes => prefixes.some(p => valor.startsWith(p));
  const eloPrefixes = [ "636368", "438935", "504175", "451416", "636297", "506699", "5067", "4576", "4011" ];
  if (startsWithAny(eloPrefixes)) return "elo";
  if (valor.startsWith("34") || valor.startsWith("37")) return "amex";
  const first2 = parseInt(valor.slice(0, 2), 10);
  if (first2 >= 51 && first2 <= 55) return "master";
  if (valor.startsWith("4")) return "visa";
  if (valor.startsWith("38") || valor.startsWith("60")) return "hipercard";
  return "";
}

function nomeBandeiraCartao(id = "") {
  const mapa = {
    visa: "Visa",
    master: "Mastercard",
    amex: "Amex",
    elo: "Elo",
    diners: "Diners",
    aura: "Aura",
    hipercard: "Hipercard"
  };
  return mapa[id] || id.toUpperCase();
}

async function postJsonCartao(url, payload, timeoutMs = 15e4) {
  const controller = new AbortController;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (err) {
    if (err && err.name === "AbortError") {
      throw new Error("Tempo limite excedido ao processar o pagamento. Tente novamente.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
  let json = null;
  try {
    const texto = await resp.text();
    json = texto ? JSON.parse(texto) : null;
  } catch (e) {
    json = null;
  }
  if (!resp.ok || !json || !json.sucesso) {
    const msg = json && json.erro || (resp.ok ? siteConfig.pagamento.falhaLink : "Falha no servidor.");
    throw new Error(msg);
  }
  return json;
}

async function enviarPagamentoCartao() {
  const total = obterTotalParcelasSelecionadas() || calcularTotalFinal("cartao");
  const nomeCompleto = (cartaoFormData.nomeCompleto || checkoutState.nome || "Convidado").trim();
  const [firstName, ...lastNameParts] = nomeCompleto.split(/\s+/);
  const lastName = lastNameParts.join(" ");
  const itensDescricao = carrinho.map(item => `${item.qtd}x ${item.produto.nome}`).join(" | ");
  const idsProdutos = carrinho.flatMap(item => Array(item.qtd).fill(item.produto.id));
  const parcelas = Math.max(parseInt(cartaoFormData.parcelas, 10) || 1, 1);
  const basePayload = {
    transaction_amount: total,
    description: itensDescricao || siteConfig.pix.pagamento.descricaoPadrao,
    installments: parcelas,
    payer: {
      email: cartaoFormData.email || "",
      first_name: firstName || "Convidado",
      last_name: lastName || "",
      identification: {
        type: "CPF",
        number: cartaoFormData.cpf || ""
      },
      phone: {
        number: cartaoFormData.telefone || ""
      },
      address: {
        zip_code: cartaoFormData.cep || "",
        number: cartaoFormData.numeroEndereco || ""
      }
    },
    metadata: {
      ids_produtos: idsProdutos,
      mensagem: checkoutState.mensagem || "",
      modelo_cartao: checkoutState.modeloCartao || "",
      cartao_personalizado: checkoutState.cartaoSelecionado ? 1 : 0,
      tentativa_id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
    }
  };
  // Asaas não tokeniza no navegador: os dados do cartão são enviados ao backend,
  // que os repassa ao Asaas. Limpamos o cartão da memória logo após o envio.
  const cartao = cartaoFormData.cartao || {};
  const card = {
    number: cartao.numero || "",
    holder_name: cartao.holderName || cartaoFormData.nomeCartao || cartaoFormData.nomeCompleto || "",
    expiration: cartao.validade || "",
    ccv: cartao.cvv || ""
  };
  let paymentJson;
  try {
    paymentJson = await postJsonCartao("/api/cartao", {
      ...basePayload,
      card
    });
  } finally {
    delete cartaoFormData.cartao;
    window.cartaoFormData = cartaoFormData;
  }
  return {
    status: paymentJson.status || "pending",
    id: paymentJson.id || "",
    status_token: paymentJson.status_token || ""
  };
}

function iniciarPagamentoCartao(opcoes = {}) {
  const {onSuccess: onSuccess, onFinally: onFinally} = opcoes;
  if (carrinho.length === 0) return;
  const idsProdutos = carrinho.flatMap(item => Array(item.qtd).fill(item.produto.id));
  const totalMin = calcularTotalFinal("cartao");
  if (!validarValorMinimoPagamento(totalMin)) {
    if (typeof onFinally === "function") onFinally();
    return;
  }
  if (cartaoFormData.nomeCompleto) {
    checkoutState.nome = cartaoFormData.nomeCompleto;
  }
  const btnConcluir = document.getElementById("btn-avancar-cartao");
  if (btnConcluir) {
    btnConcluir.disabled = true;
    btnConcluir.textContent = siteConfig.cartao.pagamento.gerando;
  }
  exibirModalProcessandoCartao();
  enviarPagamentoCartao().then(result => {
    const statusRaw = typeof result === "string" ? result : result.status;
    const statusToken = result && typeof result === "object" ? result.status_token || "" : "";
    const status = mapEfiStatus(statusRaw);
    if (status === "approved") {
      window.limparDadosPagamento();
      atualizarDisponibilidadePresentesAposPagamento(idsProdutos);
      atualizarModalProcessandoCartao("approved");
      fecharModalCartaoDados(true);
    } else if (status === "pending") {
      fecharModalCartaoDados(true);
      atualizarModalProcessandoCartao("pending", siteConfig.cartao.pagamento.pendente);
      iniciarMonitoramentoStatusCartao(statusToken, idsProdutos);
    } else {
      atualizarModalProcessandoCartao("error", "Pagamento não aprovado.");
    }
    if (typeof onSuccess === "function") onSuccess(status);
  }).catch(err => {
    const msg = err.message || siteConfig.cartao.pagamento.erroGerar;
    window.mostrarFeedbackCheckout(msg);
    atualizarModalProcessandoCartao("error", msg);
  }).finally(() => {
    if (btnConcluir) {
      btnConcluir.disabled = false;
      btnConcluir.textContent = siteConfig.cartao.botaoAvancar;
    }
    if (typeof onFinally === "function") onFinally();
  });
}

function traduzirErroMpCartao(mensagem = "") {
  if (!mensagem) return "";
  const mapa = {
    Invalid_card_number_length: "número do cartão incompleto.",
    invalid_card_number_length: "número do cartão incompleto.",
    invalid_card_number: "número do cartão inválido.",
    Invalid_card_number: "número do cartão inválido.",
    invalid_expiration_date: "Validade inválida.",
    Invalid_expiration_date: "Validade inválida.",
    invalid_security_code: "CVV inválido.",
    Invalid_security_code: "CVV inválido.",
    invalid_card_token_id: "não foi possível validar o cartão. Tente novamente.",
    Invalid_card_token_id: "não foi possível validar o cartão. Tente novamente.",
    invalid_card_number_length: "número do cartão incompleto.",
    invalid_length: "número do cartão incompleto.",
    cc_rejected_call_for_authorize: "cartão recusado. Ligue para a operadora.",
    cc_rejected_bad_filled_date: "Data de validade incorreta.",
    cc_rejected_bad_filled_other: "Revise os dados do cartão.",
    cc_rejected_bad_filled_security_code: "CVV incorreto.",
    cc_rejected_blacklist: "cartão bloqueado.",
    cc_rejected_call_for_authorize: "cartão recusado. Ligue para a operadora.",
    cc_rejected_card_disabled: "cartão desativado.",
    cc_rejected_card_error: "não foi possível processar o cartão.",
    cc_rejected_duplicated_payment: "Pagamento duplicado.",
    cc_rejected_high_risk: "Pagamento recusado por risco.",
    cc_rejected_insufficient_amount: "Saldo insuficiente.",
    cc_rejected_invalid_installments: "Parcelas inválidas.",
    cc_rejected_max_attempts: "Muitas tentativas. Tente novamente mais tarde.",
    cc_rejected_other_reason: "Pagamento recusado. Tente novamente.",
    "Not valid action, the resource is in a state that does not allow this operation. For more information see the state that has the resource.": "não foi possível concluir o pagamento agora. Tente novamente em instantes."
  };
  const limpa = String(mensagem).trim();
  if (mapa[limpa]) return mapa[limpa];
  const chave = limpa.split(" ")[0];
  return mapa[chave] || limpa;
}

function fecharModalCartaoDados(manterBloqueio = false) {
  const overlay = document.getElementById("modal-cartao-dados-overlay");
  if (overlay) overlay.remove();
  if (!manterBloqueio) {
    liberarScrollModal();
  }
}

function pararMonitoramentoStatusCartao(overlay = null) {
  const alvo = overlay || document.getElementById("cartao-processando-overlay");
  if (!alvo || !alvo.dataset.cartaoStatusPoll) return;
  const timerId = parseInt(alvo.dataset.cartaoStatusPoll, 10);
  if (Number.isFinite(timerId)) {
    clearTimeout(timerId);
  }
  delete alvo.dataset.cartaoStatusPoll;
}

function iniciarMonitoramentoStatusCartao(statusToken, idsProdutos = []) {
  const overlay = document.getElementById("cartao-processando-overlay");
  if (!overlay || !statusToken) return;
  let tentativas = 0;
  const limiteTentativas = 36;
  const consultar = async () => {
    if (!overlay.isConnected) return;
    pararMonitoramentoStatusCartao(overlay);
    tentativas += 1;
    try {
      const resp = await fetch("/api/pagamento-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: statusToken,
          force: true
        })
      });
      const json = resp.ok ? await lerJsonComFallback(resp) : null;
      if (json && json.sucesso === true) {
        const status = mapEfiStatus(json.status);
        if (status === "approved") {
          window.limparDadosPagamento();
          atualizarDisponibilidadePresentesAposPagamento(idsProdutos);
          atualizarModalProcessandoCartao("approved");
          return;
        }
        if (status === "rejected") {
          atualizarModalProcessandoCartao("error", "Pagamento não aprovado.");
          return;
        }
      }
    } catch (err) {}
    if (tentativas < limiteTentativas && overlay.isConnected) {
      const timerId = window.setTimeout(consultar, tentativas < 12 ? 1e4 : 3e4);
      overlay.dataset.cartaoStatusPoll = String(timerId);
    }
  };
  consultar();
}

function exibirModalProcessandoCartao() {
  const overlayId = "cartao-processando-overlay";
  let overlay = document.getElementById(overlayId);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.className = "pix-overlay";
    document.body.appendChild(overlay);
  }
  bloquearScrollModal();
  pararMonitoramentoStatusCartao(overlay);
  overlay.innerHTML = `\n    <div class="pix-modal">\n      <button id="fechar-cartao-processo" class="pix-fechar" aria-label="${siteConfig.ui.fecharAria}" style="display:none;">&times;</button>\n      <div class="pix-header">\n        <div class="pix-header-icon pix-header-icon--logo">\n          <img class="pix-logo-img" src="${versionarImagemUrl("img/icones/cartao-logo.webp")}" alt="cartão" draggable="false">\n        </div>\n        <div>\n          <h3 id="cartao-processo-titulo">${siteConfig.cartao.pagamento.gerando}</h3>\n          <p id="cartao-processo-status">Aguarde alguns instantes.</p>\n        </div>\n      </div>\n      <div id="cartao-processo-spinner" class="spinner"></div>\n      <div class="pix-aprovado oculto" id="cartao-processo-resultado">\n        <div class="pix-aprovado-icon">\n          <img class="pix-aprovado-img" id="cartao-processo-icone" src="${versionarImagemUrl("img/icones/pix-ok.webp")}" alt="OK" draggable="false">\n        </div>\n        <div class="pix-aprovado-texto">\n          <strong id="cartao-processo-resultado-titulo"></strong>\n          <p id="cartao-processo-resultado-texto"></p>\n        </div>\n      </div>\n      <p class="pix-rodape">${siteConfig.cartao.modal.rodape}</p>\n      <div class="pix-seguro">\n        <img class="compra-segura-img compra-segura-img--rodape" src="${versionarImagemUrl("img/icones/compra-segura.webp")}" alt="Compra segura" draggable="false">\n      </div>\n    </div>\n  `;
  const fechar = overlay.querySelector("#fechar-cartao-processo");
  if (fechar) {
    fechar.addEventListener("click", () => {
      pararMonitoramentoStatusCartao(overlay);
      overlay.remove();
      liberarScrollModal();
    });
  }
  atualizarModalProcessandoCartao("processing");
  return overlay;
}

function atualizarModalProcessandoCartao(status, mensagem = "") {
  const overlay = document.getElementById("cartao-processando-overlay");
  if (!overlay) return;
  const tituloEl = overlay.querySelector("#cartao-processo-titulo");
  const statusEl = overlay.querySelector("#cartao-processo-status");
  const spinner = overlay.querySelector("#cartao-processo-spinner");
  const resultado = overlay.querySelector("#cartao-processo-resultado");
  const resTitulo = overlay.querySelector("#cartao-processo-resultado-titulo");
  const resTexto = overlay.querySelector("#cartao-processo-resultado-texto");
  const resIcone = overlay.querySelector("#cartao-processo-icone");
  const fecharBtn = overlay.querySelector("#fechar-cartao-processo");
  if (status === "processing") {
    if (tituloEl) tituloEl.textContent = siteConfig.cartao.pagamento.gerando;
    if (statusEl) statusEl.textContent = "Aguarde alguns instantes.";
    if (spinner) spinner.style.display = "block";
    if (resultado) resultado.classList.add("oculto");
    if (fecharBtn) fecharBtn.style.display = "none";
    return;
  }
  if (spinner) spinner.style.display = "none";
  if (resultado) resultado.classList.remove("oculto");
  if (fecharBtn) fecharBtn.style.display = "inline-flex";
  if (status === "approved") {
    if (resultado) resultado.classList.remove("is-erro");
    if (resIcone) resIcone.src = versionarImagemUrl("img/icones/pix-ok.webp");
    if (tituloEl) tituloEl.textContent = siteConfig.cartao.modal.aprovadoTitulo;
    if (statusEl) statusEl.textContent = siteConfig.cartao.pagamento.sucesso;
    if (resTitulo) resTitulo.textContent = siteConfig.cartao.modal.aprovadoTitulo;
    if (resTexto) resTexto.textContent = siteConfig.cartao.modal.aprovadoTexto;
    return;
  }
  if (status === "pending") {
    if (resultado) resultado.classList.add("is-erro");
    if (resIcone) resIcone.src = versionarImagemUrl("img/icones/erro.webp");
    if (tituloEl) tituloEl.textContent = "Pagamento pendente";
    if (statusEl) statusEl.textContent = siteConfig.cartao.pagamento.pendente;
    if (resTitulo) resTitulo.textContent = "Pagamento pendente";
    if (resTexto) resTexto.textContent = mensagem || "Estamos confirmando o pagamento. Aguarde.";
    return;
  }
  if (resultado) resultado.classList.add("is-erro");
  if (resIcone) resIcone.src = versionarImagemUrl("img/icones/erro.webp");
  if (tituloEl) tituloEl.textContent = "Pagamento não aprovado";
  if (statusEl) statusEl.textContent = mensagem || siteConfig.cartao.pagamento.erroGerar;
  if (resTitulo) resTitulo.textContent = "Pagamento não aprovado";
  if (resTexto) resTexto.textContent = mensagem || siteConfig.cartao.pagamento.erroGerar;
}

function mapEfiStatus(status = "") {
  const s = String(status).toUpperCase();
  if ([ "APPROVED", "PAID", "RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "CONCLUIDA", "SETTLED", "PAID_OUT" ].includes(s)) {
    return "approved";
  }
  if ([ "REFUNDED", "CHARGEBACK", "CANCELED", "CANCELLED", "OVERDUE", "PAYMENT_DELETED", "REJECTED", "REPROVED", "DECLINED", "REFUSED", "FAILED", "REMOVIDA_PELO_USUARIO_RECEBEDOR", "REMOVIDA_PELO_PSP" ].includes(s)) {
    return "rejected";
  }
  return "pending";
}

window.limparCartaoFormulario = limparCartaoFormulario;

window.mostrarFormularioCartaoPessoal = mostrarFormularioCartaoPessoal;

window.mostrarFormularioCartao = mostrarFormularioCartao;

window.mostrarFormularioCartaoDetalhes = mostrarFormularioCartaoDetalhes;

window.iniciarPagamentoCartao = iniciarPagamentoCartao;

export { cartaoFormData, limparCartaoFormulario, mostrarFormularioCartaoPessoal, mostrarFormularioCartao, mostrarFormularioCartaoDetalhes, calcularTotalComJuros, obterTotalParcelasSelecionadas, sanitizarTextoParcela, normalizarParcelasSelect, preencherParcelasSimuladas, limitarParcelasSelect, atualizarTotalCartaoModal, atualizarParcelasMp, atualizarStatusParcelas, validarFormularioCartaoPessoal, validarFormularioCartao, detectarBandeiraPorBin, nomeBandeiraCartao, enviarPagamentoCartao, iniciarPagamentoCartao, fecharModalCartaoDados, pararMonitoramentoStatusCartao, iniciarMonitoramentoStatusCartao, exibirModalProcessandoCartao, atualizarModalProcessandoCartao, traduzirErroMpCartao, mapEfiStatus };
