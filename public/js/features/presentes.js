import { arredondarMoeda } from "../utils/formatting.js";

import { versionarImagemUrl } from "../utils/assets.js";

let todosPresentes = [];

let listaAtual = [];

let assinaturaPresentesAtual = "";

let carregandoPresentesAgora = false;

let atualizacaoAutomaticaPresentesIniciada = false;

let intervaloAtualizacaoPresentes = null;

let quantidadeVisivel = 0;

let controlesPresentesConfigurados = false;

function obterQuantidadeInicialPresentes() {
  return window.matchMedia("(max-width: 600px)").matches ? 22 : 21;
}

quantidadeVisivel = obterQuantidadeInicialPresentes();

function nomeBonitoDeArquivoPresente(valor = "") {
  const raw = String(valor || "").trim();
  if (!raw) return "";
  const arquivo = raw.split(/[\\/]/).pop() || raw;
  const semExtensao = arquivo.replace(/\.(jpe?g|png|webp|gif)$/i, "");
  const limpo = semExtensao
    .replace(/-?\d{10,}$/g, "")
    .replace(/_[a-z]{2}(?:_[a-z0-9]+)+/gi, " ")
    .replace(/\b(?:ac|sl|ul|sx|sy|sr|uf|fmwebp|ql\d+|ss\d+|v1|v2)\b/gi, " ")
    .replace(/\b\d{3,5}\b/g, " ")
    .replace(/^[a-z0-9]{6,}\b[\s_-]*/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!limpo || limpo.length < 3) return "Presente";
  return limpo.toLowerCase().replace(/\b([a-záàâãéèêíïóôõöúçñ])/gi, letra => letra.toUpperCase());
}

function nomePresenteExibicao(presente = {}) {
  const nome = String(presente.nome || "").trim();
  const imagem = String(presente.imagem || "").trim();
  const pareceArquivo = /\.(jpe?g|png|webp|gif)$/i.test(nome) || /[_-]\d{10,}(?:\.(?:jpe?g|png|webp|gif))?$/i.test(nome) || /_(?:AC|SL|UL|SX|SY|SR)_/i.test(nome);
  if (nome && !pareceArquivo) return nome;
  return nomeBonitoDeArquivoPresente(nome || imagem);
}

function gerarAssinaturaPresentes(lista = []) {
  if (!Array.isArray(lista)) return "";
  const normalizado = lista.map(p => ({
    id: String(p?.id ?? ""),
    nome: String(p?.nome ?? ""),
    status: String(p?.status ?? ""),
    imagem: String(p?.imagem ?? ""),
    modo_exibicao: String(p?.modo_exibicao ?? ""),
    preco: Number.parseFloat(p?.preco ?? 0) || 0,
    preco_total_referencia: Number.parseFloat(p?.preco_total_referencia ?? 0) || 0,
    quantidade_disponivel: p?.quantidade_disponivel === null || p?.quantidade_disponivel === "" ? null : Number.parseInt(p?.quantidade_disponivel, 10) || 0,
    quantidade_vendida: Number.parseInt(p?.quantidade_vendida, 10) || 0
  })).sort((a, b) => a.id.localeCompare(b.id, "pt-BR", {
    numeric: true
  }));
  return JSON.stringify(normalizado);
}

function normalizarPresenteBruto(presente = {}) {
  if (!presente || typeof presente !== "object") return null;
  const idValor = Number.parseInt(presente.id, 10);
  if (!Number.isInteger(idValor) || idValor <= 0) return null;
  return {
    ...presente,
    id: idValor,
    nome: nomePresenteExibicao(presente),
    status: String(presente.status || "disponivel").trim().toLowerCase(),
    imagem: String(presente.imagem || "").trim(),
    modo_exibicao: String(presente.modo_exibicao || "").trim().toLowerCase(),
    preco: Number.parseFloat(presente.preco || 0) || 0,
    preco_total_referencia: Number.parseFloat(presente.preco_total_referencia ?? presente.preco ?? 0) || 0,
    quantidade_disponivel: presente.quantidade_disponivel === null || presente.quantidade_disponivel === "" || typeof presente.quantidade_disponivel === "undefined" ? null : Number.parseInt(presente.quantidade_disponivel, 10) || 0,
    quantidade_vendida: Number.parseInt(presente.quantidade_vendida, 10) || 0,
    quantidade_reservada: 0
  };
}

function presenteUsaCotas(presente = {}) {
  const modoExibicao = String(presente.modo_exibicao || "").trim().toLowerCase();
  const limiteDefinido = !(presente.quantidade_disponivel === null || presente.quantidade_disponivel === "" || typeof presente.quantidade_disponivel === "undefined");
  const qtdDisponivel = limiteDefinido ? Math.max(0, parseInt(presente.quantidade_disponivel, 10) || 0) : null;
  return modoExibicao === "cotas" || modoExibicao === "" && limiteDefinido && qtdDisponivel !== null && qtdDisponivel > 1;
}

function obterResumoEstoquePresente(presente = {}, opcoes = {}) {
  // O servidor conta a reserva no checkout para TODOS os presentes (inclusive cotas),
  // então contamos aqui também — evita "adicionar no carrinho e ser recusado no fim".
  // As reservas agora se liberam sozinhas quando o Pix expira, então isso é seguro.
  // (opcoes.ignorarReservas é mantido por compatibilidade, mas não é mais usado.)
  void opcoes;
  const limiteDefinido = !(presente.quantidade_disponivel === null || presente.quantidade_disponivel === "" || typeof presente.quantidade_disponivel === "undefined");
  const qtdDisponivel = limiteDefinido ? Math.max(0, parseInt(presente.quantidade_disponivel, 10) || 0) : null;
  const qtdVendida = Math.max(0, Number(presente.quantidade_vendida) || 0);
  const qtdReservada = Math.max(0, Number(presente.quantidade_reservada) || 0);
  const qtdReservadaConsiderada = qtdReservada;
  const qtdComprometida = qtdVendida + qtdReservadaConsiderada;
  const saldoDisponivel = limiteDefinido ? Math.max(0, (qtdDisponivel || 0) - qtdComprometida) : Number.POSITIVE_INFINITY;
  const esgotado = limiteDefinido && qtdDisponivel !== null && qtdComprometida >= qtdDisponivel;
  const indisponivelPorEstoque = limiteDefinido && saldoDisponivel <= 0;
  return {
    limiteDefinido: limiteDefinido,
    qtdDisponivel: qtdDisponivel,
    qtdVendida: qtdVendida,
    qtdReservada: qtdReservada,
    qtdReservadaConsiderada: qtdReservadaConsiderada,
    qtdComprometida: qtdComprometida,
    saldoDisponivel: saldoDisponivel,
    esgotado: esgotado,
    indisponivelPorEstoque: indisponivelPorEstoque
  };
}

function obterPrecoUnitarioPresente(presente = {}) {
  const preco = Number.parseFloat(presente.preco || 0);
  if (!presenteUsaCotas(presente)) {
    return arredondarMoeda(Number.isFinite(preco) ? preco : 0);
  }
  const qtdDisponivel = Math.max(0, parseInt(presente.quantidade_disponivel, 10) || 0);
  if (qtdDisponivel <= 0) {
    return arredondarMoeda(Number.isFinite(preco) ? preco : 0);
  }
  const totalReferencia = Number.parseFloat(presente.preco_total_referencia ?? presente.preco ?? 0);
  const precoSeguro = Number.isFinite(preco) ? preco : 0;
  const totalSeguro = Number.isFinite(totalReferencia) ? totalReferencia : 0;
  const unitarioPorReferencia = qtdDisponivel > 0 ? arredondarMoeda(totalSeguro / qtdDisponivel) : 0;
  if (precoSeguro > 0) {
    if (totalSeguro > 0 && Math.abs(precoSeguro - totalSeguro) <= .01) {
      return unitarioPorReferencia;
    }
    return arredondarMoeda(precoSeguro);
  }
  return unitarioPorReferencia;
}

function atualizarDisponibilidadePresentesAposPagamento() {
  carregarPresentes({
    silencioso: true,
    preservarQuantidadeVisivel: true
  }).catch(() => {});
}

function sincronizarCarrinhoComPresentes(carrinho = []) {
  if (!Array.isArray(carrinho) || carrinho.length === 0) return false;
  const presentesPorId = new Map(todosPresentes.map(presente => [ String(presente.id), presente ]));
  let houveMudanca = false;
  const novoCarrinho = [];
  carrinho.forEach(item => {
    const id = String(item?.produto?.id ?? "");
    const presenteAtual = presentesPorId.get(id);
    if (!presenteAtual) {
      houveMudanca = true;
      return;
    }
    const {saldoDisponivel: saldoDisponivel} = obterResumoEstoquePresente(presenteAtual, {
      ignorarReservas: presenteUsaCotas(presenteAtual)
    });
    const disponivelParaVenda = presenteAtual.status === "disponivel" && saldoDisponivel > 0;
    if (!disponivelParaVenda) {
      houveMudanca = true;
      return;
    }
    const qtdAtual = Math.max(1, parseInt(item.qtd, 10) || 1);
    const qtdAjustada = Math.min(qtdAtual, saldoDisponivel);
    if (qtdAjustada !== qtdAtual) {
      houveMudanca = true;
    }
    novoCarrinho.push({
      produto: presenteAtual,
      qtd: qtdAjustada
    });
  });
  if (houveMudanca || novoCarrinho.length !== carrinho.length) {
    return {
      modificado: true,
      carrinho: novoCarrinho
    };
  }
  return {
    modificado: false,
    carrinho: novoCarrinho
  };
}

function mostrarCarregandoPresentes() {
  const container = document.querySelector(".lista-presentes");
  if (!container) return;
  container.innerHTML = `\n    <p class="lista-presentes__feedback">Carregando presentes...</p>\n  `;
}

function mostrarErroPresentes(mensagem) {
  const container = document.querySelector(".lista-presentes");
  if (!container) return;
  container.innerHTML = `\n    <div class="lista-presentes__feedback lista-presentes__feedback--erro" role="alert">\n      <span class="lista-presentes__feedback-icone" aria-hidden="true">!</span>\n      <h3>Ops, tivemos um problema</h3>\n      <p>${mensagem}</p>\n      <button type="button" class="botao botao-secundario lista-presentes__retry" id="btn-recarregar-presentes">Tentar novamente</button>\n    </div>\n  `;
  const btn = document.getElementById("btn-recarregar-presentes");
  if (btn) {
    btn.addEventListener("click", () => carregarPresentes());
  }
}

function configurarControlesPresentes() {
  if (controlesPresentesConfigurados) return;
  const selectOrdenacao = document.getElementById("ordenar-presentes");
  if (selectOrdenacao) {
    selectOrdenacao.addEventListener("change", aplicarOrdenacao);
  }
  const btnMais = document.getElementById("carregar-mais-presentes");
  if (btnMais) {
    btnMais.addEventListener("click", () => {
      quantidadeVisivel += obterQuantidadeInicialPresentes();
      renderizarPresentes(listaAtual);
    });
  }
  window.addEventListener("resize", ajustarLayoutFinalPresentes);
  controlesPresentesConfigurados = true;
}

function aplicarOrdenacao(opcoes = {}) {
  const preservarQuantidadeVisivel = !!opcoes.preservarQuantidadeVisivel;
  const select = document.getElementById("ordenar-presentes");
  const criterio = select ? select.value : "az";
  const listaOrdenada = [ ...todosPresentes ];
  if (criterio === "menor-preco") {
    listaOrdenada.sort((a, b) => obterPrecoUnitarioPresente(a) - obterPrecoUnitarioPresente(b));
  } else if (criterio === "maior-preco") {
    listaOrdenada.sort((a, b) => obterPrecoUnitarioPresente(b) - obterPrecoUnitarioPresente(a));
  } else {
    listaOrdenada.sort((a, b) => String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR", {
      sensitivity: "base"
    }));
  }
  listaAtual = listaOrdenada;
  if (!preservarQuantidadeVisivel) {
    quantidadeVisivel = obterQuantidadeInicialPresentes();
  }
  renderizarPresentes(listaAtual);
}

function iniciarAtualizacaoAutomaticaPresentes() {
  if (atualizacaoAutomaticaPresentesIniciada) return;
  atualizacaoAutomaticaPresentesIniciada = true;
  const atualizarSilenciosamente = () => {
    if (document.hidden) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    const secaoPresentes = document.getElementById("presentes");
    if (secaoPresentes) {
      const rect = secaoPresentes.getBoundingClientRect();
      const margem = Math.max(window.innerHeight || 0, 600);
      const secaoForaDeAlcance = rect.bottom < -margem || rect.top > margem * 1.5;
      if (secaoForaDeAlcance) return;
    }
    carregarPresentes({
      silencioso: true,
      preservarQuantidadeVisivel: true
    });
  };
  intervaloAtualizacaoPresentes = window.setInterval(atualizarSilenciosamente, 3e5);
  window.addEventListener("focus", atualizarSilenciosamente);
  window.addEventListener("pageshow", atualizarSilenciosamente);
}

function ajustarLayoutFinalPresentes() {
  const container = document.querySelector(".lista-presentes");
  if (!container) return;
  const cards = Array.from(container.querySelectorAll(".cartao-presente"));
  if (cards.length === 0) return;
  cards.forEach(card => {
    card.style.gridColumn = "";
    card.style.justifySelf = "";
    card.style.width = "";
    card.style.maxWidth = "";
  });
}

async function carregarPresentes(opcoes = {}) {
  const container = document.querySelector(".lista-presentes");
  if (!container) return;
  const haviaDadosEmTela = Array.isArray(listaAtual) && listaAtual.length > 0 || Array.isArray(todosPresentes) && todosPresentes.length > 0;
  const silencioso = !!opcoes.silencioso;
  const preservarQuantidadeVisivel = !!opcoes.preservarQuantidadeVisivel;
  const tentativa = Number.isFinite(opcoes.tentativa) ? Math.max(1, Number(opcoes.tentativa)) : 1;
  const maxTentativas = Number.isFinite(opcoes.maxTentativas) ? Math.max(1, Number(opcoes.maxTentativas)) : 4;
  if (carregandoPresentesAgora) return;
  carregandoPresentesAgora = true;
  if (!silencioso && !haviaDadosEmTela) {
    mostrarCarregandoPresentes();
  }
  let controller = null;
  let timeoutId = null;
  try {
    const url = new URL("/api/presentes", window.location.href);
    url.searchParams.set("t", Date.now().toString());
    if (typeof AbortController !== "undefined") {
      controller = new AbortController;
      timeoutId = window.setTimeout(() => controller.abort(), 2e4);
    }
    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        Accept: "application/json"
      },
      signal: controller ? controller.signal : undefined
    });
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const texto = await response.text();
    let textoLimpo = String(texto || "").replace(/^\uFEFF/, "").trim();
    const primeiroJson = textoLimpo.search(/[\[{]/);
    if (primeiroJson > 0) {
      textoLimpo = textoLimpo.slice(primeiroJson).trim();
    }
    let dados = [];
    try {
      dados = textoLimpo ? JSON.parse(textoLimpo) : [];
    } catch (err) {
      throw new Error("Resposta inválida.");
    }
    if (!Array.isArray(dados) && dados && Array.isArray(dados.data)) {
      dados = dados.data;
    }
    if (!Array.isArray(dados)) {
      throw new Error("Resposta inválida.");
    }
    const dadosNormalizados = dados.map(item => normalizarPresenteBruto(item)).filter(item => item !== null);
    if (dados.length > 0 && dadosNormalizados.length === 0) {
      throw new Error("Lista de presentes inválida.");
    }
    const assinaturaNova = gerarAssinaturaPresentes(dadosNormalizados);
    const mudouLista = assinaturaNova !== assinaturaPresentesAtual;
    if (!mudouLista && silencioso) {
      return;
    }
    assinaturaPresentesAtual = assinaturaNova;
    todosPresentes = dadosNormalizados;
    configurarControlesPresentes();
    aplicarOrdenacao({
      preservarQuantidadeVisivel: preservarQuantidadeVisivel
    });
  } catch (error) {
    if (typeof console !== "undefined" && console.error) {
      console.error("[presentes] falha ao carregar lista:", error);
    }
    const podeTentarNovamente = !silencioso && tentativa < maxTentativas;
    if (podeTentarNovamente) {
      carregandoPresentesAgora = false;
      await new Promise(resolve => setTimeout(resolve, 450));
      return carregarPresentes({
        ...opcoes,
        tentativa: tentativa + 1,
        maxTentativas: maxTentativas
      });
    }
    if (!silencioso) {
      const temCache = Array.isArray(listaAtual) && listaAtual.length > 0 || Array.isArray(todosPresentes) && todosPresentes.length > 0;
      if (temCache) {
        try {
          const listaFallback = Array.isArray(listaAtual) && listaAtual.length > 0 ? listaAtual : Array.isArray(todosPresentes) ? todosPresentes : [];
          if (listaFallback.length > 0) {
            renderizarPresentes(listaFallback);
            return;
          }
        } catch (renderError) {}
      }
      mostrarErroPresentes("Não foi possível carregar a lista de presentes. Tente novamente.");
    }
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    carregandoPresentesAgora = false;
  }
}

function renderizarPresentes(presentes) {
  const container = document.querySelector(".lista-presentes");
  const btnMais = document.getElementById("carregar-mais-presentes");
  const carregarMaisWrap = document.querySelector(".container-carregar-mais");
  if (!container) return;
  container.innerHTML = "";
  if (presentes.length === 0) {
    container.innerHTML = `\n      <div class="lista-presentes__feedback lista-presentes__feedback--vazio" role="status">\n        <h3>Nenhum presente disponível</h3>\n        <p>${window.siteConfig?.presentes?.vazio || "Sem presentes no momento."}</p>\n      </div>\n    `;
    if (btnMais) btnMais.style.display = "none";
    if (carregarMaisWrap) carregarMaisWrap.style.display = "none";
    return;
  }
  const obterColunasVisiveis = () => {
    const template = window.getComputedStyle(container).gridTemplateColumns || "";
    if (!template || template === "none") return 1;
    let colunas = 0;
    let profundidade = 0;
    let emToken = false;
    for (const char of template) {
      if (char === "(") profundidade += 1;
      if (char === ")" && profundidade > 0) profundidade -= 1;
      if (/\s/.test(char) && profundidade === 0) {
        if (emToken) {
          colunas += 1;
          emToken = false;
        }
        continue;
      }
      emToken = true;
    }
    if (emToken) colunas += 1;
    return Math.max(1, colunas);
  };
  let totalParaMostrar = Math.min(quantidadeVisivel, presentes.length);
  const colunasAtuais = obterColunasVisiveis();
  if (colunasAtuais > 1 && totalParaMostrar < presentes.length) {
    const resto = totalParaMostrar % colunasAtuais;
    if (resto !== 0) {
      totalParaMostrar = Math.min(presentes.length, totalParaMostrar + (colunasAtuais - resto));
    }
  }
  if (totalParaMostrar > quantidadeVisivel) {
    quantidadeVisivel = totalParaMostrar;
  }
  const itensParaMostrar = presentes.slice(0, totalParaMostrar);
  itensParaMostrar.forEach(p => {
    const card = document.createElement("div");
    card.className = "cartao-presente";
    const img = document.createElement("img");
    img.src = versionarImagemUrl(p.imagem ? p.imagem : window.siteConfig?.presentes?.placeholderImagem || "");
    img.alt = p.nome;
    img.loading = "lazy";
    img.decoding = "async";
    const h3 = document.createElement("h3");
    h3.textContent = p.nome;
    const preco = document.createElement("p");
    preco.className = "card-presente__preco";
    const precoUnitario = obterPrecoUnitarioPresente(p);
    const presentePorCota = presenteUsaCotas(p);
    preco.textContent = `R$ ${precoUnitario.toLocaleString("pt-BR", {
      minimumFractionDigits: 2
    })}`;
    if (presentePorCota) {
      preco.classList.add("card-presente__preco--cotas");
    }
    const btn = document.createElement("button");
    btn.className = "botao btn-add-presente";
    btn.type = "button";
    const {qtdDisponivel: qtdDisponivel, qtdVendida: qtdVendida, qtdComprometida: qtdComprometida, esgotado: esgotado, indisponivelPorEstoque: indisponivelPorEstoque} = obterResumoEstoquePresente(p, {
      ignorarReservas: presentePorCota
    });
    const exibirProgresso = presentePorCota;
    const percentualConcluido = exibirProgresso && qtdDisponivel !== null && qtdDisponivel > 0 ? Math.max(0, Math.min(100, Math.round(qtdComprometida / qtdDisponivel * 100))) : 0;
    const disponivelParaVenda = p.status === "disponivel" && !indisponivelPorEstoque;
    let progresso = null;
    if (exibirProgresso) {
      progresso = document.createElement("div");
      progresso.className = "card-presente__progresso";
      const progressoBarra = document.createElement("div");
      progressoBarra.className = "card-presente__progresso-barra";
      progressoBarra.setAttribute("aria-hidden", "true");
      const progressoFill = document.createElement("span");
      progressoFill.className = "card-presente__progresso-fill";
      progressoFill.style.width = `${percentualConcluido}%`;
      const progressoTexto = document.createElement("p");
      progressoTexto.className = "card-presente__progresso-texto";
      progressoTexto.textContent = `${percentualConcluido}% concluido`;
      if (qtdDisponivel !== null && qtdDisponivel > 0) {
        const cotasInline = document.createElement("span");
        cotasInline.className = "card-presente__progresso-cotas";
        cotasInline.textContent = ` ${qtdDisponivel} ${qtdDisponivel === 1 ? "cota" : "cotas"}`;
        progressoTexto.appendChild(cotasInline);
      }
      progressoBarra.appendChild(progressoFill);
      progresso.append(progressoBarra, progressoTexto);
    }
    if (disponivelParaVenda) {
      const noCarrinho = typeof window.quantidadeNoCarrinho === "function" ? window.quantidadeNoCarrinho(p.id) : 0;
      if (noCarrinho > 0) {
        // Já está no carrinho: avisa visualmente.
        btn.classList.add("btn-add-presente--no-carrinho");
        if (exibirProgresso) {
          // Cotas: ainda permite contribuir com mais, mostrando quantas já estão no carrinho.
          btn.textContent = `✓ No carrinho (${noCarrinho}) · contribuir +`;
          btn.addEventListener("click", () => {
            if (typeof window.adicionarAoCarrinho === "function") window.adicionarAoCarrinho(p);
          });
        } else {
          // Presente único: botão indica que está no carrinho e abre o carrinho ao clicar.
          btn.textContent = noCarrinho > 1 ? `✓ No carrinho (${noCarrinho})` : "✓ No carrinho";
          btn.setAttribute("aria-label", `${p.nome} já está no carrinho. Toque para ver o carrinho.`);
          btn.addEventListener("click", () => {
            if (typeof window.renderizarCarrinho === "function") window.renderizarCarrinho();
          });
        }
      } else {
        btn.textContent = exibirProgresso ? "Contribuir" : window.siteConfig?.presentes?.botaoPresentear || "Presentear";
        btn.classList.add("botao-presentear-anim");
        btn.addEventListener("click", () => {
          if (typeof window.adicionarAoCarrinho === "function") {
            window.adicionarAoCarrinho(p);
          }
        });
      }
    } else {
      const esgotadoPorVenda = qtdDisponivel !== null && qtdVendida >= qtdDisponivel;
      btn.textContent = esgotadoPorVenda ? "Presenteado" : window.siteConfig?.presentes?.statusVendido || "Indisponível";
      btn.classList.add("btn-add-presente--indisponivel");
      btn.disabled = true;
    }
    card.append(img, h3, preco);
    if (progresso) {
      card.appendChild(progresso);
    }
    card.appendChild(btn);
    container.appendChild(card);
  });
  requestAnimationFrame(() => ajustarLayoutFinalPresentes());
  if (btnMais) {
    if (totalParaMostrar >= presentes.length) {
      btnMais.style.display = "none";
      if (carregarMaisWrap) carregarMaisWrap.style.display = "none";
    } else {
      btnMais.style.display = "";
      if (carregarMaisWrap) carregarMaisWrap.style.display = "";
    }
  }
}

function mostrarListaPresentes() {
  const lista = document.querySelector(".lista-presentes");
  const controles = document.querySelector(".controles-presentes");
  const carregarMais = document.querySelector(".container-carregar-mais");
  const carrinhoContainer = document.getElementById("carrinho-fixo");
  if (lista) {
    lista.style.display = "";
    lista.classList.add("retorno-suave");
  }
  if (controles) controles.style.display = "";
  if (carregarMais) carregarMais.style.display = "";
  if (carrinhoContainer) carrinhoContainer.style.display = "none";
  // Re-renderiza para os botões refletirem o que já está no carrinho ("No carrinho").
  renderizarPresentes(listaAtual);
  const secaoPresentes = document.getElementById("presentes") || lista;
  if (secaoPresentes) {
    const cabecalho = document.querySelector(".cabecalho-principal");
    const offset = cabecalho ? cabecalho.offsetHeight + 12 : 0;
    const destino = Math.max(0, secaoPresentes.getBoundingClientRect().top + window.scrollY - offset);
    window.scrollTo({
      top: destino,
      behavior: "smooth"
    });
  }
  const elementosAnimados = [ lista, controles, carregarMais ].filter(Boolean);
  if (elementosAnimados.length > 0) {
    setTimeout(() => {
      elementosAnimados.forEach(el => el.classList.remove("retorno-suave"));
    }, 600);
  }
}

function obterTodosPresentes() {
  return [ ...todosPresentes ];
}

function obterListaAtual() {
  return [ ...listaAtual ];
}

function obterQuantidadeVisivelPresentes() {
  return quantidadeVisivel;
}

export { todosPresentes, listaAtual, obterQuantidadeInicialPresentes, gerarAssinaturaPresentes, normalizarPresenteBruto, presenteUsaCotas, obterResumoEstoquePresente, obterPrecoUnitarioPresente, atualizarDisponibilidadePresentesAposPagamento, sincronizarCarrinhoComPresentes, mostrarCarregandoPresentes, mostrarErroPresentes, configurarControlesPresentes, aplicarOrdenacao, iniciarAtualizacaoAutomaticaPresentes, ajustarLayoutFinalPresentes, carregarPresentes, renderizarPresentes, mostrarListaPresentes, obterTodosPresentes, obterListaAtual, obterQuantidadeVisivelPresentes };
