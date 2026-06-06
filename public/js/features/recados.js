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
  const renderizarRecados = recados => {
    lista.innerHTML = "";
    if (!recados || recados.length === 0) {
      lista.classList.add("vazia");
      return;
    }
    lista.classList.remove("vazia");
    recados.forEach(recado => {
      const item = document.createElement("article");
      item.className = "recado-item";
      const nome = document.createElement("h3");
      nome.textContent = recado.nome || "Convidado";
      const mensagem = document.createElement("p");
      mensagem.textContent = recado.mensagem || "";
      item.appendChild(nome);
      item.appendChild(mensagem);
      lista.appendChild(item);
    });
  };
  const carregarRecados = async () => {
    try {
      const resp = await fetch("/api/recados", {
        cache: "no-store"
      });
      const data = await lerJsonComFallback(resp);
      if (data && data.sucesso) {
        renderizarRecados(data.recados || []);
      } else {
        renderizarRecados([]);
      }
    } catch (erro) {
      renderizarRecados([]);
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
}

export { lerJsonComFallback, carregarRecaptchaV3, getRecaptchaTokenForAction, bloquearCopiaImagens, iniciarRecados };
