const seletorOverlaysModalAbertos = ".modal-pagamento-overlay, .pix-overlay, .cartao-preview-overlay";

let estilosScrollModalOriginais = null;

function existeOverlayModalAberto() {
  return Boolean(document.querySelector(seletorOverlaysModalAbertos));
}

function obterUltimoOverlayModalAberto() {
  const overlays = Array.from(document.querySelectorAll(seletorOverlaysModalAbertos)).filter(el => el instanceof HTMLElement && el.isConnected);
  return overlays.length ? overlays[overlays.length - 1] : null;
}

function fecharModalAtivoComEscape() {
  const overlay = obterUltimoOverlayModalAberto();
  if (!overlay) return false;
  const seletoresBotoesFechar = [ "#btn-fechar-modal-pagamento", "#btn-fechar-pix-form", "#btn-fechar-cartao-pessoal", "#btn-fechar-cartao-form", "#fechar-pix", "#fechar-cartao-processo", ".cartao-preview-fechar", ".btn-fechar-modal", ".pix-fechar" ];
  for (const seletor of seletoresBotoesFechar) {
    const botao = overlay.querySelector(seletor);
    if (botao instanceof HTMLButtonElement && !botao.disabled) {
      botao.click();
      return true;
    }
  }
  return false;
}

function bloquearScrollModal() {
  if (estilosScrollModalOriginais) {
    document.body.classList.add("modal-aberto");
    document.documentElement.classList.add("modal-aberto");
    return;
  }
  estilosScrollModalOriginais = {
    paddingRight: document.body.style.paddingRight
  };
  const larguraBarra = window.innerWidth - document.documentElement.clientWidth;
  if (larguraBarra > 0) {
    document.body.style.paddingRight = `${larguraBarra}px`;
  }
  document.body.classList.add("modal-aberto");
  document.documentElement.classList.add("modal-aberto");
}

function liberarScrollModal() {
  if (existeOverlayModalAberto()) return;
  document.body.classList.remove("modal-aberto");
  document.documentElement.classList.remove("modal-aberto");
  if (!estilosScrollModalOriginais) return;
  document.body.style.paddingRight = estilosScrollModalOriginais.paddingRight;
  estilosScrollModalOriginais = null;
}

export { existeOverlayModalAberto, obterUltimoOverlayModalAberto, fecharModalAtivoComEscape, bloquearScrollModal, liberarScrollModal };
