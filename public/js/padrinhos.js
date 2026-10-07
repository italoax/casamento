function fecharPreloader() {
  const preloader = document.getElementById("pre-carregamento");
  if (preloader && !preloader.classList.contains("pre-carregamento-oculto")) {
    preloader.classList.add("pre-carregamento-oculto");
    setTimeout(() => preloader.remove(), 500);
  }
  document.body.classList.add("pagina-visivel");
}

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("pagina-visivel");
});

window.addEventListener("load", fecharPreloader);

setTimeout(fecharPreloader, 4e3);

(() => {
  const reducedMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) return;
  const tracks = document.querySelectorAll(".madrinha-fotos-track, .padrinho-fotos-track");
  if (!tracks.length) return;
  const getGap = track => {
    const style = window.getComputedStyle(track);
    return parseFloat(style.columnGap || style.gap || "0") || 0;
  };
  tracks.forEach(track => {
    const items = Array.from(track.children);
    if (items.length < 2) return;
    const viewport = track.parentElement;
    if (!viewport) return;
    track.style.animation = "none";
    track.style.willChange = "transform";
    viewport.style.touchAction = "pan-y";
    items.forEach(item => {
      const clone = item.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });
    const baseCount = items.length;
    let offset = 0;
    let last = performance.now();
    const speedPxPerSecond = 28;
    let halfWidth = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartOffset = 0;
    let autoPauseUntil = 0;
    let pointerMoved = false;
    const recalcHalfWidth = () => {
      const gap = getGap(track);
      let total = 0;
      for (let i = 0; i < baseCount; i += 1) {
        const el = track.children[i];
        if (!el) break;
        total += el.getBoundingClientRect().width;
        if (i < baseCount - 1) total += gap;
      }
      halfWidth = total;
    };
    const normalizeOffset = () => {
      if (halfWidth <= 0) return;
      offset %= halfWidth;
      if (offset < 0) offset += halfWidth;
    };
    const render = () => {
      track.style.transform = `translateX(${-offset}px)`;
    };
    const onPointerDown = event => {
      if (event.button !== undefined && event.button !== 0) return;
      isDragging = true;
      pointerMoved = false;
      autoPauseUntil = performance.now() + 1400;
      dragStartX = event.clientX;
      dragStartOffset = offset;
      viewport.style.cursor = "grabbing";
      if (event.pointerType !== "mouse" && viewport.setPointerCapture) {
        viewport.setPointerCapture(event.pointerId);
      }
    };
    const onPointerMove = event => {
      if (!isDragging) return;
      const dx = event.clientX - dragStartX;
      if (Math.abs(dx) > 6) {
        pointerMoved = true;
      }
      offset = dragStartOffset - dx;
      normalizeOffset();
      render();
    };
    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      autoPauseUntil = performance.now() + 1400;
      viewport.style.cursor = "";
      if (pointerMoved) {
        viewport.dataset.suppressClickUntil = String(Date.now() + 300);
      } else {
        delete viewport.dataset.suppressClickUntil;
      }
      pointerMoved = false;
    };
    recalcHalfWidth();
    window.addEventListener("resize", recalcHalfWidth);
    track.querySelectorAll("img").forEach(img => {
      img.addEventListener("load", recalcHalfWidth, {
        once: true
      });
    });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
    viewport.addEventListener("pointerleave", endDrag);
    const tick = now => {
      const deltaSec = (now - last) / 1e3;
      last = now;
      if (halfWidth <= 0) {
        requestAnimationFrame(tick);
        return;
      }
      if (!isDragging && now >= autoPauseUntil && !document.body.classList.contains("manual-lightbox-open")) {
        offset += speedPxPerSecond * deltaSec;
        normalizeOffset();
      }
      render();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
})();

(() => {
  const gallerySelectors = [ ".madrinha-fotos-track img:not([aria-hidden='true'])", ".padrinho-fotos-track img:not([aria-hidden='true'])" ];
  const allImages = Array.from(document.querySelectorAll(gallerySelectors.join(", ")));
  if (!allImages.length) return;
  const buildUniqueList = images => {
    const list = [];
    const seen = new Set;
    images.forEach(img => {
      const item = {
        src: img.getAttribute("src") || "",
        alt: img.alt || "Imagem"
      };
      const key = `${item.src}|${item.alt}`;
      if (!item.src || seen.has(key)) return;
      seen.add(key);
      list.push(item);
    });
    return list;
  };
  const galleries = [ {
    selector: ".madrinha-fotos-track",
    list: buildUniqueList(Array.from(document.querySelectorAll(".madrinha-fotos-track img:not([aria-hidden='true'])")))
  }, {
    selector: ".padrinho-fotos-track",
    list: buildUniqueList(Array.from(document.querySelectorAll(".padrinho-fotos-track img:not([aria-hidden='true'])")))
  } ].filter(gallery => gallery.list.length > 0);
  if (!galleries.length) return;
  const overlay = document.createElement("div");
  overlay.className = "manual-lightbox";
  overlay.hidden = true;
  overlay.innerHTML = `\n    <button type="button" class="manual-lightbox-close" aria-label="Fechar">&times;</button>\n    <button type="button" class="manual-lightbox-nav manual-lightbox-nav--prev" aria-label="Anterior">&#8249;</button>\n    <img class="manual-lightbox-img" alt="">\n    <button type="button" class="manual-lightbox-nav manual-lightbox-nav--next" aria-label="Próxima">&#8250;</button>\n  `;
  document.body.appendChild(overlay);
  const lightImg = overlay.querySelector(".manual-lightbox-img");
  const btnClose = overlay.querySelector(".manual-lightbox-close");
  const btnPrev = overlay.querySelector(".manual-lightbox-nav--prev");
  const btnNext = overlay.querySelector(".manual-lightbox-nav--next");
  const originalBodyPaddingRight = document.body.style.paddingRight || "";
  let currentGallery = galleries[0].list;
  let currentIndex = 0;
  const updateNavButtons = () => {
    if (!btnPrev || !btnNext) return;
    const lastIndex = Math.max(0, currentGallery.length - 1);
    const hidePrev = currentIndex <= 0;
    const hideNext = currentIndex >= lastIndex;
    btnPrev.classList.toggle("is-hidden", hidePrev);
    btnNext.classList.toggle("is-hidden", hideNext);
    btnPrev.setAttribute("aria-hidden", hidePrev ? "true" : "false");
    btnNext.setAttribute("aria-hidden", hideNext ? "true" : "false");
    btnPrev.disabled = hidePrev;
    btnNext.disabled = hideNext;
  };
  const render = () => {
    const item = currentGallery[currentIndex];
    if (!item || !lightImg) return;
    lightImg.src = item.src;
    lightImg.alt = item.alt;
    updateNavButtons();
  };
  const open = (galleryList, index) => {
    currentGallery = galleryList;
    currentIndex = index;
    render();
    overlay.hidden = false;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.classList.add("manual-lightbox-open");
  };
  const close = () => {
    overlay.hidden = true;
    document.body.classList.remove("manual-lightbox-open");
    document.body.style.paddingRight = originalBodyPaddingRight;
  };
  const prev = () => {
    if (currentIndex <= 0) return;
    currentIndex -= 1;
    render();
  };
  const next = () => {
    const lastIndex = Math.max(0, currentGallery.length - 1);
    if (currentIndex >= lastIndex) return;
    currentIndex += 1;
    render();
  };
  let touchTracking = false;
  let touchStartX = 0;
  let touchStartY = 0;
  const swipeMinDistance = 48;
  const swipeMaxOffAxis = 84;
  if (lightImg) {
    lightImg.addEventListener("touchstart", event => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      touchTracking = true;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, {
      passive: true
    });
    lightImg.addEventListener("touchend", event => {
      if (!touchTracking || event.changedTouches.length !== 1) {
        touchTracking = false;
        return;
      }
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      touchTracking = false;
      if (Math.abs(dx) < swipeMinDistance) return;
      if (Math.abs(dy) > swipeMaxOffAxis) return;
      if (Math.abs(dx) <= Math.abs(dy)) return;
      if (dx < 0) {
        next();
      } else {
        prev();
      }
    }, {
      passive: true
    });
    lightImg.addEventListener("touchcancel", () => {
      touchTracking = false;
    }, {
      passive: true
    });
  }
  allImages.forEach(img => {
    img.addEventListener("click", () => {
      const viewport = img.closest(".madrinha-fotos, .padrinho-fotos");
      const suppressClickUntil = Number(viewport?.dataset.suppressClickUntil || "0");
      if (Date.now() < suppressClickUntil) return;
      const src = img.getAttribute("src") || "";
      const alt = img.alt || "Imagem";
      const track = img.closest(".madrinha-fotos-track, .padrinho-fotos-track");
      const gallery = galleries.find(g => track && track.matches(g.selector)) || galleries[0];
      const index = gallery.list.findIndex(item => item.src === src && item.alt === alt);
      open(gallery.list, index >= 0 ? index : 0);
    });
  });
  if (btnClose) btnClose.addEventListener("click", close);
  if (btnPrev) btnPrev.addEventListener("click", prev);
  if (btnNext) btnNext.addEventListener("click", next);
  overlay.addEventListener("click", event => {
    if (event.target === overlay) close();
  });
  document.addEventListener("keydown", event => {
    if (overlay.hidden) return;
    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft") prev();
    if (event.key === "ArrowRight") next();
  });
})();

(() => {
  const secoes = document.querySelectorAll(".secao-aparecer");
  if (!secoes.length) return;
  if (!("IntersectionObserver" in window)) {
    secoes.forEach(secao => secao.classList.add("visivel"));
    return;
  }
  const observador = new IntersectionObserver(entradas => {
    entradas.forEach(entrada => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("visivel");
        observador.unobserve(entrada.target);
      }
    });
  }, {
    threshold: .15
  });
  secoes.forEach(secao => observador.observe(secao));
  setTimeout(() => {
    secoes.forEach(secao => secao.classList.add("visivel"));
  }, 1500);
})();

(() => {
  const alvo = new Date("2026-08-16T15:30:00-03:00").getTime();
  const elDias = document.getElementById("cd-dias");
  const elHoras = document.getElementById("cd-horas");
  const elMin = document.getElementById("cd-minutos");
  const elSeg = document.getElementById("cd-segundos");
  if (!(elDias && elHoras && elMin && elSeg)) return;
  const atualizar = () => {
    const agora = Date.now();
    const diff = Math.max(0, alvo - agora);
    const totalSeg = Math.floor(diff / 1e3);
    const dias = Math.floor(totalSeg / 86400);
    const horas = Math.floor(totalSeg % 86400 / 3600);
    const minutos = Math.floor(totalSeg % 3600 / 60);
    const segundos = totalSeg % 60;
    elDias.textContent = String(dias);
    elHoras.textContent = String(horas).padStart(2, "0");
    elMin.textContent = String(minutos).padStart(2, "0");
    elSeg.textContent = String(segundos).padStart(2, "0");
  };
  atualizar();
  setInterval(atualizar, 1e3);
})();

(() => {
  const links = document.querySelectorAll(".manual-botao[href*='#']");
  if (!links.length) return;
  links.forEach(link => {
    link.addEventListener("click", () => {
      const url = new URL(link.href, window.location.href);
      const hash = url.hash || "";
      try {
        sessionStorage.removeItem("retornoModalPagamento");
        if (hash) {
          sessionStorage.setItem("secaoScrollAtual", hash);
        }
      } catch (e) {}
    });
  });
})();
