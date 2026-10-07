import { aplicarSecaoSolicitadaPorQuery, aplicarRetornoModalPagamento, configurarScrollHashSync, configurarAnimacoesScroll, configurarCabecalhoAoRolar, configurarMenuMobile, configurarLinksInternos, configurarBotaoVoltarAoTopo } from "../ui/navigation.js";

import { bloquearCopiaImagens, iniciarRecados } from "../features/recados.js";

import { aplicarConteudoSite, preencherDadosEvento, removerPreloader, iniciarContagem, iniciarAtualizacaoFaseEvento, iniciarCarrossel } from "../rendering/content.js";

import { iniciarVideoCasal } from "../features/video.js";

import { iniciarTutorialConfirmacao } from "../features/tutorial-confirmacao.js";

import { carregarPresentes, iniciarAtualizacaoAutomaticaPresentes } from "../features/presentes.js";

import { carregarCarrinhoPersistido, atualizarResumoCarrinho, configurarAcoesCarrinho } from "../cart/cart.js";

import { carregarCheckoutPersistido } from "../cart/checkout.js";

function carregarEstadoPersistido() {
  carregarCarrinhoPersistido();
  carregarCheckoutPersistido();
}

function iniciar() {
  aplicarSecaoSolicitadaPorQuery();
  aplicarRetornoModalPagamento();
  carregarEstadoPersistido();
  aplicarConteudoSite();
  atualizarResumoCarrinho();
  bloquearCopiaImagens();
  iniciarRecados();
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  configurarScrollHashSync();
  preencherDadosEvento();
  iniciarContagem();
  // Consulta a fase manual sem bloquear a renderizacao inicial.
  iniciarAtualizacaoFaseEvento();
  iniciarCarrossel();
  iniciarVideoCasal();
  iniciarTutorialConfirmacao();
  carregarPresentes();
  iniciarAtualizacaoAutomaticaPresentes();
  removerPreloader();
  configurarAnimacoesScroll();
  configurarCabecalhoAoRolar();
  configurarMenuMobile();
  configurarLinksInternos();
  configurarBotaoVoltarAoTopo();
  configurarAcoesCarrinho();
}

export { carregarEstadoPersistido, iniciar };
