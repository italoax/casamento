const logClienteEstado = {
  total: 0,
  chaves: new Set
};

function limitarTextoLogCliente(valor, max = 1e3) {
  const texto = String(valor || "").trim();
  return texto.length > max ? texto.slice(0, max) : texto;
}

function registrarLogSiteCliente(tipo, status, mensagem, extra = {}) {
  const token = window.siteConfig?.apiLogToken || "";
  if (!token) return;
  if (!mensagem || logClienteEstado.total >= 25) return;
  const chave = [ tipo, status, mensagem, extra.path || "", extra.line || "", extra.column || "" ].join("|");
  if (logClienteEstado.chaves.has(chave)) return;
  logClienteEstado.chaves.add(chave);
  logClienteEstado.total += 1;
  const headers = {
    "Content-Type": "application/json"
  };
  headers["X-Api-Token"] = token;
  fetch("/api/logs", {
    method: "POST",
    headers: headers,
    keepalive: true,
    body: JSON.stringify({
      kind: tipo === "js" ? "js" : "event",
      tipo: tipo,
      status: status,
      mensagem: limitarTextoLogCliente(mensagem, 1e3),
      level: tipo === "js" ? status : undefined,
      payload: extra,
      url: window.location.href,
      path: window.location.pathname,
      source: extra.source || "",
      line: extra.line || null,
      column: extra.column || null,
      stack: limitarTextoLogCliente(extra.stack || "", 2e3)
    })
  }).catch(() => {});
}

function dadosErroCliente(erro) {
  if (!erro) {
    return {
      mensagem: "Erro JavaScript sem detalhes.",
      stack: ""
    };
  }
  if (erro instanceof Error) {
    return {
      mensagem: erro.message || "Erro JavaScript.",
      stack: erro.stack || ""
    };
  }
  if (typeof erro === "object") {
    let mensagem = erro.message || "";
    if (!mensagem) {
      try {
        mensagem = JSON.stringify(erro).slice(0, 500);
      } catch (e) {
        mensagem = Object.prototype.toString.call(erro);
      }
    }
    return {
      mensagem: mensagem,
      stack: erro.stack || ""
    };
  }
  return {
    mensagem: String(erro),
    stack: ""
  };
}

function inicializarLoggerGlobal() {
  window.registrarLogSiteCliente = registrarLogSiteCliente;
  window.addEventListener("error", event => {
    const alvo = event.target;
    if (alvo && alvo !== window && alvo.tagName) {
      registrarLogSiteCliente("js", "erro", "Falha ao carregar recurso.", {
        source: "resource",
        tag: alvo.tagName,
        url: alvo.currentSrc || alvo.src || alvo.href || ""
      });
      return;
    }
    const dados = dadosErroCliente(event.error || event.message);
    registrarLogSiteCliente("js", "erro", dados.mensagem, {
      source: "window.error",
      line: event.lineno || null,
      column: event.colno || null,
      stack: dados.stack
    });
  });
  window.addEventListener("unhandledrejection", event => {
    const dados = dadosErroCliente(event.reason);
    registrarLogSiteCliente("js", "erro", dados.mensagem, {
      source: "unhandledrejection",
      stack: dados.stack
    });
  });
}

export { registrarLogSiteCliente, inicializarLoggerGlobal };
