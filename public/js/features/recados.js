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

const recaptchaSiteKeyGlobal = String(siteConfig?.recados?.recaptchaSiteKey || "").trim();

let recaptchaLoaderPromise = null;

function carregarRecaptchaV3() {
  if (!recaptchaSiteKeyGlobal) return Promise.resolve(null);
  if (window.grecaptcha && window.grecaptcha.execute) {
    return new Promise(resolve => {
      if (window.grecaptcha.ready) {
        window.grecaptcha.ready(() => resolve(window.grecaptcha));
      } else {
        resolve(window.grecaptcha);
      }
    });
  }
  if (recaptchaLoaderPromise) return recaptchaLoaderPromise;
  recaptchaLoaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(recaptchaSiteKeyGlobal)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.grecaptcha && window.grecaptcha.ready) {
        window.grecaptcha.ready(() => resolve(window.grecaptcha));
      } else {
        resolve(window.grecaptcha || null);
      }
    };
    script.onerror = () => reject(new Error("recaptcha_load_failed"));
    document.head.appendChild(script);
  });
  return recaptchaLoaderPromise;
}

async function getRecaptchaTokenForAction(action = "generic") {
  if (!recaptchaSiteKeyGlobal) return "";
  const recaptcha = await carregarRecaptchaV3();
  if (!recaptcha || !recaptcha.execute) {
    throw new Error("Falha ao carregar verificacao de seguranca.");
  }
  const token = await recaptcha.execute(recaptchaSiteKeyGlobal, {
    action: action
  });
  if (!token) {
    throw new Error("Falha ao validar verificacao de seguranca.");
  }
  return token;
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
  const recaptchaSiteKey = recaptchaSiteKeyGlobal;
  if (!form || !lista) return;
  const mostrarFeedback = (mensagem, tipo = "") => {
    if (!feedback) return;
    feedback.textContent = mensagem || "";
    feedback.classList.remove("erro", "sucesso");
    if (tipo) feedback.classList.add(tipo);
  };
  let carrosselTimer = null;
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
    if (carrosselTimer) {
      window.clearInterval(carrosselTimer);
      carrosselTimer = null;
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
    viewport.appendChild(track);

    const dots = document.createElement("div");
    dots.className = "recados-dots";

    let indice = 0;
    const irPara = i => {
      indice = (i + recados.length) % recados.length;
      track.style.transform = `translateX(-${indice * 100}%)`;
      dots.querySelectorAll(".recado-dot").forEach((d, di) => d.classList.toggle("ativo", di === indice));
    };

    const reiniciarTimer = () => {
      if (carrosselTimer) window.clearInterval(carrosselTimer);
      carrosselTimer = window.setInterval(() => irPara(indice + 1), 5000);
    };

    recados.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "recado-dot" + (i === 0 ? " ativo" : "");
      dot.setAttribute("aria-label", `Ver recado ${i + 1}`);
      dot.addEventListener("click", () => {
        irPara(i);
        reiniciarTimer();
      });
      dots.appendChild(dot);
    });

    lista.appendChild(viewport);
    lista.appendChild(dots);

    // Pausa enquanto o visitante está lendo (mouse em cima) e retoma ao sair.
    viewport.addEventListener("mouseenter", () => {
      if (carrosselTimer) {
        window.clearInterval(carrosselTimer);
        carrosselTimer = null;
      }
    });
    viewport.addEventListener("mouseleave", reiniciarTimer);

    reiniciarTimer();
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
  if (recaptchaSiteKey) {
    carregarRecaptchaV3().catch(() => {});
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

export { lerJsonComFallback, carregarRecaptchaV3, getRecaptchaTokenForAction, bloquearCopiaImagens, iniciarRecados };
