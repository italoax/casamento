function mostrarErroCampo(idCampo, mensagem) {
  const errorEl = document.getElementById(`erro-${idCampo}`);
  if (!errorEl) return;
  errorEl.textContent = mensagem || "";
  errorEl.classList.remove("oculto");
  const campo = document.getElementById(idCampo);
  if (campo) {
    campo.classList.add("erro");
    campo.setAttribute("aria-invalid", "true");
  }
}

function limparErroCampo(idCampo) {
  const errorEl = document.getElementById(`erro-${idCampo}`);
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.classList.add("oculto");
  }
  const campo = document.getElementById(idCampo);
  if (campo) {
    campo.classList.remove("erro");
    campo.setAttribute("aria-invalid", "false");
  }
}

window.mostrarErroCampo = mostrarErroCampo;

window.limparErroCampo = limparErroCampo;

export { mostrarErroCampo, limparErroCampo };
