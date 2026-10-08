# Cache e atualização dos arquivos

`npm run build` gera cópias de CSS e JavaScript em `public/_assets/`, com um hash do conteúdo no caminho. O layout e as páginas públicas usam essas URLs automaticamente. Os módulos JS ficam juntos na mesma versão para preservar seus imports relativos.

Se os arquivos não mudam, as URLs permanecem iguais, inclusive após reiniciar o servidor. Mudanças no conjunto CSS ou JS geram uma nova pasta para aquele conjunto. Não é necessário configurar `ASSET_VERSION`.

## Publicação

Publique `.next` e a pasta `public` completa, incluindo `public/_assets`. Essas cópias são geradas pelo build e não entram no Git. Se a hospedagem executa `npm run build`, elas são criadas automaticamente.

Para a Hostinger com aplicação Next.js, o build também gera `.next/standalone/server.js`. O passo final copia `public` (incluindo `_assets`) e `.next/static` para esse pacote. Mantenha o comando de construção `npm run build` e o diretório de saída `.next`. Para executar o pacote manualmente: `node .next/standalone/server.js`.

Mantenha as pastas de versões anteriores ao atualizar um servidor existente: páginas que já estavam abertas ainda podem solicitar seus módulos. O gerador preserva essas pastas e nunca sobrescreve um arquivo imutável com conteúdo diferente.

## Políticas

- `/_assets/…` e arquivos com hash do Next: cache longo e imutável. O navegador pode reutilizá-los sem consultar o servidor.
- `/css`, `/js`, imagens e fontes de nome fixo: revalidação HTTP com `no-cache`, para detectar substituições.
- Service worker, manifest e página offline: revalidação obrigatória.
- A home e os metadados do álbum mantêm seus prazos de 5 minutos. APIs privadas e downloads conservam suas políticas próprias.

O service worker usa cache primeiro para URLs imutáveis e rede primeiro para arquivos de nome fixo. A versão da PWA acompanha os hashes dos arquivos e do próprio worker; ao ativar uma versão nova, remove somente caches antigos do site. O cache local tem limite de entradas. Em desenvolvimento, o registro é desativado para não interferir nas alterações locais.

O cache de fotos carregadas diretamente do Adobe continua sob controle do Adobe. Regras externas de CDN devem respeitar esses cabeçalhos e não transformar URLs sem hash em arquivos imutáveis.

Para verificar o versionamento e a resolução das dependências: `node --test scripts/static-assets.test.mjs`.
