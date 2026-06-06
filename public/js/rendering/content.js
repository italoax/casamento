import { versionarImagemUrl } from "../utils/assets.js";

import { normalizarDataIsoParaSP, formatarDataSP, formatarHoraSP, formatarDataHero } from "../utils/date-utils.js";

const siteConfig = window.siteConfig;

const configuracao = {
  noivos: siteConfig.dados.noivos,
  dataCasamento: siteConfig.dados.dataCasamento,
  local: {
    nome: siteConfig.dados.local.nome,
    endereco: siteConfig.dados.local.endereco,
    linkMaps: siteConfig.dados.local.linkMaps
  }
};

function aplicarConteudoSite() {
  configuracao.noivos = siteConfig.dados.noivos;
  configuracao.dataCasamento = siteConfig.dados.dataCasamento;
  configuracao.local.nome = siteConfig.dados.local.nome;
  configuracao.local.endereco = siteConfig.dados.local.endereco;
  configuracao.local.linkMaps = siteConfig.dados.local.linkMaps;
  atualizarMetadados();
  atualizarNav();
  atualizarHero();
  atualizarCasal();
  atualizarCerimonia();
  atualizarGrandeDia();
  atualizarPresentes();
  atualizarConfirmacao();
  atualizarRodape();
}

function atualizarMetadados() {
  document.title = siteConfig.meta.title;
  atualizarMetaTag('meta[name="description"]', siteConfig.meta.description);
  atualizarMetaTag('meta[property="og:title"]', siteConfig.meta.ogTitle);
  atualizarMetaTag('meta[property="og:description"]', siteConfig.meta.ogDescription);
  atualizarMetaTag('meta[property="og:image"]', versionarImagemUrl(siteConfig.meta.ogImage));
}

function atualizarMetaTag(selector, content) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute("content", content);
}

function atualizarNav() {
  const marca = document.querySelector(".marca-nav");
  if (marca) marca.textContent = siteConfig.nav.marca;
  const menu = document.querySelector(".menu-nav");
  if (menu) {
    const nomesNoivos = String(siteConfig?.dados?.noivos || "").trim();
    const partesNoivos = nomesNoivos.split("&").map(parte => parte.trim()).filter(Boolean);
    const primeiroNome = texto => texto.split(/\s+/)[0] || "";
    const nome1 = primeiroNome(partesNoivos[0] || "Noiva");
    const nome2 = primeiroNome(partesNoivos[1] || "Noivo");
    const iniciais = `${nome1.charAt(0) || "N"} ♥ ${nome2.charAt(0) || "N"}`;
    const tituloNoivos = partesNoivos.length >= 2 ? `${nome1} & ${nome2}` : nomesNoivos || "Nosso Casamento";
    menu.innerHTML = siteConfig.nav.links.map(link => `<li><a href="#${link.id}">${link.label}</a></li>`).join("");
    menu.innerHTML = `<li class="menu-nav-top">\n        <div class="menu-nav-avatar">${iniciais}</div>\n        <strong class="menu-nav-title">${tituloNoivos}</strong>\n        <button type="button" class="menu-nav-close" aria-label="Fechar menu">‹</button>\n      </li>` + menu.innerHTML;
  }
}

function animarHero() {
  const hero = document.querySelector(".conteudo-destaque");
  if (!hero) return;
  hero.classList.remove("hero-animado");
  void hero.offsetWidth;
  requestAnimationFrame(() => {
    hero.classList.add("hero-animado");
  });
}

function atualizarHero() {
  const rotulo = document.querySelector(".rotulo-rd");
  if (rotulo) rotulo.textContent = siteConfig.hero.rotulo;
  const titulo = document.querySelector(".titulo-destaque");
  if (titulo) titulo.textContent = siteConfig.hero.titulo || configuracao.noivos;
  const dataHero = document.querySelector(".data-destaque");
  if (dataHero) dataHero.textContent = formatarDataHero(configuracao.dataCasamento);
  const local = document.querySelector(".local-rd");
  if (local) local.textContent = siteConfig.hero.local || siteConfig.dados.localCurto;
  const tituloContagem = document.querySelector(".titulo-contagem-hero");
  if (tituloContagem) tituloContagem.textContent = siteConfig.hero.contagemTitulo;
  const botaoPrimario = document.getElementById("btn-hero-primario");
  if (botaoPrimario) {
    botaoPrimario.textContent = siteConfig.hero.botaoPrimario.label;
    botaoPrimario.setAttribute("href", siteConfig.hero.botaoPrimario.href);
  }
  const botaoSecundario = document.getElementById("btn-hero-secundario");
  if (botaoSecundario) {
    botaoSecundario.textContent = siteConfig.hero.botaoSecundario.label;
    botaoSecundario.setAttribute("href", siteConfig.hero.botaoSecundario.href);
  }
  animarHero();
}

function atualizarCasal() {
  const titulo = document.getElementById("titulo-casal");
  if (titulo) titulo.textContent = siteConfig.casal.titulo;
  const fotoNoiva = document.getElementById("foto-noiva");
  if (fotoNoiva) {
    fotoNoiva.src = versionarImagemUrl(siteConfig.casal.fotoNoiva.src);
    fotoNoiva.alt = siteConfig.casal.fotoNoiva.alt;
  }
  const fotoNoivo = document.getElementById("foto-noivo");
  if (fotoNoivo) {
    fotoNoivo.src = versionarImagemUrl(siteConfig.casal.fotoNoivo.src);
    fotoNoivo.alt = siteConfig.casal.fotoNoivo.alt;
  }
  const texto = document.getElementById("texto-casal");
  if (texto) texto.textContent = siteConfig.casal.texto;
  const trilho = document.querySelector(".trilho-fotos");
  if (trilho) {
    trilho.innerHTML = siteConfig.casal.carrossel.map(foto => `<img class="slide-foto" src="${versionarImagemUrl(foto.src)}" alt="${foto.alt}" loading="lazy" decoding="async" style="--pos-desktop: ${foto.objectPosition || "center"}; --pos-mobile: ${foto.objectPositionMobile || foto.objectPosition || "center"};">`).join("");
  }
}

function atualizarCerimonia() {
  const titulo = document.getElementById("titulo-cerimonia");
  if (titulo) titulo.textContent = siteConfig.cerimonia.titulo;
  const intro = document.getElementById("intro-cerimonia");
  if (intro) intro.textContent = siteConfig.cerimonia.intro;
  const galeria = document.getElementById("galeria-cerimonia");
  if (galeria) {
    galeria.innerHTML = siteConfig.cerimonia.imagens.map(foto => `\n          <div class="foto-cerimonia">\n            <img src="${versionarImagemUrl(foto.src)}" alt="${foto.alt}" loading="lazy" decoding="async">\n          </div>\n        `).join("");
    const itensGaleria = Array.from(galeria.querySelectorAll(".foto-cerimonia"));
    itensGaleria.forEach(item => {
      const img = item.querySelector("img");
      if (!img) return;
      const tratarErroImagem = () => {
        item.classList.add("foto-cerimonia--sem-imagem");
        img.remove();
      };
      img.addEventListener("error", tratarErroImagem, {
        once: true
      });
      if (img.complete && img.naturalWidth === 0) {
        tratarErroImagem();
      }
    });
  }
}

function atualizarGrandeDia() {
  const titulo = document.getElementById("titulo-grande-dia");
  if (titulo) titulo.textContent = siteConfig.grandeDia.titulo;
  const subtitulo = document.getElementById("subtitulo-grande-dia");
  if (subtitulo) subtitulo.textContent = siteConfig.grandeDia.subtitulo;
  const labelData = document.getElementById("label-data-evento");
  if (labelData) labelData.textContent = siteConfig.grandeDia.labelData;
  const labelHorario = document.getElementById("label-horario-evento");
  if (labelHorario) labelHorario.textContent = siteConfig.grandeDia.labelHorario;
  const labelLocal = document.getElementById("label-local-evento");
  if (labelLocal) labelLocal.textContent = siteConfig.grandeDia.labelLocal;
  const botaoMapa = document.getElementById("link-local-evento");
  if (botaoMapa) botaoMapa.textContent = siteConfig.grandeDia.botaoMapa;
  const mapa = document.getElementById("mapa-iframe");
  if (mapa) {
    mapa.src = siteConfig.grandeDia.mapaSrc;
    mapa.title = siteConfig.grandeDia.mapaTitle;
  }
}

function atualizarPresentes() {
  const titulo = document.getElementById("titulo-presentes");
  if (titulo) titulo.textContent = siteConfig.presentes.titulo;
  const intro = document.getElementById("intro-presentes");
  if (intro) intro.textContent = siteConfig.presentes.intro;
  const ordenarLabel = document.getElementById("label-ordenar-presentes");
  if (ordenarLabel) ordenarLabel.textContent = siteConfig.presentes.ordenarLabel;
  const ordenarSelect = document.getElementById("ordenar-presentes");
  if (ordenarSelect) {
    siteConfig.presentes.ordenarOpcoes.forEach((opcao, index) => {
      const option = ordenarSelect.options[index];
      if (option) option.textContent = opcao.label;
    });
  }
  const botaoMais = document.getElementById("carregar-mais-presentes");
  if (botaoMais) botaoMais.textContent = siteConfig.presentes.carregarMais;
}

function atualizarConfirmacao() {
  const titulo = document.getElementById("titulo-confirmacao");
  if (titulo) titulo.textContent = siteConfig.confirmacao.titulo;
  const intro = document.getElementById("intro-confirmacao");
  if (intro) intro.textContent = siteConfig.confirmacao.intro;
  const labelNome = document.getElementById("label-nome-convite");
  if (labelNome) labelNome.textContent = siteConfig.confirmacao.labelNome;
  const inputNome = document.getElementById("nome-convite");
  if (inputNome) inputNome.placeholder = siteConfig.confirmacao.placeholderNome;
  const botaoBuscar = document.getElementById("btn-buscar-convite");
  if (botaoBuscar) botaoBuscar.textContent = siteConfig.confirmacao.botaoBuscar;
  const tituloConfirmar = document.getElementById("titulo-confirmar-presenca");
  if (tituloConfirmar) tituloConfirmar.textContent = siteConfig.confirmacao.tituloConfirmar;
  const textoConfirmar = document.getElementById("texto-confirmar-presenca");
  if (textoConfirmar) textoConfirmar.textContent = siteConfig.confirmacao.textoConfirmar;
  const textoValidacao = document.getElementById("texto-validacao-telefone");
  if (textoValidacao) textoValidacao.textContent = siteConfig.confirmacao.textoValidacao;
  const botaoValidar = document.getElementById("btn-validar-telefone");
  if (botaoValidar) botaoValidar.textContent = siteConfig.confirmacao.botaoValidar;
  const botaoConfirmar = document.getElementById("btn-confirmar-presenca");
  if (botaoConfirmar) botaoConfirmar.textContent = siteConfig.confirmacao.botaoConfirmar;
  const botaoVoltar = document.getElementById("btn-cancelar-confirmacao");
  if (botaoVoltar) botaoVoltar.textContent = siteConfig.confirmacao.botaoVoltar;
}

function atualizarRodape() {
  const nomes = document.getElementById("rodape-nomes");
  if (nomes) nomes.textContent = configuracao.noivos;
  const mensagem = document.getElementById("rodape-mensagem");
  if (mensagem) mensagem.textContent = siteConfig.rodape.mensagem;
  const nav = document.getElementById("rodape-nav");
  if (nav) {
    const links = Array.isArray(siteConfig.rodape.links) && siteConfig.rodape.links.length ? siteConfig.rodape.links : siteConfig.nav.links.map(link => ({
      label: link.label,
      href: `#${link.id}`
    }));
    nav.innerHTML = links.map(link => `<a href="${link.href}">${link.label}</a>`).join("");
  }
  const credito = document.getElementById("rodape-credito");
  if (credito) credito.textContent = siteConfig.rodape.credito;
}

function preencherDadosEvento() {
  const dataEl = document.getElementById("data-evento");
  const horaEl = document.getElementById("horario-evento");
  const nomeLocal = document.getElementById("nome-local-evento");
  const enderecoLocal = document.getElementById("endereco-local-evento");
  const linkLocal = document.getElementById("link-local-evento");
  if (!dataEl || !horaEl || !nomeLocal || !enderecoLocal || !linkLocal) return;
  const objData = normalizarDataIsoParaSP(configuracao.dataCasamento);
  dataEl.textContent = formatarDataSP(objData);
  horaEl.textContent = formatarHoraSP(objData);
  nomeLocal.textContent = configuracao.local.nome;
  enderecoLocal.textContent = configuracao.local.endereco;
  linkLocal.href = configuracao.local.linkMaps;
}

function removerPreloader() {
  const preCarregamento = document.getElementById("pre-carregamento");
  if (preCarregamento) {
    preCarregamento.classList.add("pre-carregamento-oculto");
    setTimeout(() => preCarregamento.remove(), 500);
  }
}

function iniciarContagem() {
  const alvoData = normalizarDataIsoParaSP(configuracao.dataCasamento);
  if (!alvoData) return;
  const alvo = alvoData.getTime();
  const atualizar = () => {
    const agora = Date.now();
    const diferenca = alvo - agora;
    if (diferenca < 0) {
      [ "dias", "horas", "minutos", "segundos" ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = "00";
      });
      return;
    }
    const d = Math.floor(diferenca / (1e3 * 60 * 60 * 24));
    const h = Math.floor(diferenca % (1e3 * 60 * 60 * 24) / (1e3 * 60 * 60));
    const m = Math.floor(diferenca % (1e3 * 60 * 60) / (1e3 * 60));
    const s = Math.floor(diferenca % (1e3 * 60) / 1e3);
    const setValor = (id, valor) => {
      const el = document.getElementById(id);
      if (el) el.innerText = valor < 10 ? `0${valor}` : `${valor}`;
    };
    setValor("dias", d);
    setValor("horas", h);
    setValor("minutos", m);
    setValor("segundos", s);
  };
  setInterval(atualizar, 1e3);
  atualizar();
}

function iniciarCarrossel() {
  const trilho = document.querySelector(".trilho-fotos");
  const slides = document.querySelectorAll(".slide-foto");
  const containerBolinhas = document.querySelector(".navegacao-bolinhas");
  const btnAnterior = document.querySelector(".seta-carrossel.anterior");
  const btnProxima = document.querySelector(".seta-carrossel.proxima");
  if (!(trilho && slides.length && containerBolinhas)) return;
  let indiceAtual = 0;
  const totalSlides = slides.length;
  slides[0].classList.add("ativa");
  slides.forEach((_, index) => {
    const bolinha = document.createElement("button");
    bolinha.classList.add("bolinha");
    if (index === 0) bolinha.classList.add("ativa");
    bolinha.addEventListener("click", () => {
      irParaSlide(index);
      reiniciarTimer();
    });
    containerBolinhas.appendChild(bolinha);
  });
  if (btnAnterior) {
    btnAnterior.addEventListener("click", () => {
      irParaSlide((indiceAtual - 1 + totalSlides) % totalSlides);
      reiniciarTimer();
    });
  }
  if (btnProxima) {
    btnProxima.addEventListener("click", () => {
      irParaSlide((indiceAtual + 1) % totalSlides);
      reiniciarTimer();
    });
  }
  function irParaSlide(index) {
    indiceAtual = index;
    slides.forEach((slide, i) => slide.classList.toggle("ativa", i === indiceAtual));
    const bolinhas = document.querySelectorAll(".bolinha");
    bolinhas.forEach((b, i) => b.classList.toggle("ativa", i === indiceAtual));
  }
  let timer = setInterval(() => irParaSlide((indiceAtual + 1) % totalSlides), 4e3);
  function reiniciarTimer() {
    clearInterval(timer);
    timer = setInterval(() => irParaSlide((indiceAtual + 1) % totalSlides), 4e3);
  }
}

export { aplicarConteudoSite, atualizarMetadados, atualizarMetaTag, atualizarNav, animarHero, atualizarHero, atualizarCasal, atualizarCerimonia, atualizarGrandeDia, atualizarPresentes, atualizarConfirmacao, atualizarRodape, preencherDadosEvento, removerPreloader, iniciarContagem, iniciarCarrossel };
