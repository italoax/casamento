import { versionarImagemUrl } from "../utils/assets.js";

import { normalizarDigitos, formatarCPF, formatarTelefone, limitarDescricaoPix } from "../utils/formatting.js";

import { validarEmail, validarCPF, validarTelefone } from "../utils/validation.js";

import { normalizarDataIsoParaSP, formatarDataSP } from "../utils/date-utils.js";

import { bloquearScrollModal, liberarScrollModal } from "../core/modals.js";

import { marcarRetornoModalPagamento, limparRetornoModalPagamento } from "../ui/navigation.js";

import { lerJsonComFallback, getRecaptchaTokenForAction } from "../features/recados.js";

import { atualizarDisponibilidadePresentesAposPagamento } from "../features/presentes.js";

import { carrinho, limparCarrinhoPersistido } from "../cart/cart.js";

import { checkoutState, calcularTotalFinal, validarValorMinimoPagamento, limparCheckoutPersistido } from "../cart/checkout.js";

import { registrarLogPagamentoCliente } from "./logging.js";

const siteConfig = window.siteConfig;

const pixFormData = {
  nomeCompleto: "",
  email: "",
  cpf: "",
  telefone: "",
  termos: false
};

window.pixFormData = pixFormData;

const pixStorageKey = "pix_pendente";

function limparPixFormulario() {
  Object.assign(pixFormData, {
    nomeCompleto: "",
    email: "",
    cpf: "",
    telefone: "",
    termos: false
  });
  window.pixFormData = pixFormData;
  const nomeEl = document.getElementById("pix-nome");
  if (nomeEl) {
    nomeEl.value = "";
    if (window.limparErroCampo) window.limparErroCampo("pix-nome");
  }
  const emailEl = document.getElementById("pix-email");
  if (emailEl) {
    emailEl.value = "";
    if (window.limparErroCampo) window.limparErroCampo("pix-email");
  }
  const cpfEl = document.getElementById("pix-cpf");
  if (cpfEl) {
    cpfEl.value = "";
    if (window.limparErroCampo) window.limparErroCampo("pix-cpf");
  }
  const telefoneEl = document.getElementById("pix-telefone");
  if (telefoneEl) {
    telefoneEl.value = "";
    if (window.limparErroCampo) window.limparErroCampo("pix-telefone");
  }
  const termosEl = document.getElementById("pix-termos");
  if (termosEl) {
    termosEl.checked = false;
    if (window.limparErroCampo) window.limparErroCampo("pix-termos");
  }
}

function mostrarFormularioPix() {
  if (document.getElementById("modal-pix-dados-overlay")) return;
  marcarRetornoModalPagamento();
  const totalFinal = calcularTotalFinal();
  const overlay = document.createElement("div");
  overlay.id = "modal-pix-dados-overlay";
  overlay.className = "modal-pagamento-overlay";
  overlay.style.display = "flex";
  overlay.innerHTML = `\n    <div class="modal-pix-form">\n      <button type="button" id="btn-fechar-pix-form" class="btn-fechar-modal" aria-label="${siteConfig.ui.fecharAria}">&times;</button>\n      <h3 class="pagamento-titulo">Insira os seus dados para emissão do QR Code para pagamento</h3>\n      <p class="pagamento-info">Os campos marcados com asterisco (*) são de preenchimento obrigatório.</p>\n      <div class="pix-campos">\n        <label for="pix-nome">${siteConfig.pix.labelNome}*</label>\n        <input type="text" id="pix-nome" class="entrada-confirmacao" value="${pixFormData.nomeCompleto}" required autocomplete="name">\n        <p id="erro-pix-nome" class="erro-msg oculto" aria-live="assertive"></p>\n        <label for="pix-email">${siteConfig.pix.labelEmail}*</label>\n        <small>${siteConfig.pix.textoEmail}</small>\n        <input type="email" id="pix-email" class="entrada-confirmacao" value="${pixFormData.email}" required inputmode="email" autocomplete="email">\n        <p id="erro-pix-email" class="erro-msg oculto" aria-live="assertive"></p>\n        <label for="pix-cpf">${siteConfig.pix.labelCpf}*</label>\n        <input type="text" id="pix-cpf" class="entrada-confirmacao" value="${formatarCPF(pixFormData.cpf)}" required inputmode="numeric" maxlength="14" placeholder="${siteConfig.pix.placeholderCpf}">\n        <p id="erro-pix-cpf" class="erro-msg oculto" aria-live="assertive"></p>\n        <label for="pix-telefone">${siteConfig.pix.labelTelefone}*</label>\n        <input type="text" id="pix-telefone" class="entrada-confirmacao" value="${formatarTelefone(pixFormData.telefone)}" required inputmode="tel" maxlength="16" placeholder="${siteConfig.pix.placeholderTelefone}">\n        <p id="erro-pix-telefone" class="erro-msg oculto" aria-live="assertive"></p>\n      </div>\n      <div class="pix-termo">\n        <input type="checkbox" id="pix-termos" ${pixFormData.termos ? "checked" : ""}>\n        <label for="pix-termos">${siteConfig.pix.termos}</label>\n      </div>\n      <p id="erro-pix-termos" class="erro-msg oculto" aria-live="assertive"></p>\n      <div class="feedback-checkout feedback-checkout-modal" aria-live="assertive"></div>\n      <div class="pix-valor">${siteConfig.pix.valorLabel}: R$ ${totalFinal.toLocaleString("pt-BR", {
    minimumFractionDigits: 2
  })}</div>\n      <div class="pix-seguro pix-seguro--form">\n        <img class="compra-segura-img compra-segura-img--form" src="${versionarImagemUrl("img/icones/compra-segura.webp")}" alt="Compra segura" draggable="false">\n      </div>\n      <div class="pix-acoes">\n        <button type="button" id="btn-voltar-pix" class="botao botao-secundario">${siteConfig.pix.botaoVoltar}</button>\n        <button type="button" id="btn-avancar-pix" class="botao botao-primario">${siteConfig.pix.botaoAvancar}</button>\n      </div>\n      <p id="erro-pix-geral" class="erro-msg oculto" aria-live="assertive"></p>\n    </div>\n  `;
  document.body.appendChild(overlay);
  bloquearScrollModal();
  const limparErrosCartao = () => {
    const ids = [ "cartao-numero", "cartao-validade", "cartao-cvv", "cartao-nome", "cartao-email", "cartao-cpf", "cartao-telefone", "cartao-parcelas", "cartao-termos" ];
    ids.forEach(id => {
      if (window.limparErroCampo) window.limparErroCampo(id);
    });
    const statusEl = overlay.querySelector("#cartao-parcelas-status");
    if (statusEl) statusEl.textContent = "";
    const brandEl = overlay.querySelector("#cartao-brand-icone");
    if (brandEl) {
      brandEl.src = "";
      brandEl.classList.add("oculto");
    }
  };
  limparErrosCartao();
  const fecharOverlay = () => {
    overlay.remove();
    liberarScrollModal();
    limparRetornoModalPagamento();
  };
  const fechar = overlay.querySelector("#btn-fechar-pix-form");
  if (fechar) {
    fechar.addEventListener("click", () => {
      fecharOverlay();
      if (window.definirOpcaoPagamentoSelecionada) window.definirOpcaoPagamentoSelecionada("pix");
    });
  }
  const btnVoltar = overlay.querySelector("#btn-voltar-pix");
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
  const termosCheckbox = overlay.querySelector("#pix-termos");
  if (termosCheckbox) {
    termosCheckbox.addEventListener("change", () => {
      if (window.limparErroCampo) window.limparErroCampo("pix-termos");
    });
  }
  const cpfInput = overlay.querySelector("#pix-cpf");
  if (cpfInput) {
    cpfInput.addEventListener("input", () => {
      cpfInput.value = formatarCPF(cpfInput.value);
    });
  }
  const telefoneInput = overlay.querySelector("#pix-telefone");
  if (telefoneInput) {
    telefoneInput.addEventListener("input", () => {
      telefoneInput.value = formatarTelefone(telefoneInput.value);
    });
  }
  const btnAvancar = overlay.querySelector("#btn-avancar-pix");
  if (btnAvancar) {
    btnAvancar.addEventListener("click", () => {
      if (validarFormularioPix()) {
        const erroGeral = overlay.querySelector("#erro-pix-geral");
        if (erroGeral) {
          erroGeral.textContent = "";
          erroGeral.classList.add("oculto");
        }
        btnAvancar.disabled = true;
        btnAvancar.classList.add("is-loading");
        btnAvancar.setAttribute("aria-label", siteConfig.pix.pagamento.gerarPix);
        btnAvancar.innerHTML = '<span class="botao-loading-bolinha" aria-hidden="true"></span>';
        window.iniciarPagamentoPix({
          onSuccess: () => {
            fecharOverlay();
          },
          onError: msg => {
            if (erroGeral) {
              erroGeral.textContent = msg;
              erroGeral.classList.remove("oculto");
            }
          },
          onFinally: () => {
            btnAvancar.disabled = false;
            btnAvancar.classList.remove("is-loading");
            btnAvancar.removeAttribute("aria-label");
            btnAvancar.textContent = siteConfig.pix.botaoAvancar;
          }
        });
      }
    });
  }
}

function validarFormularioPix() {
  const nomeEl = document.getElementById("pix-nome");
  const emailEl = document.getElementById("pix-email");
  const cpfEl = document.getElementById("pix-cpf");
  const telefoneEl = document.getElementById("pix-telefone");
  const termosEl = document.getElementById("pix-termos");
  if (!nomeEl || !emailEl || !cpfEl || !telefoneEl || !termosEl) return false;
  [ "pix-nome", "pix-email", "pix-cpf", "pix-telefone", "pix-termos" ].forEach(id => {
    if (window.limparErroCampo) window.limparErroCampo(id);
  });
  const nome = nomeEl.value.trim();
  const email = emailEl.value.trim();
  const cpf = normalizarDigitos(cpfEl.value);
  const telefone = normalizarDigitos(telefoneEl.value);
  const exibirPrimeiroErro = (id, mensagem, campo) => {
    window.mostrarErroCampo(id, mensagem);
    if (campo && typeof campo.focus === "function") {
      campo.focus({
        preventScroll: false
      });
    }
    return false;
  };
  if (!nome) {
    return exibirPrimeiroErro("pix-nome", siteConfig.pix.validar.nomeObrigatorio, nomeEl);
  }
  if (!window.validarNomeCompleto(nome)) {
    return exibirPrimeiroErro("pix-nome", siteConfig.pix.validar.nomeCompleto, nomeEl);
  }
  if (!email) {
    return exibirPrimeiroErro("pix-email", siteConfig.pix.validar.emailObrigatorio, emailEl);
  }
  if (!validarEmail(email)) {
    return exibirPrimeiroErro("pix-email", siteConfig.pix.validar.emailInvalido, emailEl);
  }
  if (!cpf) {
    return exibirPrimeiroErro("pix-cpf", siteConfig.pix.validar.cpfObrigatorio, cpfEl);
  }
  if (!validarCPF(cpf)) {
    return exibirPrimeiroErro("pix-cpf", siteConfig.pix.validar.cpfInvalido, cpfEl);
  }
  if (!telefone) {
    return exibirPrimeiroErro("pix-telefone", siteConfig.pix.validar.telefoneObrigatorio, telefoneEl);
  }
  if (!validarTelefone(telefone)) {
    return exibirPrimeiroErro("pix-telefone", siteConfig.pix.validar.telefoneInvalido, telefoneEl);
  }
  if (!termosEl.checked) {
    return exibirPrimeiroErro("pix-termos", siteConfig.pix.validar.termosObrigatorio, termosEl);
  }
  Object.assign(pixFormData, {
    nomeCompleto: nome,
    email: email,
    cpf: cpf,
    telefone: telefone,
    termos: termosEl.checked
  });
  window.pixFormData = pixFormData;
  return true;
}

function iniciarPagamentoPix(callbacks = {}) {
  if (carrinho.length === 0) return;
  const totalMin = calcularTotalFinal();
  if (!validarValorMinimoPagamento(totalMin)) {
    if (typeof callbacks.onError === "function") {
      callbacks.onError(siteConfig.pagamento.valorMinimoMsg);
    }
    if (typeof callbacks.onFinally === "function") {
      callbacks.onFinally();
    }
    return;
  }
  if (pixFormData.nomeCompleto) {
    checkoutState.nome = pixFormData.nomeCompleto;
  }
  if (!pixFormData.email || !validarEmail(pixFormData.email)) {
    if (typeof callbacks.onError === "function") {
      callbacks.onError(siteConfig.pix.validar.emailInvalido);
    } else {
      window.mostrarFeedbackCheckout(siteConfig.pix.validar.emailInvalido);
    }
    if (typeof callbacks.onFinally === "function") {
      callbacks.onFinally();
    }
    return;
  }
  const btnConcluir = document.getElementById("btn-avancar-pix") || document.querySelector(".botao.botao-primario");
  if (btnConcluir) {
    btnConcluir.disabled = true;
    btnConcluir.classList.add("is-loading");
    btnConcluir.setAttribute("aria-label", siteConfig.pix.pagamento.gerarPix);
    btnConcluir.innerHTML = '<span class="botao-loading-bolinha" aria-hidden="true"></span>';
  }
  const total = totalMin;
  const nomeCompleto = (pixFormData.nomeCompleto || checkoutState.nome || "Convidado").trim();
  const [firstName, ...lastNameParts] = nomeCompleto.split(/\s+/);
  const lastName = lastNameParts.join(" ");
  const itensDescricao = carrinho.map(item => `${item.qtd}x ${item.produto.nome}`).join(" | ");
  const idsProdutos = carrinho.flatMap(item => Array(item.qtd).fill(item.produto.id));
  try {
    localStorage.removeItem(pixStorageKey);
  } catch (err) {}
  const payload = {
    transaction_amount: total,
    description: limitarDescricaoPix(itensDescricao),
    payer: {
      email: pixFormData.email || "",
      first_name: firstName || "Convidado",
      last_name: lastName || "",
      identification: {
        type: "CPF",
        number: pixFormData.cpf || ""
      },
      phone: {
        number: pixFormData.telefone || ""
      }
    },
    metadata: {
      ids_produtos: idsProdutos,
      mensagem: checkoutState.mensagem || "",
      modelo_cartao: checkoutState.modeloCartao || "",
      cartao_personalizado: checkoutState.cartaoSelecionado ? 1 : 0
    }
  };
  getRecaptchaTokenForAction("checkout_pix").then(recaptchaToken => {
    payload.recaptchaToken = recaptchaToken;
    return fetch("/api/pix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }).then(async resp => {
    const texto = await resp.text();
    let json = null;
    if (texto) {
      try {
        json = JSON.parse(texto);
      } catch (e) {
        throw new Error("Resposta inválida do servidor.");
      }
    }
    if (!resp.ok || !json || !json.sucesso) {
      throw new Error(json && json.erro || `Falha ao gerar Pix (HTTP ${resp.status || 0}).`);
    }
    if (typeof callbacks.onSuccess === "function") {
      callbacks.onSuccess();
    }
    if (typeof json.total !== "number") {
      json.total = total;
    }
    exibirPix(json);
    limparCarrinhoPersistido();
    limparCheckoutPersistido();
    limparPixFormulario();
    atualizarDisponibilidadePresentesAposPagamento(idsProdutos);
    window.mostrarFeedbackCheckout("");
  }).catch(err => {
    const msg = err.message || siteConfig.pix.pagamento.erroGerar;
    if (typeof callbacks.onError === "function") {
      callbacks.onError(msg);
    } else {
      window.mostrarFeedbackCheckout(msg);
    }
    registrarLogPagamentoCliente("pix", "erro", msg);
  }).finally(() => {
    if (btnConcluir) {
      btnConcluir.disabled = false;
      btnConcluir.classList.remove("is-loading");
      btnConcluir.removeAttribute("aria-label");
      btnConcluir.textContent = siteConfig.pix.botaoAvancar;
    }
    if (typeof callbacks.onFinally === "function") {
      callbacks.onFinally();
    }
  });
}

function exibirPix(dados) {
  const overlayId = "pix-overlay";
  let overlay = document.getElementById(overlayId);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = overlayId;
    overlay.className = "pix-overlay";
    document.body.appendChild(overlay);
  }
  bloquearScrollModal();
  const qrBase64 = dados.qr_code_base64 ? `data:image/png;base64,${dados.qr_code_base64}` : "";
  const qrText = dados.qr_code || "";
  const prazoIso = dados.date_of_expiration || "";
  const prazoRaw = prazoIso ? normalizarDataIsoParaSP(prazoIso) : new Date(Date.now() + 30 * 60 * 1e3);
  const agoraMs = Date.now();
  const maxMs = 24 * 60 * 60 * 1e3;
  let prazo = prazoRaw;
  if (!(prazo instanceof Date) || Number.isNaN(prazo.getTime())) {
    prazo = new Date(agoraMs + 30 * 60 * 1e3);
  } else if (prazo.getTime() - agoraMs > maxMs) {
    prazo = new Date(agoraMs + 30 * 60 * 1e3);
  }
  const prazoFmt = formatarDataSP(prazo);
  const valorTotal = typeof dados.total === "number" ? dados.total : null;
  const valorFmt = valorTotal !== null ? `R$ ${valorTotal.toLocaleString("pt-BR", {
    minimumFractionDigits: 2
  })}` : "";
  overlay.innerHTML = `\n    <div class="pix-modal">\n      <button id="fechar-pix" class="pix-fechar" aria-label="${siteConfig.ui.fecharAria}">&times;</button>\n      <div class="pix-header">\n        <div class="pix-header-icon pix-header-icon--logo">\n          <img class="pix-logo-img" src="${versionarImagemUrl("img/icones/pix-logo.webp")}" alt="Pix" draggable="false">\n        </div>\n        <div>\n          <h3>${siteConfig.pix.modal.titulo}</h3>\n          <p>${siteConfig.pix.modal.descricao}</p>\n        </div>\n      </div>\n      <ol class="pix-instrucoes" id="pix-instrucoes">\n        <li>Acesse a opção Pix no seu Internet Banking ou app de pagamentos.</li>\n        <li>Escaneie o QR Code a seguir ou copie o código do pagamento.</li>\n        <li>Assim que recebermos o pagamento, você receberá uma notificação no e-mail informado.</li>\n      </ol>\n      <div class="pix-aprovado oculto" id="pix-aprovado-msg">\n        <div class="pix-aprovado-icon">\n          <img class="pix-aprovado-img" src="${versionarImagemUrl("img/icones/pix-ok.webp")}" alt="OK" draggable="false">\n        </div>\n        <div class="pix-aprovado-texto">\n          <strong>Pagamento aprovado!</strong>\n          <p>Recebemos seu Pix. Obrigado pelo presente.</p>\n          <span class="pix-aprovado-hora" id="pix-aprovado-hora"></span>\n        </div>\n      </div>\n      <div class="pix-grid">\n      <div class="pix-qr-area" id="pix-qr-area">\n          ${qrBase64 ? `<img src="${qrBase64}" alt="${siteConfig.pix.modal.qrAlt}" class="pix-qr">` : `<div class="pix-qr-indisponivel">${siteConfig.pix.modal.qrIndisponivel}</div>`}\n        </div>\n      <div class="pix-resumo" id="pix-resumo">\n          <div class="pix-resumo-badge">\n            Tempo restante para pagar: <strong id="pix-tempo-restante">${prazoFmt}</strong>\n          </div>\n          ${valorFmt ? `<div class="pix-resumo-valor">Valor: <span>${valorFmt}</span></div>` : ""}\n        </div>\n      </div>\n      <div class="pix-copia" id="pix-copia">\n        <p>Se preferir, copie o código abaixo para realizar o pagamento.</p>\n        <div class="pix-copia-linha">\n          <textarea id="pix-copia-e-cola" class="pix-copia-input" readonly rows="2"></textarea>\n          <button id="copiar-pix" class="pix-copiar-btn">Copiar</button>\n        </div>\n      </div>\n      <div class="pix-status-acoes" id="pix-status-acoes">\n        <span id="pix-status-feedback" class="pix-status-feedback" aria-live="polite">Pagamento ainda pendente. O status será atualizado automaticamente.</span>\n      </div>\n      <p class="pix-rodape" id="pix-rodape">Você também receberá este QR Code por e-mail.</p>\n    </div>\n  `;
  const copiaEl = overlay.querySelector("#pix-copia-e-cola");
  if (copiaEl) copiaEl.value = qrText;
  const fechar = overlay.querySelector("#fechar-pix");
  if (fechar) {
    fechar.addEventListener("click", () => {
      pararContagemPix(overlay);
      overlay.remove();
      liberarScrollModal();
      window.location.href = "/";
    });
  }
  iniciarContagemPix(overlay, prazo);
  const copiar = overlay.querySelector("#copiar-pix");
  if (copiar) {
    copiar.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(qrText);
        copiar.textContent = "Copiado!";
        setTimeout(() => copiar.textContent = "Copiar", 1500);
      } catch (e) {
        copiar.textContent = "Falhou";
        setTimeout(() => copiar.textContent = "Copiar", 1500);
      }
    });
  }
  const monitoramentoPix = iniciarMonitoramentoStatusPix(overlay, dados.status_token);
  const statusFeedbackEl = overlay.querySelector("#pix-status-feedback");
  if (!dados.status_token && statusFeedbackEl) {
    statusFeedbackEl.textContent = "Nao foi possivel iniciar a verificacao automatica.";
  } else if (monitoramentoPix && statusFeedbackEl) {
    statusFeedbackEl.textContent = "Pagamento ainda pendente. O status sera atualizado automaticamente.";
  }
}

function iniciarContagemPix(overlay, prazo) {
  if (!overlay || !(prazo instanceof Date)) return;
  const alvo = prazo.getTime();
  const el = overlay.querySelector("#pix-tempo-restante");
  if (!el) return;
  const atualizar = () => {
    const agora = Date.now();
    const diffMs = alvo - agora;
    if (diffMs <= 0) {
      el.textContent = "Expirado";
      pararContagemPix(overlay);
      return;
    }
    const totalSeg = Math.ceil(diffMs / 1e3);
    const minutos = Math.floor(totalSeg / 60);
    const segundos = totalSeg % 60;
    el.textContent = `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
  };
  atualizar();
  const timer = setInterval(atualizar, 1e3);
  overlay.dataset.pixCountdown = String(timer);
}

function pararContagemPix(overlay) {
  if (!overlay) return;
  if (overlay.dataset.pixCountdown) {
    const timerId = parseInt(overlay.dataset.pixCountdown, 10);
    if (Number.isFinite(timerId)) {
      clearInterval(timerId);
    }
    delete overlay.dataset.pixCountdown;
  }
  pararMonitoramentoStatusPix(overlay);
}

function iniciarMonitoramentoStatusPix(overlay, statusToken) {
  if (!overlay || !statusToken) {
    return {
      atualizarAgora: async () => false
    };
  }
  const limiteTentativas = 36;
  let tentativas = 0;
  let consultaEmAndamento = false;
  const statusFeedbackEl = overlay.querySelector("#pix-status-feedback");
  const definirFeedback = (mensagem = "") => {
    if (statusFeedbackEl) statusFeedbackEl.textContent = mensagem;
  };
  const limparAgendamento = () => {
    if (!overlay || !overlay.dataset.pixStatusPoll) return;
    const timerId = parseInt(overlay.dataset.pixStatusPoll, 10);
    if (Number.isFinite(timerId)) {
      clearTimeout(timerId);
    }
    delete overlay.dataset.pixStatusPoll;
  };
  const obterIntervaloConsultaMs = () => {
    if (tentativas < 12) return 1e4;
    if (tentativas < 24) return 2e4;
    return 6e4;
  };
  const atualizarAprovado = () => {
    const aprovadoEl = overlay.querySelector("#pix-aprovado-msg");
    const horaEl = overlay.querySelector("#pix-aprovado-hora");
    const instrucoesEl = overlay.querySelector("#pix-instrucoes");
    const qrAreaEl = overlay.querySelector("#pix-qr-area");
    const resumoEl = overlay.querySelector("#pix-resumo");
    const copiaEl = overlay.querySelector("#pix-copia");
    const statusAcoesEl = overlay.querySelector("#pix-status-acoes");
    const rodapeEl = overlay.querySelector("#pix-rodape");
    if (aprovadoEl) aprovadoEl.classList.remove("oculto");
    if (instrucoesEl) instrucoesEl.classList.add("oculto");
    if (qrAreaEl) qrAreaEl.classList.add("oculto");
    if (resumoEl) resumoEl.classList.add("oculto");
    if (copiaEl) copiaEl.classList.add("oculto");
    if (statusAcoesEl) statusAcoesEl.classList.add("oculto");
    if (rodapeEl) rodapeEl.textContent = "Pagamento confirmado com sucesso.";
    if (horaEl) horaEl.textContent = `Confirmado em ${(new Date).toLocaleString("pt-BR")}`;
  };
  const agendarProximaConsulta = () => {
    limparAgendamento();
    if (!overlay.isConnected) return;
    if (tentativas >= limiteTentativas) return;
    const timerId = window.setTimeout(consultarStatus, obterIntervaloConsultaMs());
    overlay.dataset.pixStatusPoll = String(timerId);
  };
  const consultarStatus = async (origem = "auto") => {
    if (!overlay.isConnected) return false;
    if (consultaEmAndamento) {
      return false;
    }
    consultaEmAndamento = true;
    if (origem === "auto") {
      tentativas += 1;
    }
    let aprovado = false;
    let encerrado = false;
    try {
      const resp = await fetch("/api/pagamento_status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: statusToken,
          force: false
        })
      });
      if (!resp.ok) {
        return false;
      }
      const json = await lerJsonComFallback(resp);
      if (!json || json.sucesso !== true) {
        return false;
      }
      if (json.status === "approved") {
        aprovado = true;
        window.limparDadosPagamento();
        atualizarAprovado();
        pararContagemPix(overlay);
        definirFeedback("Pagamento confirmado.");
        return true;
      }
      if (json.status === "rejected") {
        encerrado = true;
        window.limparDadosPagamento();
        pararContagemPix(overlay);
        const tempoEl = overlay.querySelector("#pix-tempo-restante");
        if (tempoEl) tempoEl.textContent = "Expirado";
        definirFeedback("Pix expirado. Gere um novo Pix para pagar.");
        registrarLogPagamentoCliente("pix", "expirado", "Pix expirado sem pagamento.");
        return false;
      }
    } catch (err) {
      return false;
    } finally {
      consultaEmAndamento = false;
      if (!aprovado && !encerrado) {
        agendarProximaConsulta();
      }
    }
    return aprovado;
  };
  consultarStatus();
  return {
    atualizarAgora: () => consultarStatus("auto")
  };
}

function pararMonitoramentoStatusPix(overlay) {
  if (!overlay || !overlay.dataset.pixStatusPoll) return;
  const timerId = parseInt(overlay.dataset.pixStatusPoll, 10);
  if (Number.isFinite(timerId)) {
    clearTimeout(timerId);
  }
  delete overlay.dataset.pixStatusPoll;
}

window.limparPixFormulario = limparPixFormulario;

window.mostrarFormularioPix = mostrarFormularioPix;

window.validarFormularioPix = validarFormularioPix;

window.iniciarPagamentoPix = iniciarPagamentoPix;

window.exibirPix = exibirPix;

export { pixFormData, pixStorageKey, limparPixFormulario, mostrarFormularioPix, validarFormularioPix, iniciarPagamentoPix, exibirPix, iniciarContagemPix, pararContagemPix, iniciarMonitoramentoStatusPix, pararMonitoramentoStatusPix };
