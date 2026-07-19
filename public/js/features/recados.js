import { registrarLogSiteCliente } from "../core/logger.js";

const siteConfig = window.siteConfig;

async function lerJsonComFallback(response) {
  const texto = await response.text();
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch (e) {
    throw new Error("Resposta inválida.");
  }
}

const turnstileSiteKeyGlobal = String(siteConfig?.recados?.turnstileSiteKey || "").trim();

let turnstileLoaderPromise = null;

function carregarTurnstile() {
  if (!turnstileSiteKeyGlobal) return Promise.resolve(null);
  if (window.turnstile && window.turnstile.render) {
    return Promise.resolve(window.turnstile);
  }
  if (turnstileLoaderPromise) return turnstileLoaderPromise;
  turnstileLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile || null);
    script.onerror = () => reject(new Error("turnstile_load_failed"));
    document.head.appendChild(script);
  });
  return turnstileLoaderPromise;
}

// Gera um token do Turnstile sob demanda. Renderiza um widget invisível (só aparece
// se o Cloudflare exigir interação) e resolve com o token quando o desafio passa.
// O nome é mantido por compatibilidade com pix.js/cartao.js.
async function getRecaptchaTokenForAction(action = "generic") {
  if (!turnstileSiteKeyGlobal) return "";
  const turnstile = await carregarTurnstile();
  if (!turnstile || !turnstile.render) {
    throw new Error("Falha ao carregar verificacao de seguranca.");
  }
  return new Promise((resolve, reject) => {
    const container = document.createElement("div");
    // Fica invisível com appearance "interaction-only"; se um desafio aparecer,
    // posicionamos no rodapé central para o usuário conseguir resolver.
    container.style.cssText = "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:99999;";
    document.body.appendChild(container);
    let settled = false;
    let widgetId = null;
    const finalize = (fn, arg) => {
      if (settled) return;
      settled = true;
      try { if (widgetId !== null) turnstile.remove(widgetId); } catch (e) {}
      container.remove();
      fn(arg);
    };
    try {
      widgetId = turnstile.render(container, {
        sitekey: turnstileSiteKeyGlobal,
        action: action,
        appearance: "interaction-only",
        callback: token => finalize(resolve, token),
        "error-callback": () => finalize(reject, new Error("Falha ao validar verificacao de seguranca.")),
        "timeout-callback": () => finalize(reject, new Error("Tempo de verificacao esgotado."))
      });
    } catch (e) {
      finalize(reject, e);
    }
  });
}

function bloquearCopiaImagens() {
  document.addEventListener("contextmenu", event => {
    if (event.target.closest("img")) {
      event.preventDefault();
    }
  });
  document.addEventListener("dragstart", event => {
    if (event.target.closest("img")) {
      event.preventDefault();
    }
  });
}

function iniciarRecados() {
  const form = document.getElementById("form-recado");
  const lista = document.getElementById("lista-recados");
  const feedback = document.getElementById("recado-feedback");
  const botao = document.getElementById("btn-enviar-recado");
  const turnstileSiteKey = turnstileSiteKeyGlobal;
  if (!form || !lista) return;
  const mostrarFeedback = (mensagem, tipo = "") => {
    if (!feedback) return;
    feedback.textContent = mensagem || "";
    feedback.classList.remove("erro", "sucesso");
    if (tipo) feedback.classList.add(tipo);
  };
  let pararCarrossel = null;
  let carrosselResize = null;
  const criarRecadoItem = recado => {
    const item = document.createElement("article");
    item.className = "recado-item";
    const nome = document.createElement("h3");
    nome.textContent = recado.nome || "Convidado";
    const mensagem = document.createElement("p");
    mensagem.textContent = recado.mensagem || "";
    item.appendChild(nome);
    item.appendChild(mensagem);
    return item;
  };
  const renderizarRecados = recados => {
    if (pararCarrossel) {
      pararCarrossel();
      pararCarrossel = null;
    }
    if (carrosselResize) {
      window.removeEventListener("resize", carrosselResize);
      carrosselResize = null;
    }
    lista.innerHTML = "";
    lista.classList.remove("vazia", "tem-carrossel");

    if (!recados || recados.length === 0) {
      lista.classList.add("vazia");
      return;
    }

    // Apenas 1 recado: mostra fixo, sem carrossel.
    if (recados.length === 1) {
      lista.appendChild(criarRecadoItem(recados[0]));
      return;
    }

    // 2 ou mais: carrossel que passa sozinho.
    lista.classList.add("tem-carrossel");
    const viewport = document.createElement("div");
    viewport.className = "recados-viewport";
    const track = document.createElement("div");
    track.className = "recados-track";
    recados.forEach(recado => {
      const slide = document.createElement("div");
      slide.className = "recado-slide";
      slide.appendChild(criarRecadoItem(recado));
      track.appendChild(slide);
    });
    // Clona o primeiro recado no fim para um loop infinito SEMPRE PARA FRENTE:
    // ao alcançar o clone (idêntico ao 1º), reposicionamos para o início real
    // SEM animação (invisível), em vez de "rebobinar" para trás passando por tudo.
    const total = recados.length;
    const clonePrimeiro = track.firstElementChild.cloneNode(true);
    clonePrimeiro.setAttribute("aria-hidden", "true");
    track.appendChild(clonePrimeiro);
    viewport.appendChild(track);

    const dots = document.createElement("div");
    dots.className = "recados-dots";

    const slides = Array.from(track.children); // total + 1 (com o clone)
    let indice = 0;
    let animandoReset = false;
    const definirTransicao = ativa => { track.style.transition = ativa ? "" : "none"; };
    // Altura PADRÃO fixa para todos os cards (compacta, sem vão vazio grande) —
    // assim o carrossel não "pula" de tamanho. A mensagem que passar dessa altura
    // rola por dentro do card, com um fade indicando que há mais texto.
    const alturaPadrao = () => (window.innerWidth <= 600 ? 240 : 210);
    const aplicarAlturaUniforme = () => {
      viewport.style.height = `${alturaPadrao()}px`;
      viewport.classList.add("altura-fixa");
      // Marca os cards cujo texto ultrapassa a altura (mostra rolagem + fade).
      slides.forEach(s => {
        const p = s.querySelector(".recado-item p");
        const item = s.querySelector(".recado-item");
        if (p && item) item.classList.toggle("recado-item--rola", p.scrollHeight > p.clientHeight + 1);
      });
    };
    const marcarDots = () => {
      const ativo = indice % total;
      dots.querySelectorAll(".recado-dot").forEach((d, di) => d.classList.toggle("ativo", di === ativo));
    };
    const posicionar = () => {
      track.style.transform = `translateX(-${indice * 100}%)`;
      marcarDots();
      const p = slides[indice] && slides[indice].querySelector(".recado-item p");
      if (p) p.scrollTop = 0; // cada card começa a ser lido do topo
    };

    // --- Auto-leitura -------------------------------------------------------
    // Card curto (não rola): fica um tempo e passa. Card longo (texto maior que
    // o card): rola devagar até o fim e só então avança para o próximo.
    const TEMPO_LEITURA = 5000;      // card sem rolagem: tempo na tela
    const PAUSA_ANTES_ROLAR = 1400;  // deixa ler o topo com calma antes de rolar
    const PAUSA_APOS_ROLAR = 2200;   // deixa terminar de ler o fim antes de passar
    const VELOCIDADE_ROLAGEM = 18;   // px por segundo (ritmo de leitura, bem devagar)
    let pausado = false;
    let avancoTimer = null;
    let rolagemRAF = null;
    const limparAgendamento = () => {
      if (avancoTimer) { window.clearTimeout(avancoTimer); avancoTimer = null; }
      if (rolagemRAF) { window.cancelAnimationFrame(rolagemRAF); rolagemRAF = null; }
    };
    const mensagemAtual = () => {
      const slide = slides[indice];
      return slide ? slide.querySelector(".recado-item p") : null;
    };
    const rolarMensagem = p => {
      let ultimo = performance.now();
      // Acumulador em float: o scrollTop é arredondado para inteiro pelo
      // navegador, então somar frações de pixel direto nele travaria em 0.
      let deslocamento = p.scrollTop;
      const passo = agora => {
        const dt = Math.min((agora - ultimo) / 1000, 0.05);
        ultimo = agora;
        deslocamento += VELOCIDADE_ROLAGEM * dt;
        p.scrollTop = deslocamento;
        const maximo = p.scrollHeight - p.clientHeight;
        if (deslocamento >= maximo - 1) {
          p.scrollTop = maximo;
          rolagemRAF = null;
          avancoTimer = window.setTimeout(avancar, PAUSA_APOS_ROLAR); // fim: pausa e passa
          return;
        }
        rolagemRAF = window.requestAnimationFrame(passo);
      };
      rolagemRAF = window.requestAnimationFrame(passo);
    };
    // Agenda o card atual: rolar (se ainda há texto) ou esperar e passar.
    const agendarProximo = () => {
      limparAgendamento();
      if (pausado || animandoReset) return;
      const p = mensagemAtual();
      const temMaisTexto = p && (p.scrollTop + p.clientHeight < p.scrollHeight - 1);
      if (temMaisTexto) {
        avancoTimer = window.setTimeout(() => rolarMensagem(p), PAUSA_ANTES_ROLAR);
      } else {
        avancoTimer = window.setTimeout(avancar, TEMPO_LEITURA);
      }
    };
    // Avança sempre para a direita; ao chegar no clone, volta ao início sem animar.
    function avancar() {
      if (animandoReset) return;
      limparAgendamento();
      indice += 1;
      definirTransicao(true);
      posicionar();
      if (indice === total) {
        animandoReset = true;
        window.setTimeout(() => {
          definirTransicao(false);
          indice = 0;
          posicionar();
          void track.offsetWidth; // força reflow p/ o reset não animar
          definirTransicao(true);
          animandoReset = false;
          agendarProximo(); // lê o card 0 após o reset silencioso
        }, 650);
      } else {
        agendarProximo(); // lê o próximo card real
      }
    }
    const irPara = i => {
      if (animandoReset) return;
      pausado = false; // selecionar uma bolinha sempre retoma/inicia a auto-leitura
      limparAgendamento();
      indice = ((i % total) + total) % total;
      definirTransicao(true);
      posicionar();
      agendarProximo();
    };

    recados.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "recado-dot" + (i === 0 ? " ativo" : "");
      dot.setAttribute("aria-label", `Ver recado ${i + 1}`);
      dot.addEventListener("click", () => {
        irPara(i);
      });
      dots.appendChild(dot);
    });

    lista.appendChild(viewport);
    lista.appendChild(dots);

    // Reposiciona sem animação (usado na medida inicial e no resize).
    const reposicionarSemAnim = () => {
      definirTransicao(false);
      posicionar();
      void track.offsetWidth;
      definirTransicao(true);
    };
    // Altura inicial + reajuste (a fonte serifada carrega depois e muda a altura).
    requestAnimationFrame(aplicarAlturaUniforme);
    window.setTimeout(aplicarAlturaUniforme, 350);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { aplicarAlturaUniforme(); agendarProximo(); }).catch(() => {});
    }
    carrosselResize = () => {
      aplicarAlturaUniforme();
      reposicionarSemAnim();
      agendarProximo(); // a rolagem depende da altura: reavalia após redimensionar
    };
    window.addEventListener("resize", carrosselResize);

    // Pausa enquanto o visitante está lendo (mouse em cima) e retoma ao sair.
    viewport.addEventListener("mouseenter", () => {
      pausado = true;
      limparAgendamento();
    });
    viewport.addEventListener("mouseleave", () => {
      pausado = false;
      agendarProximo();
    });

    // Mobile (sem hover): tocar no card pausa a auto-leitura para a pessoa ler no
    // seu ritmo (e rolar a mensagem na vertical com o dedo); retoma sozinho pouco
    // depois que ela para de interagir. Arrastar na HORIZONTAL troca de recado.
    let retomarToque = null;
    let toqueX = 0;
    let toqueY = 0;
    const cancelarRetomadaToque = () => {
      if (retomarToque) { window.clearTimeout(retomarToque); retomarToque = null; }
    };
    const agendarRetomadaToque = () => {
      cancelarRetomadaToque();
      retomarToque = window.setTimeout(() => {
        retomarToque = null;
        pausado = false;
        agendarProximo();
      }, 3000);
    };
    viewport.addEventListener("touchstart", e => {
      pausado = true;
      cancelarRetomadaToque();
      limparAgendamento();
      const t = e.touches[0];
      toqueX = t ? t.clientX : 0;
      toqueY = t ? t.clientY : 0;
    }, { passive: true });
    viewport.addEventListener("touchend", e => {
      const t = e.changedTouches[0];
      const dx = t ? t.clientX - toqueX : 0;
      const dy = t ? t.clientY - toqueY : 0;
      // Arrasto claramente horizontal → troca de recado (p/ esquerda = próximo).
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) {
          pausado = false;
          avancar();
        } else {
          irPara((indice % total) - 1);
        }
      } else {
        agendarRetomadaToque(); // toque simples ou rolagem vertical: retoma depois
      }
    }, { passive: true });
    viewport.addEventListener("touchcancel", agendarRetomadaToque, { passive: true });

    // Cancela tudo ao re-renderizar a lista (novo conjunto de recados).
    pararCarrossel = () => {
      limparAgendamento();
      cancelarRetomadaToque();
      window.removeEventListener("resize", carrosselResize);
    };

    // Começa a auto-leitura (após a altura inicial ser aplicada).
    window.setTimeout(agendarProximo, 400);
  };
  let assinaturaRecados = null;
  const carregarRecados = async ({ silencioso = false } = {}) => {
    try {
      const resp = await fetch("/api/recados", {
        cache: "no-store"
      });
      const data = await lerJsonComFallback(resp);
      // A API embrulha a resposta como { sucesso, data: { sucesso, recados } }.
      // Desembrulha com fallback caso o formato mude no futuro.
      const payload = (data && data.data) || data;
      if (payload && payload.sucesso) {
        const recados = payload.recados || [];
        const assinatura = JSON.stringify(recados.map(r => [r.id, r.nome, r.mensagem]));
        if (silencioso && assinatura === assinaturaRecados) return; // nada mudou: evita re-render/piscada
        assinaturaRecados = assinatura;
        renderizarRecados(recados);
      } else if (!silencioso) {
        assinaturaRecados = "[]";
        renderizarRecados([]);
      }
    } catch (erro) {
      if (!silencioso) renderizarRecados([]); // em refresh automático, mantém o que já está na tela
    }
  };
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const nome = form.querySelector("#recado-nome")?.value.trim() || "";
    const email = form.querySelector("#recado-email")?.value.trim() || "";
    const mensagem = form.querySelector("#recado-mensagem")?.value.trim() || "";
    const termos = form.querySelector("#recado-termos");
    if (termos && !termos.checked) {
      mostrarFeedback("Aceite os termos para continuar.", "erro");
      return;
    }
    mostrarFeedback("");
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Enviando...";
    }
    try {
      const recaptchaToken = await getRecaptchaTokenForAction("recado");
      const resp = await fetch("/api/recados", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nome: nome,
          email: email,
          mensagem: mensagem,
          recaptchaToken: recaptchaToken
        })
      });
      const data = await lerJsonComFallback(resp);
      if (!data || !data.sucesso) {
        registrarLogSiteCliente("recado", "erro", "Falha no envio de recado pelo cliente.", {
          http_status: resp.status,
          erro: data?.erro || "Resposta invalida"
        });
        mostrarFeedback(data?.erro || "não foi possível enviar.", "erro");
      } else {
        mostrarFeedback("Recado enviado com sucesso! Ele aparecerá após aprovação.", "sucesso");
        form.reset();
        await carregarRecados();
      }
    } catch (erro) {
      registrarLogSiteCliente("recado", "erro", "Erro de conexao ao enviar recado.", {
        erro: erro?.message || String(erro || "")
      });
      mostrarFeedback("Erro ao enviar recado. Tente novamente.", "erro");
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Enviar recado";
      }
    }
  });
  if (turnstileSiteKey) {
    carregarTurnstile().catch(() => {});
  }
  carregarRecados();

  // Atualização automática: recados aprovados no painel aparecem sem dar refresh,
  // igual à lista de presentes (polling a cada 5 min + ao focar/voltar para a aba).
  const atualizarRecadosSilenciosamente = () => {
    if (document.hidden) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    carregarRecados({ silencioso: true });
  };
  window.setInterval(atualizarRecadosSilenciosamente, 3e5);
  window.addEventListener("focus", atualizarRecadosSilenciosamente);
  window.addEventListener("pageshow", atualizarRecadosSilenciosamente);
}

export { lerJsonComFallback, carregarTurnstile, getRecaptchaTokenForAction, bloquearCopiaImagens, iniciarRecados };
