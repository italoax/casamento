const volumeVideoStorageKey = "volumeVideoCasal";

function normalizarVolumeVideo(valor, fallback = .5) {
  const volume = Number(valor);
  if (!Number.isFinite(volume)) return fallback;
  return Math.max(0, Math.min(1, volume));
}

function lerVolumeVideoPersistido() {
  try {
    const volumeSalvo = localStorage.getItem(volumeVideoStorageKey);
    if (volumeSalvo === null) return null;
    return normalizarVolumeVideo(volumeSalvo, .5);
  } catch (e) {
    return null;
  }
}

function salvarVolumeVideoPersistido(volume) {
  try {
    localStorage.setItem(volumeVideoStorageKey, String(normalizarVolumeVideo(volume, .5)));
  } catch (e) {}
}

function iniciarVideoCasal() {
  const players = document.querySelectorAll("[data-video-player]");
  if (!players.length) return;
  const formatarTempo = segundos => {
    if (!Number.isFinite(segundos)) return "0:00";
    const minutos = Math.floor(segundos / 60);
    const resto = Math.floor(segundos % 60);
    return `${minutos}:${String(resto).padStart(2, "0")}`;
  };
  players.forEach(player => {
    const video = player.querySelector("video");
    const botao = player.querySelector(".video-toggle");
    const overlay = player.querySelector(".video-play");
    const barra = player.querySelector(".video-range");
    const volume = player.querySelector(".video-volume");
    const tempo = player.querySelector(".video-time");
    if (!video || !botao || !overlay || !barra || !tempo) return;
    let ocultarTimer = null;
    let estavaTocando = false;
    barra.disabled = true;
    const reproduzirComSeguranca = () => {
      const tentativa = video.play();
      if (tentativa && typeof tentativa.catch === "function") {
        tentativa.catch(() => {});
      }
    };
    const mostrarControles = () => {
      player.classList.remove("controls-hidden");
      if (ocultarTimer) {
        clearTimeout(ocultarTimer);
      }
      if (!video.paused && !video.ended) {
        ocultarTimer = setTimeout(() => {
          player.classList.add("controls-hidden");
        }, 2e3);
      }
    };
    const atualizarEstado = () => {
      const tocando = !video.paused && !video.ended;
      player.classList.toggle("is-playing", tocando);
      botao.setAttribute("aria-label", tocando ? "Pausar" : "Reproduzir");
      overlay.setAttribute("aria-label", tocando ? "Pausar" : "Reproduzir");
      if (tocando) {
        mostrarControles();
      } else {
        player.classList.remove("controls-hidden");
        if (ocultarTimer) clearTimeout(ocultarTimer);
      }
    };
    const atualizarTempo = () => {
      tempo.textContent = formatarTempo(video.currentTime);
    };
    const atualizarBarra = () => {
      if (!Number.isFinite(video.duration) || video.duration === 0) {
        barra.value = 0;
        return;
      }
      barra.value = String(video.currentTime);
    };
    const alternarPlay = () => {
      if (video.paused || video.ended) {
        reproduzirComSeguranca();
      } else {
        video.pause();
      }
    };
    botao.addEventListener("click", alternarPlay);
    video.addEventListener("click", alternarPlay);
    [ "mousemove", "touchstart", "keydown" ].forEach(evento => {
      player.addEventListener(evento, mostrarControles);
    });
    const iniciarInteracaoBarra = event => {
      event.stopPropagation();
      estavaTocando = !video.paused && !video.ended;
      mostrarControles();
    };
    [ "pointerdown", "mousedown", "touchstart" ].forEach(evento => {
      barra.addEventListener(evento, iniciarInteracaoBarra);
    });
    const aplicarSeekNaBarra = () => {
      if (!Number.isFinite(video.duration) || video.duration === 0) return;
      const alvo = Number(barra.value);
      if (!Number.isFinite(alvo)) return;
      if (video.seekable && video.seekable.length) {
        const inicio = video.seekable.start(0);
        const fim = video.seekable.end(video.seekable.length - 1);
        const destino = Math.min(Math.max(alvo, inicio), fim);
        video.currentTime = destino;
      } else {
        video.currentTime = alvo;
      }
      atualizarTempo();
      atualizarBarra();
    };
    barra.addEventListener("input", event => {
      event.stopPropagation();
      if (!estavaTocando && !video.paused && !video.ended) {
        estavaTocando = true;
      }
      mostrarControles();
    });
    barra.addEventListener("change", event => {
      event.stopPropagation();
      const precisaRetomar = estavaTocando;
      aplicarSeekNaBarra();
      mostrarControles();
      if (precisaRetomar) {
        reproduzirComSeguranca();
      }
      estavaTocando = false;
    });
    const finalizarInteracaoBarra = event => {
      event.stopPropagation();
      if (!estavaTocando) return;
      if (video.paused || video.ended) {
        reproduzirComSeguranca();
      }
      estavaTocando = false;
    };
    [ "pointerup", "mouseup", "touchend", "touchcancel" ].forEach(evento => {
      barra.addEventListener(evento, finalizarInteracaoBarra);
    });
    const volumePadrao = normalizarVolumeVideo(volume?.value, .5);
    const volumePersistido = lerVolumeVideoPersistido();
    const volumeInicial = volumePersistido === null ? volumePadrao : volumePersistido;
    video.volume = volumeInicial;
    video.muted = false;
    if (volume) {
      const aplicarVolume = (valor, fallback = volumeInicial) => {
        const novoVolume = normalizarVolumeVideo(valor, fallback);
        video.volume = novoVolume;
        video.muted = false;
        volume.value = String(novoVolume);
        salvarVolumeVideoPersistido(novoVolume);
      };
      volume.addEventListener("input", () => {
        aplicarVolume(volume.value, video.volume);
        mostrarControles();
      });
      volume.value = String(volumeInicial);
      volume.addEventListener("wheel", event => {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -.05 : .05;
        const atual = normalizarVolumeVideo(volume.value, video.volume);
        const novo = normalizarVolumeVideo(atual + delta, atual);
        aplicarVolume(novo, atual);
        mostrarControles();
      });
    }
    video.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        barra.min = "0";
        barra.max = String(video.duration);
        barra.step = "0.1";
        barra.disabled = false;
      }
      atualizarTempo();
      atualizarBarra();
    });
    video.addEventListener("progress", () => {
      if (video.seekable && video.seekable.length) {
        const fim = video.seekable.end(video.seekable.length - 1);
        if (Number.isFinite(fim) && fim > 0) {
          barra.max = String(fim);
          barra.disabled = false;
        }
      }
    });
    video.addEventListener("timeupdate", () => {
      atualizarTempo();
      atualizarBarra();
    });
    video.addEventListener("play", atualizarEstado);
    video.addEventListener("pause", atualizarEstado);
    video.addEventListener("ended", atualizarEstado);
    atualizarEstado();
    atualizarTempo();
    mostrarControles();
  });
}

export { normalizarVolumeVideo, lerVolumeVideoPersistido, salvarVolumeVideoPersistido, iniciarVideoCasal };
