window.siteConfig = {
  // Token para logging de eventos (deixe vazio para desabilitar)
  apiLogToken: "",
  
  meta: {
    title: "Casamento Emanuelle & Ítalo",
    description: "Confirme sua presença e veja a lista de presentes para o casamento de Emanuelle e Ítalo.",
    ogImage: "https://emanuelleitalo.com/img/noivos/og-image-img2-1200x630.webp"
  },
  dados: {
    noivos: "Emanuelle & Ítalo",
    dataCasamento: "2026-08-16T15:30:00",
    local: {
      nome: "Espaço Hotel Fazenda Pouso Real",
      endereco: "Rua Juscelino Kubitscheck, 1000 - Jaboticatubas, MG",
      linkMaps: "https://www.google.com/maps/dir/?api=1&destination=Espa%C3%A7o%20Hotel%20Fazenda%20Pouso%20Real%2C%20Rua%20Juscelino%20Kubitscheck%2C%201000%2C%20Jaboticatubas%2C%20MG"
    },
    localCurto: "MINAS GERAIS"
  },
  ui: {
    fecharAria: "Fechar"
  },
  nav: {
    marca: "E & I",
    links: [ {
      id: "inicio",
      label: "Home"
    }, {
      id: "o-casal",
      label: "O Casal"
    }, {
      id: "grande-dia",
      label: "O Grande Dia"
    }, {
      id: "presentes",
      label: "Lista de Presentes"
    }, {
      id: "confirmacao",
      label: "Confirme sua Presença"
    }, {
      id: "recados",
      label: "Recados"
    } ]
  },
  hero: {
    rotulo: "SAVE THE DATE",
    titulo: "Emanuelle + Ítalo",
    local: "MINAS GERAIS",
    contagemTitulo: "Contagem Regressiva",
    botaoPrimario: {
      label: "Confirmar Presença",
      href: "#confirmacao"
    },
    botaoSecundario: {
      label: "Lista de Presentes",
      href: "#presentes"
    }
  },
  casal: {
    titulo: "O Casal",
    fotoNoiva: {
      src: "img/noivos/img1.webp",
      alt: "Noiva"
    },
    fotoNoivo: {
      src: "img/noivos/img2.webp",
      alt: "Noivo"
    },
    texto: "Nossa história começou de forma simples e natural, quando uma amizade sincera, com o tempo, transformou-se em um amor verdadeiro. Ao longo de 4 anos, aprendemos que amar também é cuidar, respeitar e caminhar juntos. Entre risadas, companheirismo e muitos sonhos, entendemos que a vida fica ainda melhor quando é compartilhada. Este site é um pedacinho da nossa história e uma forma carinhosa de dividir esse momento tão especial com você. Que alegria celebrar esse novo capítulo ao lado de pessoas tão importantes!",
    carrossel: [ {
      src: "img/noivos/img1.webp",
      alt: "Foto 2",
      objectPosition: "center"
    }, {
      src: "img/noivos/img2.webp",
      alt: "Foto 2",
      objectPosition: "center"
    }, {
      src: "img/noivos/img3.webp",
      alt: "Foto 3",
      objectPosition: "center 30%",
      objectPositionMobile: "center"
    }, {
      src: "img/noivos/img4.webp",
      alt: "Foto 4",
      objectPosition: "center 28%"
    }, {
      src: "img/noivos/img5.webp",
      alt: "Foto 5",
      objectPosition: "center 35%"
    }, {
      src: "img/noivos/img6.webp",
      alt: "Foto 6",
      objectPosition: "center 35%",
      objectPositionMobile: "center"
    }, {
      src: "img/noivos/img7.webp",
      alt: "Foto 7",
      objectPosition: "center 55%"
    }, {
      src: "img/noivos/img8.webp",
      alt: "Foto 8",
      objectPosition: "center 60%"
    }, {
      src: "img/noivos/img9.webp",
      alt: "Foto 2",
      objectPosition: "center"
    }, {
      src: "img/noivos/img10.webp",
      alt: "Foto 2",
      objectPosition: "center 30%"
    }, {
      src: "img/noivos/img11.webp",
      alt: "Foto 2",
      objectPosition: "center 45%"
    } ]
  },
  cerimonia: {
    titulo: "A Cerimônia",
    intro: 'Onde cada detalhe fala de amor e cada passo nos conduz ao nosso "sim".',
    imagens: [ {
      src: "img/cerimonia/img1.webp",
      alt: "Detalhe da decoração do altar"
    }, {
      src: "img/cerimonia/img2.webp",
      alt: "Visão geral do local da cerimônia"
    }, {
      src: "img/cerimonia/img3.webp",
      alt: "Área externa do local da cerimônia"
    } ]
  },
  grandeDia: {
    titulo: "O Grande Dia",
    subtitulo: "Cerimônia e Recepção",
    labelData: "Data",
    labelHorario: "Horário",
    labelLocal: "Local",
    botaoMapa: "Como chegar",
    mapaSrc: "https://www.google.com/maps?q=Espa%C3%A7o%20Hotel%20Fazenda%20Pouso%20Real%2C%20Rua%20Juscelino%20Kubitscheck%2C%201000%2C%20Jaboticatubas%2C%20MG&z=15&output=embed",
    mapaTitle: "Mapa mostrando a localização do evento"
  },
  presentes: {
    titulo: "Lista de Presentes",
    intro: "Sua presença é o nosso maior presente! Mas, se desejar nos presentear de outra forma, ficaremos muito felizes com uma contribuição para o início da nossa vida a dois, nossa casa e nossa lua de mel. Preparamos algumas cotas simbólicas com carinho para quem quiser fazer parte desse sonho conosco.",
    ordenarLabel: "Ordenar lista por:",
    ordenarOpcoes: [ {
      value: "az",
      label: "A-Z"
    }, {
      value: "menor-preco",
      label: "Menor Preço"
    }, {
      value: "maior-preco",
      label: "Maior Preço"
    } ],
    carregarMais: "Mais Opções",
    vazio: "Nenhum presente encontrado.",
    botaoPresentear: "Presentear",
    statusVendido: "Vendido",
    placeholderImagem: ""
  },
  carrinho: {
    titulo: "Meu carrinho",
    labelDescricao: "Descrição do presente",
    labelValor: "Valor",
    labelTotal: "Total",
    botaoAdicionarMais: "Adicionar mais itens",
    botaoContinuar: "Finalizar compra",
    botaoRemover: "Remover"
  },
  checkout: {
    resumoTitulo: "Resumo da sua compra",
    valorPresentes: "Valor Total dos Presentes",
    valorCartaoLabel: "Valor do Cartão Postal",
    subtotalLabel: "Subtotal",
    cartaoRemovidoLabel: "Cartão removido",
    totalLabel: "Total",
    nomeLabel: "Seu nome completo",
    nomePlaceholder: "Digite seu nome",
    mensagemLabel: "Mensagem para os noivos",
    mensagemPlaceholder: "Escreva sua mensagem",
    botaoIA: "Gerar mensagem com IA",
    mensagemGerando: "Gerando...",
    cartaoInstrucao: "Escolha um cartão para acompanhar seu presente:",
    cartaoPadraoTag: "Padrão",
    cartaoPadraoTexto: "Cartão simples",
    cartaoRecomendadoTag: "Recomendado",
    cartaoRecomendadoTexto: "Cartão especial",
    cartaoOpcoes: [ {
      id: "padrao",
      tag: "Padrão",
      texto: "Cartão simples",
      imagem: "img/cartao/img1.webp"
    }, {
      id: "classico",
      tag: "Recomendado",
      texto: "Cartão especial",
      destaque: true,
      imagem: "img/cartao/img2.webp"
    }, {
      id: "floral",
      tag: "Florido",
      texto: "Cartão floral",
      imagem: "img/cartao/img3.webp"
    }, {
      id: "folhagem",
      tag: "Folhagem",
      texto: "Cartão natureza",
      imagem: "img/cartao/img4.webp"
    }, {
      id: "minimal",
      tag: "Minimalista",
      texto: "Cartão minimal",
      imagem: "img/cartao/img5.webp"
    }, {
      id: "rustico",
      tag: "Rústico",
      texto: "Cartão rústico",
      imagem: "img/cartao/img6.webp"
    }, {
      id: "romantico",
      tag: "Romântico",
      texto: "Cartão romântico",
      imagem: "img/cartao/img7.webp"
    } ],
    cartaoCom: "Adicionar cartão",
    cartaoSem: "Não gostaria de enviar um cartão",
    compraSegura: "Compra segura",
    voltarCarrinho: "Voltar ao carrinho",
    concluirCompra: "Concluir compra",
    erroNome: "Informe seu nome.",
    erroNomeCompleto: "Digite nome e sobrenome.",
    erroMensagem: "Escreva uma mensagem.",
    valorCartao: 10
  },
  pagamento: {
    titulo: "Selecione como deseja pagar",
    continuarPix: "Continuar com Pix",
    continuarCom: "Continuar com {{forma}}",
    avisoIndisponivel: "Esta forma de pagamento está indisponível no momento.",
    falhaLink: "Não foi possível processar o pagamento.",
    valorMinimo: 5,
    valorMinimoMsg: "O valor mínimo para pagamento é R$ 5,00.",
    formas: [ {
      id: "pix",
      label: "Pague com Pix",
      subtitle: "Pagamento à vista. Aprovação imediata.",
      detail: "Aprovação em segundos e confirmação rápida.",
      badge: "Novo"
    }, {
      id: "cartao",
      label: "Cartões de Crédito",
      subtitle: "Pagamento em até 6x, parcele sua compra sem juros.",
      detail: "Pague com cartão e conclua na hora.",
      badge: ""
    } ]
  },
  pix: {
    formTitle: "Dados para pagamento",
    formSubtitle: "Preencha os dados para gerar o Pix.",
    labelNome: "Nome completo",
    labelEmail: "E-mail",
    textoEmail: "Enviaremos o Pix e a confirmação para este e-mail.",
    labelCpf: "CPF",
    placeholderCpf: "000.000.000-00",
    labelTelefone: "Telefone",
    placeholderTelefone: "(00) 00000-0000",
    termos: 'Declaro que tive acesso, li e concordo com os <a href="/termos-de-uso" target="_blank" rel="noopener">Termos de uso</a> e a <a href="/politica-de-privacidade" target="_blank" rel="noopener">Política de Privacidade</a> do emanuelleitalo.com',
    valorLabel: "Valor total",
    botaoVoltar: "Voltar",
    botaoAvancar: "Gerar Pix",
    validar: {
      nomeObrigatorio: "Informe seu nome completo.",
      nomeCompleto: "Digite nome e sobrenome.",
      emailObrigatorio: "Informe seu e-mail.",
      emailInvalido: "Digite um e-mail válido.",
      cpfObrigatorio: "Informe seu CPF.",
      cpfInvalido: "CPF inválido.",
      telefoneObrigatorio: "Informe seu telefone.",
      telefoneInvalido: "Telefone inválido.",
      termosObrigatorio: "Aceite os termos para continuar."
    },
    pagamento: {
      mensagemIntro: "*Pedido de presente via Pix*",
      mensagemNomeAnonimo: "Convidado",
      mensagemCartaoSim: "Com cartão",
      mensagemCartaoNao: "Sem cartão",
      mensagemCartaoExtra: "*Valor adicional do cartão aplicado.*",
      mensagemItensLabel: "Itens selecionados",
      mensagemTotalLabel: "Total",
      descricaoPadrao: "Presente de casamento",
      nomeConvidado: "Convidado",
      gerarPix: "Gerando Pix...",
      falhaGerar: "Falha ao gerar Pix.",
      erroGerar: "Erro ao gerar Pix."
    },
    modal: {
      titulo: "Pagamento via Pix",
      descricao: "Use o Pix para concluir sua contribuição.",
      instrucao1: "Abra o app do seu banco.",
      instrucao2: "Escolha Pix e escaneie o QR code.",
      instrucao3: "Confirme o pagamento.",
      qrAlt: "QR code Pix",
      qrIndisponivel: "QR code indisponível.",
      pagamentoAte: "Pague até",
      valorLabel: "Valor",
      copiaTexto: "Ou copie o código Pix:",
      botaoCopiar: "Copiar código",
      botaoCopiado: "Copiado!",
      botaoFalhou: "Falhou, tente novamente",
      dadosDestinatario: "Destinatário",
      dadosPrefixo: "Casamento de",
      rodape: "A confirmação pode levar alguns instantes.",
      compraSegura: "Compra segura",
      iconePix: "PIX",
      iconeOk: "OK"
    }
  },
  cartao: {
    formTitle: "Pagamento com cartão",
    formSubtitle: "Preencha os dados do cartão.",
    labelNumero: "Número do cartão",
    placeholderNumero: "0000 0000 0000 0000",
    labelValidade: "Validade (MM/AA)",
    placeholderValidade: "MM/AA",
    labelCvv: "CVV",
    placeholderCvv: "000",
    labelNome: "Nome completo",
    labelEmail: "E-mail",
    labelCpf: "CPF",
    placeholderCpf: "000.000.000-00",
    labelTelefone: "Telefone",
    placeholderTelefone: "(00) 00000-0000",
    labelCep: "CEP do titular",
    placeholderCep: "00000-000",
    labelNumeroEndereco: "Número do endereço",
    placeholderNumeroEndereco: "Ex.: 123",
    labelParcelas: "Parcelas",
    maxParcelas: 6,
    jurosPorParcela: 0,
    minimoParcelamento: 0,
    textoParcelamentoMinimo: "",
    textoParcelamentoIndisponivel: "Parcelas indisponíveis para este cartão.",
    termos: 'Declaro que tive acesso, li e concordo com os <a href="/termos-de-uso" target="_blank" rel="noopener">Termos de uso</a> e a <a href="/politica-de-privacidade" target="_blank" rel="noopener">Política de Privacidade</a> do emanuelleitalo.com',
    botaoVoltar: "Voltar",
    botaoAvancar: "Pagar com cartão",
    validar: {
      numeroObrigatorio: "Informe o número do cartão.",
      validadeObrigatoria: "Informe a validade.",
      validadeInvalida: "Validade inválida.",
      cvvObrigatorio: "Informe o CVV.",
      nomeObrigatorio: "Informe seu nome completo.",
      nomeCompleto: "Digite nome e sobrenome.",
      emailObrigatorio: "Informe seu e-mail.",
      emailInvalido: "Digite um e-mail válido.",
      cpfObrigatorio: "Informe seu CPF.",
      cpfInvalido: "CPF inválido.",
      telefoneObrigatorio: "Informe seu telefone.",
      telefoneInvalido: "Telefone inválido.",
      cepObrigatorio: "Informe o CEP do titular.",
      cepInvalido: "CEP inválido.",
      numeroEnderecoObrigatorio: "Informe o número do endereço.",
      parcelasObrigatorio: "Selecione as parcelas.",
      termosObrigatorio: "Aceite os termos para continuar."
    },
    pagamento: {
      mensagemIntro: "*Pedido de presente via cartão*",
      mensagemNomeAnonimo: "Convidado",
      mensagemCartaoSim: "Com cartão",
      mensagemCartaoNao: "Sem cartão",
      mensagemCartaoExtra: "*Valor adicional do cartão aplicado.*",
      mensagemItensLabel: "Itens selecionados",
      mensagemTotalLabel: "Total",
      descricaoPadrao: "Presente de casamento",
      nomeConvidado: "Convidado",
      gerando: "Processando pagamento...",
      falhaGerar: "Falha ao processar pagamento.",
      erroGerar: "Erro ao processar pagamento.",
      sucesso: "Pagamento aprovado!",
      pendente: "Pagamento pendente. Aguarde a confirmação."
    },
    modal: {
      titulo: "Pagamento com cartão",
      descricao: "Seu pagamento foi processado com sucesso.",
      icone: "CC",
      aprovadoTitulo: "Pagamento aprovado!",
      aprovadoTexto: "Recebemos seu pagamento. Obrigado pelo presente.",
      aprovadoHoraPrefixo: "Confirmado em",
      rodape: "A confirmação pode levar alguns instantes.",
      compraSegura: "Compra segura"
    }
  },
  confirmacao: {
    titulo: "Confirme sua presença",
    intro: "Para que possamos organizar tudo com muito carinho, por favor, confirme sua presença pesquisando seu nome abaixo.",
    labelNome: "Nome do convite (Ex.: Jandira e Nilson)",
    placeholderNome: "Digite o nome aqui",
    botaoBuscar: "Pesquisar",
    tituloConfirmar: "Confirmar presença?",
    textoConfirmar: "Você está confirmando para:",
    textoValidacao: "Para sua segurança, informe os últimos 4 dígitos do telefone cadastrado neste convite.",
    botaoValidar: "Validar",
    botaoConfirmar: "Confirmar Presença",
    botaoVoltar: "Voltar",
    form: {
      tituloLista: "Informe quem irá comparecer:",
      aviso: "Após o envio da confirmação de presença, não será possível realizar alterações.",
      infoLimite: "Você pode confirmar até <strong>{{limite}}</strong> convidados.",
      labelEmail: "E-mail: (Preenchimento obrigatório)",
      placeholderEmail: "Digite seu e-mail aqui",
      textoEmail: "Você receberá a confirmação de presença neste e-mail.",
      termos: 'Declaro que tive acesso, li e concordo com os <a href="/termos-de-uso" target="_blank" rel="noopener">Termos de uso</a> e a <a href="/politica-de-privacidade" target="_blank" rel="noopener">Política de Privacidade</a>.'
    },
    ui: {
      resultadoResumo: "{{total}} convite{{s}} encontrado{{s}}",
      telPrefixo: "Tel.",
      telNaoInformado: "Não informado",
      botaoSelecionar: "Selecionar",
      botaoConfirmado: "Confirmado",
      linkNovaPesquisa: "Realizar nova pesquisa",
      carregandoValidacao: "Verificando...",
      carregandoConfirmacao: "Enviando...",
      convidadoLabel: "Convidado {{numero}}",
      labelNomeCompleto: "Nome completo",
      placeholderNomeConvidado: "Nome do convidado",
      labelIdade: "Idade",
      idadePlaceholder: "Selecione a faixa",
      idadeAdulto: "Adulto",
      idadeCrianca05: "Criança 0-5",
      idadeCrianca610: "Criança 6-10",
      labelStatus: "Status",
      statusConfirmado: "Confirmado",
      statusNaoIrei: "Não irei"
    },
    mensagens: {
      buscaMinimo: "Por favor, digite pelo menos 3 letras do nome para buscar.",
      buscaFalha: "Falha ao buscar convidados.",
      buscaNaoEncontrado: "Não foi possível localizar o nome informado. Tente inserir o nome de algum convidado presente neste convite.",
      conexaoErro: "Erro ao conectar com o servidor.",
      selecioneConvite: "Selecione um convite antes de validar.",
      validarDigitos: "Digite exatamente os últimos 4 números do telefone.",
      validarFalha: "Falha ao validar convite.",
      validarErro: "Erro na validação.",
      validarConexao: "Erro de conexão.",
      confirmarZero: 'Por favor, confirme pelo menos um convidado (preencha o nome e selecione "Confirmado") ou clique em Cancelar.',
      emailInvalido: "Por favor, preencha o campo de E-mail corretamente para receber sua confirmação.",
      termosObrigatorio: "Para prosseguir é necessário confirmar que os dados foram revisados.",
      faixaEtariaObrigatoria: "Selecione a faixa etária de todos os convidados.",
      confirmarErroPrefixo: "Erro ao confirmar: ",
      confirmarFalha: "Falha ao confirmar presença.",
      confirmarErro: "Erro de conexão. Verifique sua internet e tente novamente."
    },
    sucesso: {
      titulo: "Chegou a hora de você brilhar com aquele presente especial",
      texto: "Demonstre o seu carinho por Emanuelle e Ítalo escolhendo um dos presentes da lista que eles criaram e torne o casamento ainda mais inesquecível.",
      botaoPresentear: "Presentear agora",
      botaoJaPresenteei: "Já presenteei"
    },
    email: {
      assunto: "Confirmação de Presença - Casamento Emanuelle e Ítalo",
      mensagemTemplate: "Olá!\n\nRecebemos sua confirmação de presença com muita alegria!\n\nDetalhes da Confirmação:\n- Convidados: {{nomes}}\n- Total de Lugares: {{qtd}}\n\nEsperamos vocês para celebrar este momento especial conosco!\n\nAtenciosamente,\n{{noivos}}"
    }
  },
  recados: {
    recaptchaSiteKey: "6LcgwXUsAAAAAJCNhihHWEq2FYrodb_MSTdgSuVm"
  },
  rodape: {
    mensagem: "Com carinho, esperamos por você!",
    credito: "© 2026 - Desenvolvido por Ítalo Xavier",
    links: [ {
      label: "Termos de uso",
      href: "/termos-de-uso"
    }, {
      label: "Política de privacidade",
      href: "/politica-de-privacidade"
    } ]
  }
  // Descomente para ativar cache busting de assets
  // assetsVersion: "v1"
};
