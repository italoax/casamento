const siteConfig = window.siteConfig;

function iniciarConfirmacao() {
  if (window.__confirmacaoInicializada) return;
  window.__confirmacaoInicializada = true;
  const btnBuscar = document.getElementById("btn-buscar-convite");
  const inputNome = document.getElementById("nome-convite");
  const listaResultados = document.getElementById("lista-resultados-confirmacao");
  const feedback = document.getElementById("feedback-confirmacao");
  const disponibilidadePrazo = document.getElementById("rsvp-disponibilidade-prazo");
  const areaBusca = document.getElementById("area-busca");
  const formBuscaContainer = areaBusca ? areaBusca.querySelector(".grupo-formulario") : null;
  const areaConfirmacao = document.getElementById("area-processo-confirmacao");
  const nomeConvidadoDestaque = document.getElementById("nome-convidado-destaque");
  const textoValidacaoTelefone = document.getElementById("texto-validacao-telefone");
  const stepValidacao = document.getElementById("step-validacao");
  const stepConfirmacao = document.getElementById("step-confirmacao");
  const inputValidacao = document.getElementById("input-validacao-telefone");
  const btnValidar = document.getElementById("btn-validar-telefone");
  const feedbackValidacao = document.getElementById("feedback-validacao");
  const btnConfirmar = document.getElementById("btn-confirmar-presenca");
  const btnCancelar = document.getElementById("btn-cancelar-confirmacao");
  const botaoMenuMobile = document.querySelector(".alternar-nav");
  const menuNavMobile = document.querySelector(".menu-nav");
  let idSelecionado = null;
  let tokenConfirmacao = "";
  let validacaoEmAndamento = false;
  let cooldownValidacaoAte = 0;
  let cooldownValidacaoTimer = null;
  const textos = siteConfig.confirmacao;
  const mensagens = textos.mensagens;
  const ui = textos.ui;
  const cooldownValidacaoSegundos = 30;
  const tempoMinimoCarregamentoBuscaMs = 1500;
  const mensagemConfirmacaoEncerradaPadrao = "As confirmações de presença foram encerradas.";
  let confirmacaoEncerrada = false;
  let consultaStatusEmAndamento = false;
  let btnLimparBusca = null;
  let buscaSeq = 0; // descarta respostas fora de ordem (busca mais nova vence)
  normalizarEstadoMenuMobile();
  window.addEventListener("pageshow", normalizarEstadoMenuMobile);
  window.addEventListener("focus", () => sincronizarDisponibilidadeConfirmacao({
    silencioso: true
  }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    sincronizarDisponibilidadeConfirmacao({
      silencioso: true
    });
  });
  definirBuscaDisponivel(false);
  sincronizarDisponibilidadeConfirmacao();
  if (btnBuscar && inputNome) {
    btnBuscar.addEventListener("click", () => buscarConvite());
    inputNome.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        buscarConvite();
      }
    });
    // Apenas mostra/esconde o "×" de limpar conforme o usuário digita.
    inputNome.addEventListener("input", atualizarBotaoLimpar);
    criarBotaoLimparBusca();
  }
  if (btnValidar && inputValidacao) {
    btnValidar.addEventListener("click", validarConvite);
    inputValidacao.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        animarBotaoValidar();
        validarConvite();
      }
    });
  }
  if (inputValidacao) {
    inputValidacao.addEventListener("input", e => e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4));
  }
  async function lerJsonSeguro(response) {
    try {
      return await response.json();
    } catch (error) {
      return null;
    }
  }
  async function aguardarTempoMinimoCarregamento(inicioMs) {
    const decorrido = Date.now() - inicioMs;
    const restante = tempoMinimoCarregamentoBuscaMs - decorrido;
    if (restante > 0) {
      await new Promise(resolve => setTimeout(resolve, restante));
    }
  }
  async function sincronizarDisponibilidadeConfirmacao({silencioso: silencioso = false} = {}) {
    if (consultaStatusEmAndamento) return;
    consultaStatusEmAndamento = true;
    try {
      const response = await fetch("/api/convidados?acao=status", {
        cache: "no-store"
      });
      const dados = await lerJsonSeguro(response);
      if (!response.ok || !dados) {
        if (!confirmacaoEncerrada) {
          definirBuscaDisponivel(true);
          if (!silencioso) atualizarAvisoPrazo(null);
        }
        return;
      }
      if (dados.encerrado === true) {
        atualizarAvisoPrazo(null);
        bloquearConfirmacaoPorPrazo(dados.mensagem || mensagemConfirmacaoEncerradaPadrao);
        return;
      }
      desbloquearConfirmacaoPorPrazo(dados.data_limite_texto, dados.data_limite);
    } catch (error) {
      if (!confirmacaoEncerrada) {
        definirBuscaDisponivel(true);
        if (!silencioso) atualizarAvisoPrazo(null);
      }
    } finally {
      consultaStatusEmAndamento = false;
    }
  }
  function definirBuscaDisponivel(disponivel) {
    if (confirmacaoEncerrada) return;
    if (inputNome) inputNome.disabled = !disponivel;
    if (btnBuscar) btnBuscar.disabled = !disponivel;
  }
  function formatarPrazoIsoParaTexto(iso) {
    if (typeof iso !== "string" || iso.trim() === "") return "";
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "";
    try {
      return dt.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).replace(",", "");
    } catch (error) {
      return "";
    }
  }
  function atualizarAvisoPrazo(dataLimiteTexto, dataLimiteIso = null) {
    if (!disponibilidadePrazo) return;
    const prazoTextoBruto = typeof dataLimiteTexto === "string" ? dataLimiteTexto.trim() : "";
    const prazoTexto = prazoTextoBruto || formatarPrazoIsoParaTexto(dataLimiteIso);
    if (!prazoTexto) {
      disponibilidadePrazo.textContent = "";
      disponibilidadePrazo.classList.add("oculto");
      return;
    }
    // Insere "às" entre data e hora (ex.: "01/07/2026 21:00" -> "01/07/2026 às 21:00").
    const prazoLegivel = prazoTexto.replace(/(\d{2}\/\d{2}\/\d{4})\s+(\d{1,2}:\d{2})/, "$1 às $2");
    disponibilidadePrazo.textContent = `Pedimos a gentileza de confirmar sua presença até ${prazoLegivel}. Após essa data, as confirmações serão encerradas.`;
    disponibilidadePrazo.classList.remove("oculto");
  }
  function mensagemIndicaEncerramentoRsvp(mensagem) {
    if (typeof mensagem !== "string") return false;
    const normalizada = mensagem.toLowerCase();
    return normalizada.includes("encerrad");
  }
  function bloquearConfirmacaoPorPrazo(mensagem) {
    confirmacaoEncerrada = true;
    const texto = typeof mensagem === "string" && mensagem.trim() !== "" ? mensagem.trim() : mensagemConfirmacaoEncerradaPadrao;
    if (cooldownValidacaoTimer) {
      clearInterval(cooldownValidacaoTimer);
      cooldownValidacaoTimer = null;
    }
    cooldownValidacaoAte = 0;
    validacaoEmAndamento = false;
    if (listaResultados) {
      listaResultados.innerHTML = "";
      listaResultados.classList.add("oculto");
    }
    atualizarAvisoPrazo(null);
    if (formBuscaContainer) formBuscaContainer.classList.remove("oculto");
    if (areaConfirmacao) areaConfirmacao.classList.add("oculto");
    if (areaBusca) areaBusca.classList.remove("oculto");
    idSelecionado = null;
    tokenConfirmacao = "";
    if (inputNome) inputNome.disabled = true;
    if (btnBuscar) {
      btnBuscar.classList.remove("oculto");
      btnBuscar.disabled = true;
    }
    if (inputValidacao) inputValidacao.disabled = true;
    if (btnValidar) btnValidar.disabled = true;
    if (btnConfirmar) btnConfirmar.disabled = true;
    if (btnCancelar) btnCancelar.disabled = true;
    mostrarLoader(false);
    mostrarFeedback(texto, "aviso");
    ocultarFeedbackValidacao();
  }
  function desbloquearConfirmacaoPorPrazo(dataLimiteTexto, dataLimiteIso = null) {
    const estavaEncerrada = confirmacaoEncerrada;
    confirmacaoEncerrada = false;
    atualizarAvisoPrazo(dataLimiteTexto, dataLimiteIso);
    definirBuscaDisponivel(true);
    if (!estavaEncerrada) return;
    idSelecionado = null;
    tokenConfirmacao = "";
    validacaoEmAndamento = false;
    if (listaResultados) {
      listaResultados.innerHTML = "";
      listaResultados.classList.add("oculto");
    }
    if (formBuscaContainer) formBuscaContainer.classList.remove("oculto");
    if (areaConfirmacao) areaConfirmacao.classList.add("oculto");
    if (areaBusca) areaBusca.classList.remove("oculto");
    if (btnBuscar) {
      btnBuscar.classList.remove("oculto");
      btnBuscar.disabled = false;
    }
    if (inputValidacao) inputValidacao.disabled = false;
    if (btnValidar) btnValidar.disabled = false;
    if (btnConfirmar) btnConfirmar.disabled = false;
    if (btnCancelar) btnCancelar.disabled = false;
    ocultarFeedbackValidacao();
    ocultarFeedback();
  }
  function criarBotaoLimparBusca() {
    if (!inputNome || !inputNome.parentElement || btnLimparBusca) return;
    // Embrulha o input para posicionar o "×" de limpar dentro do campo.
    const wrap = document.createElement("div");
    wrap.className = "busca-convite-wrap";
    inputNome.parentElement.insertBefore(wrap, inputNome);
    wrap.appendChild(inputNome);
    btnLimparBusca = document.createElement("button");
    btnLimparBusca.type = "button";
    btnLimparBusca.className = "limpar-busca-convite oculto";
    btnLimparBusca.setAttribute("aria-label", "Limpar busca");
    btnLimparBusca.textContent = "×";
    wrap.appendChild(btnLimparBusca);
    btnLimparBusca.addEventListener("click", () => {
      inputNome.value = "";
      buscaSeq++; // invalida buscas em voo
      mostrarLoader(false);
      limparResultados();
      ocultarFeedback();
      atualizarBotaoLimpar();
      inputNome.focus();
    });
  }
  function atualizarBotaoLimpar() {
    if (!btnLimparBusca || !inputNome) return;
    btnLimparBusca.classList.toggle("oculto", inputNome.value.trim().length === 0);
  }
  async function buscarConvite() {
    if (!inputNome) return;
    if (confirmacaoEncerrada) {
      mostrarFeedback(mensagemConfirmacaoEncerradaPadrao, "aviso");
      return;
    }
    const termo = inputNome.value.trim();
    if (termo.length < 3) {
      mostrarFeedback(mensagens.buscaMinimo, "erro");
      return;
    }
    // Fecha o teclado do celular ao pesquisar (libera a tela para a lista).
    inputNome.blur();
    const seq = ++buscaSeq;
    const inicioCarregamento = Date.now();
    const esperaMin = () => aguardarTempoMinimoCarregamento(inicioCarregamento);
    mostrarLoader(true);
    ocultarFeedback();
    if (btnBuscar) btnBuscar.disabled = true;
    try {
      const response = await fetch(`/api/convidados?acao=buscar&nome=${encodeURIComponent(termo)}`);
      const dados = await lerJsonSeguro(response);
      if (seq !== buscaSeq) return; // chegou uma busca mais nova — ignora esta
      const erroResposta = dados && dados.erro || mensagens.buscaFalha;
      if (dados && dados.encerrado === true || mensagemIndicaEncerramentoRsvp(erroResposta)) {
        await esperaMin();
        if (seq !== buscaSeq) return;
        mostrarLoader(false);
        bloquearConfirmacaoPorPrazo(erroResposta);
        return;
      }
      if (!response.ok) {
        throw new Error(erroResposta);
      }
      if (!dados) {
        throw new Error(mensagens.buscaFalha);
      }
      await esperaMin();
      if (seq !== buscaSeq) return;
      mostrarLoader(false);
      if (dados.erro) {
        limparResultados();
        mostrarFeedback(dados.erro, "erro");
      } else if (dados.length === 0) {
        limparResultados();
        mostrarFeedback(mensagens.buscaNaoEncontrado, "aviso");
      } else {
        exibirResultados(dados);
      }
    } catch (error) {
      if (seq !== buscaSeq) return;
      await esperaMin();
      mostrarLoader(false);
      const mensagemErro = error && error.message ? error.message : mensagens.conexaoErro;
      if (mensagemIndicaEncerramentoRsvp(mensagemErro)) {
        bloquearConfirmacaoPorPrazo(mensagemErro);
        return;
      }
      limparResultados();
      mostrarFeedback(mensagemErro, "erro");
    } finally {
      if (seq === buscaSeq) {
        mostrarLoader(false);
        if (!confirmacaoEncerrada && btnBuscar) btnBuscar.disabled = false;
      }
    }
  }
  function exibirResultados(convidados) {
    if (!listaResultados) return;
    listaResultados.classList.remove("oculto");
    listaResultados.innerHTML = "";
    // Mantém o campo de busca visível para o convidado refinar enquanto digita.
    const liResumo = document.createElement("li");
    liResumo.className = "resultado-resumo";
    const totalConvites = convidados.length;
    const plural = totalConvites !== 1 ? "s" : "";
    liResumo.textContent = ui.resultadoResumo.replace("{{total}}", totalConvites).replace(/{{s}}/g, plural);
    listaResultados.appendChild(liResumo);
    convidados.forEach(c => {
      const li = document.createElement("li");
      li.className = "item-resultado";
      const nomeSpan = document.createElement("span");
      nomeSpan.className = "resultado-nome";
      nomeSpan.textContent = c.nome;
      const telSpan = document.createElement("span");
      telSpan.className = "resultado-telefone";
      let telTexto = c.telefone || "";
      let telLimpo = telTexto.replace(/\D/g, "");
      let telFormatado = telTexto;
      if (telLimpo.length >= 2) {
        const ddd = telLimpo.substring(0, 2);
        let part1 = telLimpo.substring(2, 7);
        if (part1.length < 5) {
          part1 = part1 + "X".repeat(5 - part1.length);
        }
        telFormatado = `(${ddd}) ${part1}-XXXX`;
      } else {
        telFormatado = ui.telNaoInformado;
      }
      telSpan.textContent = `${ui.telPrefixo} ${telFormatado}`;
      const btn = document.createElement("button");
      btn.className = "resultado-acao";
      if (c.status === "confirmado") {
        btn.textContent = ui.botaoConfirmado;
        btn.classList.add("botao-pequeno", "confirmado");
        btn.disabled = true;
      } else {
        btn.textContent = ui.botaoSelecionar;
        btn.classList.add("botao-pequeno");
        btn.addEventListener("click", () => iniciarConfirmacaoInline(c));
      }
      li.appendChild(nomeSpan);
      li.appendChild(telSpan);
      li.appendChild(btn);
      listaResultados.appendChild(li);
    });
    // Com o teclado já fechado, desce suavemente até a lista de resultados.
    rolarParaElemento(listaResultados, "smooth");
  }
  function rolarParaElemento(el, behavior = "smooth") {
    if (!el) return;
    const cabecalho = document.querySelector(".cabecalho-principal");
    const headerOffset = cabecalho ? cabecalho.getBoundingClientRect().height + 12 : 90;
    const alinhar = () => {
      const rect = el.getBoundingClientRect();
      const alvo = Math.max(0, window.pageYOffset + rect.top - headerOffset);
      window.scrollTo({ top: alvo, behavior });
    };
    // Recalcula após o teclado fechar / o layout assentar.
    requestAnimationFrame(alinhar);
    setTimeout(alinhar, 320);
  }
  function atualizarTextoValidacao(telefoneMascarado) {
    if (!textoValidacaoTelefone) return;
    const tel = String(telefoneMascarado || "").trim();
    if (!tel) {
      textoValidacaoTelefone.textContent = textos.textoValidacao;
      return;
    }
    // O telefone já vem mascarado do servidor (ex.: "(82) 99999-XXXX").
    // Trocamos os X finais por "_" para indicar os 4 dígitos que faltam digitar.
    const telExibicao = tel.replace(/X+\s*$/i, m => "_".repeat(m.trim().length));
    textoValidacaoTelefone.textContent =
      `Para sua segurança, informe os últimos 4 dígitos do telefone cadastrado neste convite: ${telExibicao}`;
  }
  function iniciarConfirmacaoInline(convidado) {
    if (!areaBusca || !areaConfirmacao || !nomeConvidadoDestaque || !inputValidacao || !stepValidacao || !stepConfirmacao) {
      return;
    }
    idSelecionado = convidado.id;
    tokenConfirmacao = "";
    nomeConvidadoDestaque.textContent = convidado.nome;
    atualizarTextoValidacao(convidado.telefone);
    inputValidacao.value = "";
    ocultarFeedbackValidacao();
    stepValidacao.classList.remove("oculto");
    stepConfirmacao.classList.add("oculto");
    areaBusca.classList.add("oculto");
    areaConfirmacao.classList.remove("oculto");
    // Sobe até o topo da seção para o card de validação não abrir cortado.
    const secao = document.getElementById("confirmacao");
    rolarParaElemento(secao || areaConfirmacao, "smooth");
  }
  async function validarConvite() {
    if (!inputValidacao || !btnValidar || btnValidar.disabled || validacaoEmAndamento) return;
    if (confirmacaoEncerrada) {
      mostrarFeedbackValidacao(mensagemConfirmacaoEncerradaPadrao, "aviso");
      return;
    }
    if (!idSelecionado) {
      mostrarFeedbackValidacao(mensagens.selecioneConvite, "erro");
      return;
    }
    const digitos = inputValidacao.value.trim();
    if (digitos.length !== 4) {
      mostrarFeedbackValidacao(mensagens.validarDigitos, "erro");
      return;
    }
    validacaoEmAndamento = true;
    const btnTextoOriginal = btnValidar.textContent;
    btnValidar.disabled = true;
    try {
      const response = await fetch(`/api/convidados?acao=validar&id=${idSelecionado}&digitos=${digitos}`);
      const resultado = await lerJsonSeguro(response);
      const erroResposta = resultado && resultado.erro || mensagens.validarFalha;
      if (resultado && resultado.encerrado === true || mensagemIndicaEncerramentoRsvp(erroResposta)) {
        bloquearConfirmacaoPorPrazo(erroResposta);
        return;
      }
      if (!response.ok) {
        throw new Error(erroResposta);
      }
      if (!resultado) {
        throw new Error(mensagens.validarFalha);
      }
      if (resultado.sucesso) {
        ocultarFeedbackValidacao();
        tokenConfirmacao = resultado.token || "";
        preencherDadosConfirmacao(resultado.dados);
        stepValidacao.classList.add("oculto");
        stepConfirmacao.classList.remove("oculto");
        if (inputValidacao) inputValidacao.blur();
        // Formulário é mais longo: rola direto pro CARD (não pro título da seção),
        // assim já mostra mais campos logo abaixo do cabeçalho.
        rolarParaElemento(areaConfirmacao || document.getElementById("confirmacao"), "smooth");
      } else {
        mostrarFeedbackValidacao(resultado.erro || mensagens.validarErro, "erro");
        if (ehRateLimit(resultado.erro)) {
          iniciarCooldownValidacao(cooldownValidacaoSegundos, btnTextoOriginal);
        } else {
          btnValidar.textContent = btnTextoOriginal;
          btnValidar.disabled = false;
        }
      }
    } catch (error) {
      btnValidar.textContent = btnTextoOriginal;
      btnValidar.disabled = false;
      const mensagemErro = error && error.message ? error.message : mensagens.validarConexao;
      if (mensagemIndicaEncerramentoRsvp(mensagemErro)) {
        bloquearConfirmacaoPorPrazo(mensagemErro);
        return;
      }
      mostrarFeedbackValidacao(mensagemErro, "erro");
    } finally {
      if (confirmacaoEncerrada) {
        btnValidar.disabled = true;
      } else if (!emCooldownValidacao()) {
        btnValidar.textContent = btnTextoOriginal;
        btnValidar.disabled = false;
      }
      validacaoEmAndamento = false;
    }
  }
  function extrairNomeEIdade(nomeCompleto) {
    const nomeLimpo = (nomeCompleto || "").trim();
    if (!nomeLimpo) {
      return {
        nomeBase: "",
        idadeTexto: ui.idadeAdulto
      };
    }
    const match = nomeLimpo.match(/\s*\(([^)]*)\)\s*$/);
    if (!match) {
      return {
        nomeBase: nomeLimpo,
        idadeTexto: ui.idadeAdulto
      };
    }
    const faixa = (match[1] || "").toLowerCase();
    let idadeTexto = ui.idadeAdulto;
    if (faixa.includes("0-5") || faixa.includes("0 a 5") || faixa.includes("0/5")) {
      idadeTexto = ui.idadeCrianca05;
    } else if (faixa.includes("6-10") || faixa.includes("6 a 10") || faixa.includes("6/10")) {
      idadeTexto = ui.idadeCrianca610;
    } else if (faixa.includes("11+") || faixa.includes("11") || faixa.includes("acima de 11")) {
      idadeTexto = ui.idadeAdulto;
    } else if (faixa.includes("criança") || faixa.includes("crianca")) {
      idadeTexto = ui.idadeCrianca610;
    } else if (faixa.includes("adulto")) {
      idadeTexto = ui.idadeAdulto;
    }
    const nomeBase = nomeLimpo.replace(/\s*\([^)]*\)\s*$/, "").trim();
    return {
      nomeBase: nomeBase,
      idadeTexto: idadeTexto
    };
  }
  function montarNomeComIdade(nome, idadeTexto) {
    const nomeLimpo = (nome || "").trim();
    if (!nomeLimpo) return "";
    if (!idadeTexto || /^adulto$/i.test(idadeTexto)) return nomeLimpo;
    return `${nomeLimpo} (${idadeTexto})`;
  }
  function preencherDadosConfirmacao(convidado) {
    const container = document.getElementById("container-selecao-pessoas");
    if (!container) return;
    container.innerHTML = "";
    const header = document.createElement("h4");
    header.textContent = textos.form.tituloLista;
    header.style.marginBottom = "10px";
    header.style.color = "var(--cor-primaria)";
    header.style.textAlign = "left";
    container.appendChild(header);
    const aviso = document.createElement("div");
    aviso.className = "aviso-alteracao";
    aviso.textContent = textos.form.aviso;
    container.appendChild(aviso);
    const infoLimite = document.createElement("p");
    infoLimite.style.marginBottom = "15px";
    infoLimite.style.fontSize = "0.9rem";
    infoLimite.style.textAlign = "left";
    const limiteTexto = String(convidado.convites_disponiveis ?? "");
    const templateInfoLimite = String(textos.form.infoLimite ?? "");
    const partesInfo = templateInfoLimite.split("{{limite}}");
    if (/[<>]/.test(templateInfoLimite)) {
      infoLimite.innerHTML = templateInfoLimite.replace("{{limite}}", limiteTexto);
    } else if (partesInfo.length === 2) {
      infoLimite.append(document.createTextNode(partesInfo[0]));
      const strong = document.createElement("strong");
      strong.textContent = limiteTexto;
      infoLimite.append(strong, document.createTextNode(partesInfo[1]));
    } else {
      infoLimite.textContent = templateInfoLimite.replace("{{limite}}", limiteTexto);
    }
    container.appendChild(infoLimite);
    const divEmail = document.createElement("div");
    divEmail.style.marginBottom = "20px";
    divEmail.style.textAlign = "left";
    const labelEmail = document.createElement("label");
    labelEmail.setAttribute("for", "input-email-confirmacao");
    labelEmail.style.display = "block";
    labelEmail.style.fontWeight = "bold";
    labelEmail.style.marginBottom = "5px";
    labelEmail.style.color = "var(--cor-primaria)";
    labelEmail.textContent = textos.form.labelEmail;
    const inputEmail = document.createElement("input");
    inputEmail.type = "email";
    inputEmail.id = "input-email-confirmacao";
    inputEmail.className = "entrada-confirmacao";
    inputEmail.placeholder = textos.form.placeholderEmail;
    inputEmail.style.width = "100%";
    inputEmail.style.padding = "10px";
    inputEmail.style.border = "1px solid #ddd";
    inputEmail.style.borderRadius = "6px";
    const textoEmail = document.createElement("p");
    textoEmail.style.fontSize = "0.85rem";
    textoEmail.style.color = "#666";
    textoEmail.style.marginTop = "5px";
    textoEmail.textContent = textos.form.textoEmail;
    divEmail.append(labelEmail, inputEmail, textoEmail);
    container.appendChild(divEmail);
    const formContainer = document.createElement("div");
    formContainer.id = "lista-convidados-form";
    container.appendChild(formContainer);
    const nomesPredefinidos = convidado.nomes_lista ? convidado.nomes_lista.split(",").map(n => n.trim()) : [];
    const totalSlots = convidado.convites_disponiveis;
    for (let i = 0; i < totalSlots; i++) {
      const nomePre = nomesPredefinidos[i] || "";
      const dadosIdade = extrairNomeEIdade(nomePre);
      const nomeBase = dadosIdade.nomeBase;
      const idadeTexto = dadosIdade.idadeTexto;
      const card = document.createElement("div");
      card.className = "guest-card";
      const campoNome = document.createElement("div");
      campoNome.className = "guest-field";
      const labelNome = document.createElement("label");
      labelNome.textContent = ui.labelNomeCompleto;
      const inputNome = document.createElement("input");
      inputNome.type = "text";
      inputNome.className = "input-nome-guest";
      inputNome.value = nomeBase;
      inputNome.placeholder = ui.placeholderNomeConvidado;
      inputNome.readOnly = true;
      campoNome.append(labelNome, inputNome);
      card.appendChild(campoNome);
      const linha = document.createElement("div");
      linha.className = "guest-row";
      const campoIdade = document.createElement("div");
      campoIdade.className = "guest-field half";
      const labelIdade = document.createElement("label");
      labelIdade.textContent = ui.labelIdade;
      const inputIdade = document.createElement("input");
      inputIdade.type = "text";
      inputIdade.className = "input-idade-guest";
      inputIdade.value = idadeTexto;
      inputIdade.readOnly = true;
      campoIdade.append(labelIdade, inputIdade);
      const campoStatus = document.createElement("div");
      campoStatus.className = "guest-field half";
      const labelStatus = document.createElement("label");
      labelStatus.textContent = ui.labelStatus;
      const selectStatus = document.createElement("select");
      selectStatus.className = "select-status-guest";
      selectStatus.required = true;
      // Opção em branco pré-selecionada: o convidado precisa escolher.
      const optVazio = document.createElement("option");
      optVazio.value = "";
      optVazio.textContent = ui.statusPlaceholder || "Selecione…";
      optVazio.disabled = true;
      optVazio.selected = true;
      const optConfirmado = document.createElement("option");
      optConfirmado.value = "Confirmado";
      optConfirmado.textContent = ui.statusConfirmado;
      const optNaoIrei = document.createElement("option");
      optNaoIrei.value = "não irei";
      optNaoIrei.textContent = ui.statusNaoIrei;
      selectStatus.append(optVazio, optConfirmado, optNaoIrei);
      campoStatus.append(labelStatus, selectStatus);
      linha.append(campoIdade, campoStatus);
      card.appendChild(linha);
      formContainer.appendChild(card);
    }
    const divTermos = document.createElement("div");
    divTermos.className = "pix-termo";
    divTermos.style.marginTop = "1.25rem";
    const checkTermos = document.createElement("input");
    checkTermos.type = "checkbox";
    checkTermos.id = "check-termos-confirmacao";
    const labelTermos = document.createElement("label");
    labelTermos.setAttribute("for", "check-termos-confirmacao");
    labelTermos.innerHTML = textos.form.termos;
    divTermos.append(checkTermos, labelTermos);
    container.appendChild(divTermos);
  }
  if (btnCancelar) {
    btnCancelar.addEventListener("click", () => {
      if (areaConfirmacao) areaConfirmacao.classList.add("oculto");
      if (areaBusca) areaBusca.classList.remove("oculto");
      idSelecionado = null;
      tokenConfirmacao = "";
    });
  }
  if (btnConfirmar) {
    btnConfirmar.addEventListener("click", async () => {
      if (!idSelecionado) return;
      if (confirmacaoEncerrada) {
        mostrarErroFinal(mensagemConfirmacaoEncerradaPadrao);
        return;
      }
      const boxErro = document.getElementById("feedback-erro-final");
      if (boxErro) boxErro.style.display = "none";
      let qtdFinal = 0;
      let nomesConfirmadosStr = "";
      let adultosConfirmados = 0;
      let criancasConfirmadas = 0;
      let adultosCancelados = 0;
      let criancasCanceladas = 0;
      let idadeInvalida = false;
      let statusNaoSelecionado = false;
      const cards = document.querySelectorAll(".guest-card");
      const listaConfirmados = [];
      cards.forEach(card => {
        const nome = card.querySelector(".input-nome-guest").value.trim();
        const idadeEl = card.querySelector(".input-idade-guest");
        const idade = idadeEl ? idadeEl.value : "";
        const statusEl = card.querySelector(".select-status-guest");
        const status = statusEl ? statusEl.value : "";
        if (!idade) {
          idadeInvalida = true;
          if (idadeEl) idadeEl.classList.add("entrada-erro");
          return;
        }
        if (idadeEl) idadeEl.classList.remove("entrada-erro");
        if (!status) {
          statusNaoSelecionado = true;
          if (statusEl) statusEl.classList.add("entrada-erro");
          return;
        }
        if (statusEl) statusEl.classList.remove("entrada-erro");
        const isCrianca = /crian/i.test(idade);
        if (status === "Confirmado" && nome !== "") {
          qtdFinal++;
          listaConfirmados.push(montarNomeComIdade(nome, idade));
          if (isCrianca) {
            criancasConfirmadas++;
          } else {
            adultosConfirmados++;
          }
        } else {
          if (isCrianca) {
            criancasCanceladas++;
          } else {
            adultosCancelados++;
          }
        }
      });
      if (idadeInvalida) {
        mostrarErroFinal(mensagens.faixaEtariaObrigatoria || "Selecione a faixa etária de todos os convidados.");
        return;
      }
      if (statusNaoSelecionado) {
        mostrarErroFinal(mensagens.statusObrigatorio || "Selecione o status (Confirmado ou Não irei) de todos os convidados.");
        return;
      }
      if (qtdFinal === 0) {
        mostrarErroFinal(mensagens.confirmarZero);
        return;
      }
      const inputEmail = document.getElementById("input-email-confirmacao");
      const emailValor = inputEmail ? inputEmail.value.trim() : "";
      if (!emailValor || !emailValor.includes("@") || !emailValor.includes(".")) {
        mostrarErroFinal(mensagens.emailInvalido);
        if (inputEmail) inputEmail.focus();
        return;
      }
      const checkTermos = document.getElementById("check-termos-confirmacao");
      if (checkTermos && !checkTermos.checked) {
        mostrarErroFinal(mensagens.termosObrigatorio);
        return;
      }
      nomesConfirmadosStr = listaConfirmados.join(", ");
      const btnTextoOriginal = btnConfirmar.textContent;
      btnConfirmar.textContent = ui.carregandoConfirmacao;
      btnConfirmar.disabled = true;
      try {
        const response = await fetch("/api/convidados?acao=confirmar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id: idSelecionado,
            token: tokenConfirmacao,
            qtd: qtdFinal,
            nomes_confirmados: nomesConfirmadosStr,
            email: emailValor,
            nome_convite: nomeConvidadoDestaque ? nomeConvidadoDestaque.textContent.trim() : "",
            resumo: {
              adultos_confirmados: adultosConfirmados,
              criancas_confirmadas: criancasConfirmadas,
              adultos_cancelados: adultosCancelados,
              criancas_canceladas: criancasCanceladas,
              observacoes: ""
            }
          })
        });
        const resultado = await lerJsonSeguro(response);
        const erroResposta = resultado && resultado.erro || mensagens.confirmarFalha;
        if (resultado && resultado.encerrado === true || mensagemIndicaEncerramentoRsvp(erroResposta)) {
          bloquearConfirmacaoPorPrazo(erroResposta);
          mostrarErroFinal(erroResposta);
          return;
        }
        if (!response.ok) {
          throw new Error(erroResposta);
        }
        if (!resultado) {
          throw new Error(mensagens.confirmarFalha);
        }
        if (resultado.sucesso) {
          let sucessoDiv = document.getElementById("sucesso-confirmacao-container");
          if (!sucessoDiv) {
            sucessoDiv = document.createElement("div");
            sucessoDiv.id = "sucesso-confirmacao-container";
            areaConfirmacao.appendChild(sucessoDiv);
          }
          Array.from(areaConfirmacao.children).forEach(child => {
            if (child.id !== "sucesso-confirmacao-container") {
              child.style.display = "none";
            }
          });
          sucessoDiv.style.display = "block";
          sucessoDiv.classList.remove("oculto");
          sucessoDiv.innerHTML = "";
          const sucessoContainer = document.createElement("div");
          sucessoContainer.className = "sucesso-container";
          const tituloSucesso = document.createElement("h3");
          tituloSucesso.style.color = "var(--cor-primaria)";
          tituloSucesso.style.marginBottom = "1rem";
          tituloSucesso.style.lineHeight = "1.3";
          tituloSucesso.textContent = textos.sucesso.titulo;
          const textoSucesso = document.createElement("p");
          textoSucesso.style.color = "#666";
          textoSucesso.style.marginBottom = "2rem";
          textoSucesso.style.lineHeight = "1.5";
          textoSucesso.textContent = textos.sucesso.texto;
          const botoes = document.createElement("div");
          botoes.style.display = "flex";
          botoes.style.gap = "10px";
          botoes.style.justifyContent = "center";
          botoes.style.flexWrap = "wrap";
          const btnPresentear = document.createElement("button");
          btnPresentear.id = "btn-presentear-agora";
          btnPresentear.className = "botao botao-primario botao-presentear-anim";
          btnPresentear.textContent = textos.sucesso.botaoPresentear;
          const btnJaPresenteei = document.createElement("button");
          btnJaPresenteei.id = "btn-ja-presenteei";
          btnJaPresenteei.className = "botao botao-secundario";
          btnJaPresenteei.textContent = textos.sucesso.botaoJaPresenteei;
          botoes.append(btnPresentear, btnJaPresenteei);
          sucessoContainer.append(tituloSucesso, textoSucesso, botoes);
          sucessoDiv.appendChild(sucessoContainer);
          garantirSucessoVisivel(sucessoDiv);
          document.getElementById("btn-presentear-agora").addEventListener("click", () => {
            sucessoDiv.classList.add("oculto");
            sucessoDiv.style.display = "none";
            areaConfirmacao.classList.add("oculto");
            areaBusca.classList.remove("oculto");
            Array.from(areaConfirmacao.children).forEach(child => {
              if (child.id !== "sucesso-confirmacao-container") {
                child.style.display = "";
              }
            });
            if (btnConfirmar) btnConfirmar.style.display = "";
            if (btnCancelar) btnCancelar.style.display = "";
            idSelecionado = null;
            limparResultados();
            const input = document.getElementById("nome-convite");
            if (input) input.value = "";
            const modal = areaConfirmacao.closest(".modal") || document.querySelector(".modal.aberto") || document.querySelector(".modal-overlay");
            if (modal) {
              modal.classList.remove("aberto");
              modal.style.display = "none";
            }
            redirecionarParaPresentes();
          });
          document.getElementById("btn-ja-presenteei").addEventListener("click", () => {
            const container = document.querySelector(".sucesso-container");
            if (container) {
              container.style.transition = "opacity 0.5s ease, transform 0.5s ease";
              container.style.opacity = "0";
              container.style.transform = "scale(0.95)";
            }
            setTimeout(() => {
              sucessoDiv.classList.add("oculto");
              sucessoDiv.style.display = "none";
              areaConfirmacao.classList.add("oculto");
              areaBusca.classList.remove("oculto");
              Array.from(areaConfirmacao.children).forEach(child => {
                if (child.id !== "sucesso-confirmacao-container") {
                  child.style.display = "";
                }
              });
              if (btnConfirmar) btnConfirmar.style.display = "";
              if (btnCancelar) btnCancelar.style.display = "";
              idSelecionado = null;
              limparResultados();
              const input = document.getElementById("nome-convite");
              if (input) input.value = "";
              const modal = areaConfirmacao.closest(".modal") || document.querySelector(".modal.aberto") || document.querySelector(".modal-overlay");
              if (modal) {
                modal.classList.remove("aberto");
                modal.style.display = "none";
              }
            }, 500);
          });
        } else {
          mostrarErroFinal(mensagens.confirmarErroPrefixo + (resultado.erro || mensagens.erroDesconhecido));
        }
      } catch (error) {
        const mensagemErro = error && error.message ? error.message : mensagens.confirmarErro;
        if (mensagemIndicaEncerramentoRsvp(mensagemErro)) {
          bloquearConfirmacaoPorPrazo(mensagemErro);
          mostrarErroFinal(mensagemErro);
          return;
        }
        mostrarErroFinal(mensagemErro);
      } finally {
        btnConfirmar.textContent = btnTextoOriginal;
        btnConfirmar.disabled = confirmacaoEncerrada;
      }
    });
  }
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!areaConfirmacao || !btnCancelar) return;
    if (areaConfirmacao.classList.contains("oculto")) return;
    e.preventDefault();
    btnCancelar.click();
  });
  function normalizarEstadoMenuMobile() {
    if (document.body) document.body.classList.remove("menu-aberto");
    document.documentElement.classList.remove("menu-aberto");
    if (menuNavMobile) menuNavMobile.classList.remove("ativo");
    if (botaoMenuMobile) botaoMenuMobile.setAttribute("aria-expanded", "false");
  }
  function mostrarLoader(ativo) {
    if (btnBuscar) {
      btnBuscar.classList.toggle("is-loading", Boolean(ativo));
      btnBuscar.setAttribute("aria-busy", ativo ? "true" : "false");
    }
  }
  function redirecionarParaPresentes() {
    const secaoPresentes = document.getElementById("presentes");
    if (!secaoPresentes) {
      window.location.href = "/#presentes";
      return;
    }
    if (typeof window.mostrarListaPresentes === "function") {
      window.mostrarListaPresentes();
    }
    const cabecalho = document.querySelector(".cabecalho-principal");
    const offset = cabecalho ? cabecalho.getBoundingClientRect().height + 12 : 96;
    const rolarParaPresentes = (comportamento = "auto") => {
      const topo = Math.max(0, window.pageYOffset + secaoPresentes.getBoundingClientRect().top - offset);
      window.scrollTo({
        top: topo,
        behavior: comportamento
      });
    };
    history.replaceState(null, "", "#presentes");
    rolarParaPresentes("auto");
    requestAnimationFrame(() => rolarParaPresentes("smooth"));
    setTimeout(() => rolarParaPresentes("auto"), 280);
  }
  function garantirSucessoVisivel(sucessoDiv) {
    if (!sucessoDiv) return;
    const alinhar = (behavior = "auto") => {
      const secaoConfirmacao = document.getElementById("confirmacao");
      const cabecalho = document.querySelector(".cabecalho-principal");
      const headerOffset = cabecalho ? cabecalho.getBoundingClientRect().height + 10 : 90;
      const alvoElemento = secaoConfirmacao || sucessoDiv;
      const rect = alvoElemento.getBoundingClientRect();
      const alvo = Math.max(0, window.pageYOffset + rect.top - headerOffset - 6);
      window.scrollTo({
        top: alvo,
        behavior: behavior
      });
    };
    requestAnimationFrame(() => alinhar("smooth"));
    setTimeout(() => alinhar("auto"), 220);
  }
  function mostrarFeedback(msg, tipo) {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.className = `feedback-confirmacao ${tipo}`;
    feedback.classList.remove("oculto");
  }
  function ocultarFeedback() {
    if (!feedback) return;
    feedback.classList.add("oculto");
  }
  function limparResultados() {
    if (!listaResultados) return;
    listaResultados.innerHTML = "";
    listaResultados.classList.add("oculto");
    if (formBuscaContainer) formBuscaContainer.classList.remove("oculto");
    if (btnBuscar) btnBuscar.classList.remove("oculto");
    atualizarBotaoLimpar();
  }
  function mostrarFeedbackValidacao(msg, tipo) {
    if (feedbackValidacao) {
      feedbackValidacao.textContent = msg;
      feedbackValidacao.className = `feedback-confirmacao ${tipo}`;
      feedbackValidacao.classList.remove("oculto");
    }
  }
  function animarBotaoValidar() {
    if (!btnValidar) return;
    const classeAnim = emCooldownValidacao() ? "btn-validar-anim-cooldown" : "btn-validar-anim";
    btnValidar.classList.remove("btn-validar-anim", "btn-validar-anim-cooldown");
    void btnValidar.offsetWidth;
    btnValidar.classList.add(classeAnim);
  }
  function ehRateLimit(mensagemErro) {
    return typeof mensagemErro === "string" && mensagemErro.toLowerCase().includes("muitas tentativas");
  }
  function emCooldownValidacao() {
    return cooldownValidacaoAte && Date.now() < cooldownValidacaoAte;
  }
  function iniciarCooldownValidacao(segundos, textoOriginal) {
    if (!btnValidar) return;
    cooldownValidacaoAte = Date.now() + segundos * 1e3;
    btnValidar.disabled = true;
    if (cooldownValidacaoTimer) {
      clearInterval(cooldownValidacaoTimer);
    }
    const atualizarTexto = () => {
      const restanteMs = cooldownValidacaoAte - Date.now();
      const restante = Math.max(0, Math.ceil(restanteMs / 1e3));
      if (restante <= 0) {
        clearInterval(cooldownValidacaoTimer);
        cooldownValidacaoTimer = null;
        cooldownValidacaoAte = 0;
        btnValidar.textContent = textoOriginal;
        btnValidar.disabled = false;
        return;
      }
      btnValidar.textContent = `Aguarde ${restante}s`;
    };
    atualizarTexto();
    cooldownValidacaoTimer = setInterval(atualizarTexto, 500);
  }
  function ocultarFeedbackValidacao() {
    if (feedbackValidacao) {
      feedbackValidacao.classList.add("oculto");
    }
  }
  function mostrarErroFinal(msg) {
    let box = document.getElementById("feedback-erro-final");
    if (!box) {
      box = document.createElement("div");
      box.id = "feedback-erro-final";
      box.className = "feedback-confirmacao erro";
      box.style.marginTop = "15px";
      const container = document.getElementById("container-selecao-pessoas");
      if (container && container.parentNode) {
        container.parentNode.insertBefore(box, container.nextSibling);
      }
    }
    box.textContent = msg;
    box.classList.remove("oculto");
    box.style.display = "block";
    box.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarConfirmacao, {
    once: true
  });
} else {
  iniciarConfirmacao();
}
