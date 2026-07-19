import { bloquearScrollModal, liberarScrollModal } from "../core/modals.js";

// Modal com o vídeo tutorial de "como confirmar presença no celular".
// O vídeo (pesado) só carrega quando a pessoa abre o modal (lazy), deixando a
// página leve.
function iniciarTutorialConfirmacao() {
  const botaoAbrir = document.getElementById("btn-tutorial-confirmacao");
  const overlay = document.getElementById("tutorial-confirmacao-overlay");
  if (!botaoAbrir || !overlay) return;

  // O overlay é escrito dentro da <section> de confirmação, mas essa seção usa
  // transform (animação de "aparecer"), o que prende o position:fixed do modal
  // à seção em vez da tela toda (fundo escuro não cobria o cabeçalho/recados).
  // Movendo para o <body> ele volta a se posicionar pela viewport inteira.
  if (overlay.parentElement !== document.body) {
    document.body.appendChild(overlay);
  }

  const video = overlay.querySelector("video");
  const botaoFechar = overlay.querySelector(".tutorial-video-fechar");

  const abrir = () => {
    // Carrega o arquivo só na primeira abertura (data-src -> src).
    if (video && !video.getAttribute("src") && video.dataset.src) {
      video.src = video.dataset.src;
    }
    overlay.classList.remove("oculto");
    bloquearScrollModal();
    if (video) {
      try {
        // iOS só faz autoplay se o vídeo estiver REALMENTE mudo. O React tem um
        // bug conhecido de não aplicar o atributo "muted" no elemento, então
        // forçamos aqui (property + atributo) junto com o playsInline.
        video.muted = true;
        video.setAttribute("muted", "");
        video.playsInline = true;
        video.currentTime = 0;
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {}); // se o autoplay falhar, há controles
      } catch (e) {}
    }
  };

  const fechar = () => {
    overlay.classList.add("oculto");
    if (video) {
      try { video.pause(); } catch (e) {}
    }
    liberarScrollModal();
  };

  botaoAbrir.addEventListener("click", abrir);
  if (botaoFechar) botaoFechar.addEventListener("click", fechar);
  // Clicar no fundo escuro (fora do vídeo) fecha.
  overlay.addEventListener("click", event => {
    if (event.target === overlay) fechar();
  });
  // Tecla ESC fecha (quando o modal está aberto).
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !overlay.classList.contains("oculto")) fechar();
  });
}

export { iniciarTutorialConfirmacao };
