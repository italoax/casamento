Abra **Painel → Fotos do álbum** (`/painel?aba=album-fotos`) com uma conta de administrador ou gerente.

Desmarque **Mostrar o álbum completo**, marque as miniaturas desejadas e clique em **Salvar seleção**. Clique numa imagem para ampliar. As próximas fotos carregam automaticamente quando você chega perto do fim da lista, sem perder a seleção das páginas anteriores. **Carregar mais fotos** permanece disponível como alternativa manual; em caso de erro, clique em **Tentar novamente**. O contador inclui todas as fotos escolhidas, inclusive as que ainda não tiveram suas miniaturas carregadas.

A seleção fica na tabela MySQL `album_selecao`, criada automaticamente no primeiro salvamento. Depois que essa versão do site estiver publicada, mudanças de seleção não exigem build nem publicação: a API pública consulta os IDs salvos a cada nova requisição. Recarregue a galeria para ver a mudança. As imagens continuam hospedadas na Adobe. O botão **Ver todas as fotos** continua abrindo o álbum completo e público.

Para exibir todas novamente, marque **Mostrar o álbum completo** e salve. Para ocultar todas, desmarque essa opção, clique em **Desmarcar todas** e salve. Uma falha na consulta ao banco retorna erro; não restaura o álbum completo.

Até o primeiro salvamento no painel, a galeria exibe o álbum completo. A seleção passa a ser controlada exclusivamente pelo painel e pelo banco. O botão flutuante **Salvar seleção** permite salvar sem voltar ao início da lista.
