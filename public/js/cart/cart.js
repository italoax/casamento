import { versionarImagemUrl } from "../utils/assets.js";

import { listaAtual, presenteUsaCotas, obterResumoEstoquePresente, obterPrecoUnitarioPresente, renderizarPresentes, mostrarListaPresentes, obterQuantidadeVisivelPresentes } from "../features/presentes.js";

const siteConfig = window.siteConfig;

const carrinhoStorageKey = "carrinho_presentes";

let carrinho = [];

function salvarCarrinho() {
  try {
    localStorage.setItem(carrinhoStorageKey, JSON.stringify(carrinho));
  } catch (err) {}
}

function carregarCarrinhoPersistido() {
  try {
    const carrinhoSalvo = localStorage.getItem(carrinhoStorageKey);
    if (carrinhoSalvo) {
      const itens = JSON.parse(carrinhoSalvo);
      if (Array.isArray(itens)) {
        carrinho = itens;
      }
    }
  } catch (err) {}
}

function limparCarrinhoPersistido() {
  carrinho = [];
  try {
    localStorage.removeItem(carrinhoStorageKey);
  } catch (err) {}
  renderizarCarrinho();
}

function adicionarAoCarrinho(produto) {
  const itemExistente = carrinho.find(item => item.produto.id === produto.id);
  const {limiteDefinido: limiteDefinido, qtdDisponivel: qtdDisponivel, qtdVendida: qtdVendida, qtdReservadaConsiderada: qtdReservadaConsiderada} = obterResumoEstoquePresente(produto, {
    ignorarReservas: presenteUsaCotas(produto)
  });
  if (limiteDefinido) {
    const qtdNoCarrinho = itemExistente ? itemExistente.qtd : 0;
    if ((qtdDisponivel || 0) <= 0 || qtdVendida + qtdReservadaConsiderada + qtdNoCarrinho >= (qtdDisponivel || 0)) {
      return;
    }
  }
  if (itemExistente) {
    itemExistente.qtd++;
  } else {
    carrinho.push({
      produto: produto,
      qtd: 1
    });
  }
  salvarCarrinho();
  renderizarCarrinho();
  const carrinhoEl = document.getElementById("carrinho-fixo");
  if (carrinhoEl) carrinhoEl.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function removerItemCarrinho(id) {
  const idNormalizado = String(id);
  const index = carrinho.findIndex(item => String(item.produto.id) === idNormalizado);
  if (index !== -1) {
    if (carrinho[index].qtd > 1) {
      carrinho[index].qtd -= 1;
    } else {
      carrinho.splice(index, 1);
    }
  }
  salvarCarrinho();
  renderizarCarrinho();
}

function calcularTotalPresentes() {
  let total = 0;
  carrinho.forEach(item => {
    total += item.qtd * obterPrecoUnitarioPresente(item.produto);
  });
  return total;
}

function atualizarResumoCarrinho() {
  const texto = document.getElementById("texto-carrinho-resumo");
  const botao = document.getElementById("btn-resumo-carrinho");
  if (!texto || !botao) return;
  const totalItens = carrinho.reduce((soma, item) => soma + item.qtd, 0);
  const label = totalItens === 0 ? "Carrinho vazio" : `Ver carrinho (${totalItens} ${totalItens === 1 ? "presente" : "presentes"})`;
  texto.textContent = label;
  botao.setAttribute("aria-label", label);
  if (totalItens === 0) {
    botao.classList.add("carrinho-resumo--vazio");
    botao.disabled = true;
  } else {
    botao.classList.remove("carrinho-resumo--vazio");
    botao.disabled = false;
  }
}

function renderizarCarrinho() {
  const container = document.getElementById("carrinho-fixo");
  if (!container) return;
  const lista = document.querySelector(".lista-presentes");
  const controles = document.querySelector(".controles-presentes");
  const carregarMais = document.querySelector(".container-carregar-mais");
  if (carrinho.length === 0) {
    container.innerHTML = "";
    container.style.display = "none";
    if (lista) lista.style.display = "";
    if (controles) controles.style.display = "";
    renderizarPresentes(listaAtual);
    if (carregarMais) {
      carregarMais.style.display = obterQuantidadeVisivelPresentes() < listaAtual.length ? "" : "none";
    }
    atualizarResumoCarrinho();
    return;
  }
  if (lista) lista.style.display = "none";
  if (controles) controles.style.display = "none";
  if (carregarMais) carregarMais.style.display = "none";
  container.style.display = "block";
  let total = 0;
  let htmlItens = "";
  carrinho.forEach(item => {
    const precoNum = obterPrecoUnitarioPresente(item.produto);
    const imagemProduto = versionarImagemUrl(item.produto.imagem ? item.produto.imagem : siteConfig.presentes.placeholderImagem);
    total += item.qtd * precoNum;
    for (let i = 0; i < item.qtd; i++) {
      htmlItens += `\n        <div class="item-carrinho">\n          <div class="info-item-carrinho">\n            <div class="thumb-carrinho">\n              <img src="${imagemProduto}" alt="${item.produto.nome}" loading="lazy">\n            </div>\n            <div class="detalhes-item-carrinho">\n              <span class="nome-item">${item.produto.nome}</span>\n              <button class="btn-remover-carrinho" data-remove-id="${String(item.produto.id).replace(/"/g, "&quot;")}">${siteConfig.carrinho.botaoRemover}</button>\n            </div>\n          </div>\n          <div class="valor-acao-carrinho">\n            <span class="preco-item">R$ ${precoNum.toLocaleString("pt-BR", {
        minimumFractionDigits: 2
      })}</span>\n          </div>\n        </div>\n      `;
    }
  });
  container.innerHTML = `\n    <div class="carrinho-box">\n      <div class="cabecalho-carrinho">\n        <h3>${siteConfig.carrinho.titulo}</h3>\n      </div>\n      <div class="titulos-tabela-carrinho">\n        <span>${siteConfig.carrinho.labelDescricao}</span>\n        <span>${siteConfig.carrinho.labelValor}</span>\n      </div>\n      <div class="lista-itens-carrinho">\n        ${htmlItens}\n      </div>\n      <div class="rodape-carrinho">\n        <div class="resumo-final-carrinho">\n          <div class="parcelamento-carrinho" aria-label="Parcelamento no cartão de crédito">\n            <svg viewBox="0 0 24 24" aria-hidden="true">\n              <rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"></rect>\n              <path d="M3 10h18" fill="none" stroke="currentColor" stroke-width="1.8"></path>\n            </svg>\n            <span>Parcele suas compras em até 6x no cartão de crédito</span>\n          </div>\n          <div class="total-carrinho">\n            <span>${siteConfig.carrinho.labelTotal}</span>\n            <strong>R$ ${total.toLocaleString("pt-BR", {
    minimumFractionDigits: 2
  })}</strong>\n          </div>\n        </div>\n        <div class="acoes-carrinho">\n          <button id="btn-adicionar-mais" class="botao botao-secundario">${siteConfig.carrinho.botaoAdicionarMais}</button>\n          <button id="btn-continuar-compra" class="botao botao-primario">${siteConfig.carrinho.botaoContinuar}</button>\n        </div>\n      </div>\n    </div>\n  `;
  container.querySelectorAll(".btn-remover-carrinho").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-remove-id");
      if (id) removerItemCarrinho(id);
    });
  });
  atualizarResumoCarrinho();
}

function configurarAcoesCarrinho() {
  document.addEventListener("click", event => {
    const botaoAdicionar = event.target.closest("#btn-adicionar-mais");
    if (botaoAdicionar) {
      event.preventDefault();
      mostrarListaPresentes();
      return;
    }
    const botaoContinuar = event.target.closest("#btn-continuar-compra");
    if (botaoContinuar) {
      event.preventDefault();
      if (typeof window.irParaCheckout === "function") {
        window.irParaCheckout();
      }
      return;
    }
    const botaoResumo = event.target.closest("#btn-resumo-carrinho");
    if (botaoResumo && carrinho.length > 0) {
      event.preventDefault();
      renderizarCarrinho();
      const carrinhoEl = document.getElementById("carrinho-fixo");
      if (carrinhoEl) {
        carrinhoEl.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    }
  });
}

function quantidadeNoCarrinho(id) {
  const alvo = String(id);
  const item = carrinho.find((i) => String(i.produto.id) === alvo);
  return item ? item.qtd : 0;
}

window.adicionarAoCarrinho = adicionarAoCarrinho;

window.quantidadeNoCarrinho = quantidadeNoCarrinho;

window.removerItemCarrinho = removerItemCarrinho;

window.renderizarCarrinho = renderizarCarrinho;

window.mostrarListaPresentes = mostrarListaPresentes;

export { carrinho, salvarCarrinho, carregarCarrinhoPersistido, limparCarrinhoPersistido, adicionarAoCarrinho, quantidadeNoCarrinho, removerItemCarrinho, calcularTotalPresentes, atualizarResumoCarrinho, renderizarCarrinho, mostrarListaPresentes, configurarAcoesCarrinho };
