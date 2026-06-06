function liberarScroll() {
  document.documentElement.classList.remove("pagina-carregando");
  if (document.body) {
    document.body.classList.remove("pagina-carregando");
  }
}

function fecharPreloader() {
  const preloader = document.getElementById("pre-carregamento");
  liberarScroll();
  if (preloader && !preloader.classList.contains("pre-carregamento-oculto")) {
    preloader.classList.add("pre-carregamento-oculto");
    setTimeout(() => preloader.remove(), 500);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(fecharPreloader, 150);
  }, {
    once: true
  });
} else {
  setTimeout(fecharPreloader, 150);
}

window.addEventListener("load", () => {
  setTimeout(fecharPreloader, 150);
}, {
  once: true
});

setTimeout(fecharPreloader, 3500);
