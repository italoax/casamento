# Aviso de fotos por e-mail

Acesse **Painel → E-mail das fotos** com uma conta de administrador ou gerente. O aviso vem preenchido com assunto, mensagem e link para a galeria. Edite o conteúdo, selecione os convidados, revise a prévia e clique em enviar. A preparação da prévia não envia mensagens.

Os contatos vêm da coluna `email` da tabela `convidados`. Convites sem endereço válido são excluídos, e endereços repetidos recebem apenas uma mensagem por envio. O link padrão é `https://emanuelleitalo.com/#album-fotos`; a galeria aparece na fase Encerrado.

O envio usa a conta SMTP existente (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). As tabelas `email_fotos_jobs` e `email_fotos_fila` são criadas automaticamente no primeiro acesso autorizado à aba. A conta do banco precisa permitir `CREATE TABLE`.

A fila é processada no runtime Node do Next, via `src/instrumentation.js`, com um e-mail a cada 3 segundos. O processo do servidor deve continuar ativo; o navegador pode ser fechado. Há um envio ativo por vez. Pausar/cancelar afeta os próximos destinatários, e um e-mail que já está sendo enviado pode terminar.

O histórico persiste no MySQL. Uma chave de solicitação impede que repetir a confirmação crie a mesma fila duas vezes. Locks do MySQL protegem contra workers concorrentes. Cinco falhas consecutivas pausam o envio. Itens com falha ou entrega incerta não são reenviados automaticamente: confira o recebimento antes de iniciar outro envio para essas pessoas. Retomar processa somente os itens pendentes.

“Enviado” indica que o servidor SMTP aceitou a mensagem; não confirma abertura nem entrega na caixa de entrada. Os endereços são usados individualmente, sem expor a lista de convidados nos e-mails.

Testes sem SMTP ou banco reais:

```sh
node --experimental-vm-modules --test scripts/email-fotos.test.mjs
```
