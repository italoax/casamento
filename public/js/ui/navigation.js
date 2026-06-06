const RETORNO_PAGAMENTO_KEY = "retornoModalPagamento";

const SECAO_SCROLL_ATUAL = "secaoScrollAtual";

const SECAO_SCROLL_PERSIST = "secaoScrollAtualPersist";

const SCROLL_Y_ATUAL = "scrollYAtual";

function obterOffsetCabecalho() {
  const cabecalho = document.querySelector(".cabecalho-principal");
  return cabecalho ? Math.ceil(cabecalho.getBoundingClientRect().height) + 12 : 0;
}

function navegarParaSecao(hash, behavior = "smooth") {
  if (!hash || !hash.startsWith("#")) return false;
  const id = hash.slice(1);
  const alvo = id ? document.getElementById(id) : null;
  if (!alvo) return false;
  const destino = Math.max(0, alvo.getBoundingClientRect().top + window.scrollY - obterOffsetCabecalho());
  try {
    history.replaceState(null, "", hash);
  } catch (e) {
    window.location.hash = hash;
  }
  try {
    sessionStorage.setItem(SECAO_SCROLL_ATUAL, hash);
  } catch (e) {}
  window.scrollTo({
    top: destino,
    behavior: behavior
  });
  return true;
}

function aplicarSecaoSolicitadaPorQuery() {
  let secao = "";
  try {
    secao = new URLSearchParams(window.location.search).get("secao") || "";
  } catch (e) {
    secao = "";
  }
  if (!secao) return;
  const id = String(secao).trim().replace(/^#/, "");
  if (!id || !document.getElementById(id)) return;
  const hash = `#${id}`;
  try {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
  } catch (e) {
    window.location.hash = hash;
  }
  try {
    sessionStorage.setItem(SECAO_SCROLL_ATUAL, hash);
    sessionStorage.removeItem(RETORNO_PAGAMENTO_KEY);
  } catch (e) {}
}

function configurarLinksInternos() {
  document.querySelectorAll('a[href*="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const href = link.getAttribute("href") || "";
      if (!href || href === "#") return;
      let url = null;
      try {
        url = new URL(href, window.location.href);
      } catch (e) {
        return;
      }
      const mesmoPath = url.pathname === window.location.pathname;
      if (!mesmoPath || !url.hash) return;
      event.preventDefault();
      navegarParaSecao(url.hash, "smooth");
    });
  });
}

function configurarBotaoVoltarAoTopo() {
  const botao = document.getElementById("btn-topo-mobile");
  if (!botao) return;
  let framePendente = false;
  const atualizarVisibilidade = () => {
    const visivel = window.scrollY > 420;
    botao.classList.toggle("is-visible", visivel);
    botao.setAttribute("aria-hidden", visivel ? "false" : "true");
    framePendente = false;
  };
  const agendarAtualizacao = () => {
    if (framePendente) return;
    framePendente = true;
    window.requestAnimationFrame(atualizarVisibilidade);
  };
  botao.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
  window.addEventListener("scroll", agendarAtualizacao, {
    passive: true
  });
  window.addEventListener("resize", agendarAtualizacao);
  atualizarVisibilidade();
}

function aplicarRetornoModalPagamento() {
  let deveRetornar = false;
  try {
    deveRetornar = sessionStorage.getItem(RETORNO_PAGAMENTO_KEY) === "1";
  } catch (e) {
    deveRetornar = false;
  }
  if (!deveRetornar) return;
  const hashAtual = window.location.hash || "";
  if (hashAtual && hashAtual !== "#presentes") {
    limparRetornoModalPagamento();
    return;
  }
  try {
    history.replaceState(null, "", "#presentes");
  } catch (e) {
    window.location.hash = "#presentes";
  }
  try {
    sessionStorage.setItem(SECAO_SCROLL_ATUAL, "#presentes");
    sessionStorage.removeItem(RETORNO_PAGAMENTO_KEY);
  } catch (e) {}
}

function marcarRetornoModalPagamento() {
  try {
    sessionStorage.setItem(RETORNO_PAGAMENTO_KEY, "1");
  } catch (e) {}
}

function limparRetornoModalPagamento() {
  try {
    sessionStorage.removeItem(RETORNO_PAGAMENTO_KEY);
  } catch (e) {}
}

function obterSecoesMenu() {
  const links = document.querySelectorAll('.menu-nav a[href^="#"]');
  return Array.from(links).map(link => {
    const href = link.getAttribute("href") || "";
    const id = href.startsWith("#") ? href.slice(1) : href;
    return id ? document.getElementById(id) : null;
  }).filter(Boolean);
}

function encontrarSecaoMaisProxima(secoes, referencia) {
  let alvo = null;
  let menorDist = Infinity;
  secoes.forEach(secao => {
    const topo = secao.getBoundingClientRect().top + window.scrollY;
    const dist = Math.abs(referencia - topo);
    if (dist < menorDist) {
      menorDist = dist;
      alvo = secao;
    }
  });
  return alvo;
}

function configurarScrollHashSync() {
  const secoes = obterSecoesMenu();
  if (secoes.length === 0) return;
  const hashInicial = window.location.hash || "";
  let rafId = null;
  let rafPersistScrollId = null;
  let ultimoHash = hashInicial;
  let permitirAtualizacao = !hashInicial;
  let bloquearSincronizacaoAte = hashInicial ? Date.now() + 3200 : 0;
  let hashInicialTravado = Boolean(hashInicial);
  let navType = null;
  if (typeof performance !== "undefined") {
    if (typeof performance.getEntriesByType === "function") {
      navType = performance.getEntriesByType("navigation")[0]?.type || null;
    }
    if (!navType && performance.navigation) {
      navType = performance.navigation.type === 1 ? "reload" : null;
    }
  }
  const isReload = navType === "reload";
  const obterOffsetHeader = () => {
    const cabecalho = document.querySelector(".cabecalho-principal");
    return cabecalho ? cabecalho.offsetHeight + 12 : 0;
  };
  const aplicarHash = hash => {
    if (hash === ultimoHash) return;
    try {
      history.replaceState(null, "", hash);
    } catch (e) {
      window.location.hash = hash;
    }
    ultimoHash = hash;
    try {
      sessionStorage.setItem(SECAO_SCROLL_ATUAL, hash);
    } catch (e) {}
    try {
      localStorage.setItem(SECAO_SCROLL_PERSIST, hash);
    } catch (e) {}
  };
  const atualizarHash = (forcar = false) => {
    rafId = null;
    if (document.body.classList.contains("modal-aberto")) return;
    if (!forcar && !permitirAtualizacao) return;
    if (!forcar && hashInicialTravado) return;
    if (!forcar && bloquearSincronizacaoAte > Date.now()) return;
    const alturaHeader = obterOffsetHeader();
    const referencia = alturaHeader + window.innerHeight * .35;
    const secao = encontrarSecaoMaisProxima(secoes, window.scrollY + referencia);
    if (secao && secao.id) {
      aplicarHash(`#${secao.id}`);
    }
  };
  const persistirHashAtual = () => {
    if (document.body.classList.contains("modal-aberto")) return;
    const alturaHeader = obterOffsetHeader();
    const referencia = alturaHeader + window.innerHeight * .35;
    const secao = encontrarSecaoMaisProxima(secoes, window.scrollY + referencia);
    if (secao && secao.id) {
      const hash = `#${secao.id}`;
      try {
        sessionStorage.setItem(SECAO_SCROLL_ATUAL, hash);
      } catch (e) {}
      try {
        localStorage.setItem(SECAO_SCROLL_PERSIST, hash);
      } catch (e) {}
    }
  };
  const persistirScrollYAtual = () => {
    try {
      sessionStorage.setItem(SCROLL_Y_ATUAL, String(window.scrollY || 0));
    } catch (e) {}
  };
  const ajustarParaHash = () => {
    if (isReload) {
      let scrollSalvo = NaN;
      try {
        scrollSalvo = Number(sessionStorage.getItem(SCROLL_Y_ATUAL));
      } catch (e) {
        scrollSalvo = NaN;
      }
      if (Number.isFinite(scrollSalvo) && scrollSalvo >= 0) {
        window.scrollTo({
          top: Math.max(0, scrollSalvo),
          behavior: "auto"
        });
        permitirAtualizacao = true;
        return;
      }
    }
    const hashAtual = window.location.hash;
    if (!hashAtual) {
      let hashSalvo = "";
      try {
        hashSalvo = sessionStorage.getItem(SECAO_SCROLL_ATUAL) || "";
      } catch (e) {
        hashSalvo = "";
      }
      if (!hashSalvo) {
        try {
          hashSalvo = localStorage.getItem(SECAO_SCROLL_PERSIST) || "";
        } catch (e) {
          hashSalvo = "";
        }
      }
      if (hashSalvo) {
        try {
          history.replaceState(null, "", hashSalvo);
        } catch (e) {
          window.location.hash = hashSalvo;
        }
      }
      permitirAtualizacao = true;
      return;
    }
    const id = hashAtual.slice(1);
    const secao = id ? document.getElementById(id) : null;
    if (!secao) {
      permitirAtualizacao = true;
      return;
    }
    const destino = Math.max(0, secao.getBoundingClientRect().top + window.scrollY - obterOffsetHeader());
    window.scrollTo({
      top: destino,
      behavior: "auto"
    });
    aplicarHash(hashAtual);
    bloquearSincronizacaoAte = Date.now() + 1200;
    setTimeout(() => {
      permitirAtualizacao = true;
    }, 200);
  };
  const reagendarAjusteHashInicial = () => {
    if (!hashInicial) return;
    [ 500, 1400, 2600 ].forEach(delay => {
      setTimeout(() => {
        if (window.location.hash !== hashInicial) return;
        ajustarParaHash();
      }, delay);
    });
  };
  window.addEventListener("scroll", () => {
    if (hashInicialTravado) {
      hashInicialTravado = false;
    }
    if (rafId) return;
    rafId = requestAnimationFrame(atualizarHash);
    if (rafPersistScrollId) return;
    rafPersistScrollId = requestAnimationFrame(() => {
      rafPersistScrollId = null;
      persistirScrollYAtual();
    });
  });
  window.addEventListener("beforeunload", () => {
    atualizarHash(true);
    persistirHashAtual();
    persistirScrollYAtual();
  });
  window.addEventListener("pagehide", () => {
    atualizarHash(true);
    persistirHashAtual();
    persistirScrollYAtual();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      atualizarHash(true);
      persistirScrollYAtual();
    }
  });
  window.addEventListener("load", () => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        ajustarParaHash();
        reagendarAjusteHashInicial();
        if (permitirAtualizacao) {
          atualizarHash();
          setTimeout(atualizarHash, 50);
        }
      }, 0);
    });
  }, {
    once: true
  });
  if (permitirAtualizacao) {
    atualizarHash();
    setTimeout(atualizarHash, 50);
  }
}

function configurarAnimacoesScroll() {
  const secoes = document.querySelectorAll(".secao-aparecer");
  if (secoes.length === 0) return;
  if (!("IntersectionObserver" in window)) {
    secoes.forEach(secao => secao.classList.add("visivel"));
    return;
  }
  const opcoesObservador = {
    threshold: .15
  };
  const observador = new IntersectionObserver(entradas => {
    entradas.forEach(entrada => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("visivel");
        observador.unobserve(entrada.target);
      }
    });
  }, opcoesObservador);
  secoes.forEach(secao => observador.observe(secao));
  setTimeout(() => {
    secoes.forEach(secao => {
      if (!secao.classList.contains("visivel")) {
        secao.classList.add("visivel");
      }
    });
  }, 1500);
}

function configurarCabecalhoAoRolar() {
  const cabecalho = document.querySelector(".cabecalho-principal");
  if (!cabecalho) return;
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      cabecalho.classList.add("rolagem");
    } else {
      cabecalho.classList.remove("rolagem");
    }
  });
}

let hashInicialTravado = false;

function configurarMenuMobile() {
  const botaoMenu = document.querySelector(".alternar-nav");
  const menuNav = document.querySelector(".menu-nav");
  if (!(botaoMenu && menuNav)) return;
  let scrollBloqueadoY = 0;
  const definirEstadoMenu = (abrir, restaurarScroll = true, scrollInicialForcado = null) => {
    menuNav.classList.toggle("ativo", abrir);
    document.body.classList.toggle("menu-aberto", abrir);
    document.documentElement.classList.toggle("menu-aberto", abrir);
    botaoMenu.setAttribute("aria-expanded", abrir ? "true" : "false");
    if (abrir) {
      const scrollAtual = window.scrollY || window.pageYOffset || 0;
      scrollBloqueadoY = Number.isFinite(scrollInicialForcado) ? Math.max(0, Number(scrollInicialForcado)) : scrollAtual;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollBloqueadoY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      requestAnimationFrame(() => {
        const primeiroLink = menuNav.querySelector('a[href^="#"]');
        if (primeiroLink instanceof HTMLElement) {
          primeiroLink.focus({
            preventScroll: true
          });
        }
      });
    } else {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      if (restaurarScroll) {
        window.scrollTo(0, scrollBloqueadoY);
      }
      if (botaoMenu instanceof HTMLElement) {
        botaoMenu.focus({
          preventScroll: true
        });
      }
    }
  };
  botaoMenu.setAttribute("aria-expanded", "false");
  botaoMenu.addEventListener("click", () => {
    const menuAberto = menuNav.classList.contains("ativo");
    if (menuAberto) {
      definirEstadoMenu(false);
      return;
    }
    const alvoInicio = document.getElementById("inicio");
    if (!alvoInicio) {
      definirEstadoMenu(true);
      return;
    }
    try {
      history.replaceState(null, "", "#inicio");
    } catch (e) {
      window.location.hash = "#inicio";
    }
    try {
      sessionStorage.setItem(SECAO_SCROLL_ATUAL, "#inicio");
    } catch (e) {}
    definirEstadoMenu(true, true, 0);
  });
  const botaoFecharMenu = menuNav.querySelector(".menu-nav-close");
  if (botaoFecharMenu) {
    botaoFecharMenu.addEventListener("click", () => definirEstadoMenu(false));
  }
  document.querySelectorAll(".menu-nav a").forEach(link => {
    link.addEventListener("click", event => {
      const href = link.getAttribute("href") || "";
      if (!href.startsWith("#")) {
        definirEstadoMenu(false);
        return;
      }
      const id = href.slice(1);
      const alvo = id ? document.getElementById(id) : null;
      if (!alvo) {
        definirEstadoMenu(false);
        return;
      }
      event.preventDefault();
      hashInicialTravado = false;
      definirEstadoMenu(false, false);
      requestAnimationFrame(() => navegarParaSecao(href, "smooth"));
    });
  });
  document.addEventListener("click", event => {
    if (menuNav.classList.contains("ativo")) {
      if (!menuNav.contains(event.target) && !botaoMenu.contains(event.target)) {
        definirEstadoMenu(false);
      }
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && menuNav.classList.contains("ativo")) {
      definirEstadoMenu(false);
    }
  });
}

export { RETORNO_PAGAMENTO_KEY, SECAO_SCROLL_ATUAL, SECAO_SCROLL_PERSIST, SCROLL_Y_ATUAL, obterOffsetCabecalho, navegarParaSecao, aplicarSecaoSolicitadaPorQuery, configurarLinksInternos, configurarBotaoVoltarAoTopo, aplicarRetornoModalPagamento, marcarRetornoModalPagamento, limparRetornoModalPagamento, obterSecoesMenu, encontrarSecaoMaisProxima, configurarScrollHashSync, configurarAnimacoesScroll, configurarCabecalhoAoRolar, configurarMenuMobile };
