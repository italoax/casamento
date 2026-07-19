# Rodando o projeto no Docker (desenvolvimento)

Este guia sobe o site **localmente** no Docker, com **hot-reload** (você edita no
seu editor e o container recarrega sozinho), conectando no **banco de produção**
pelo `.env`.

> ⚠️ **Atenção:** este ambiente usa o **banco real de produção**. Ao testar
> cadastros, RSVP ou pagamentos, você mexe em **dados reais dos convidados**.
> Se quiser um banco vazio só pra testes, me avise que monto um MySQL local.

## Pré-requisitos

- **Docker Desktop** instalado e aberto ([download](https://www.docker.com/products/docker-desktop/)).
- O arquivo **`.env`** presente na raiz do projeto (com as chaves reais).

## Comandos do dia a dia

> ℹ️ Todos os comandos levam **`--env-file .env.docker`**. Isso faz o Compose
> ignorar o `./.env` (cujo formato o parser dele rejeita) — o Next.js carrega o
> `.env` real sozinho. Se esquecer o flag, dá erro de "unexpected character".

```bash
# Subir o site (na primeira vez, ou quando mudar o package.json, use --build)
docker compose --env-file .env.docker up --build

# Depois da primeira vez, pode subir sem rebuildar:
docker compose --env-file .env.docker up

# Acessar no navegador:
#   http://localhost:3000

# Parar: Ctrl+C no terminal, ou noutro terminal:
docker compose --env-file .env.docker down
```

Rodar em segundo plano (libera o terminal) e ver os logs:

```bash
docker compose --env-file .env.docker up -d   # sobe em background
docker compose --env-file .env.docker logs -f # acompanha os logs (Ctrl+C só sai do log)
docker compose --env-file .env.docker down    # derruba quando quiser
```

> 💡 **Dica:** pra não digitar o flag toda vez, no PowerShell você pode criar um
> atalho na sessão: `function dc { docker compose --env-file .env.docker @args }`
> e depois usar `dc up`, `dc down`, `dc logs -f`.

## Como funciona (pra você aprender)

- **`Dockerfile.dev`** — a "receita" da imagem. Parte do `node:20-slim`, copia o
  `package*.json` e roda `npm ci` (instala as dependências). Só isso fica dentro
  da imagem; o código vem por volume.
- **`docker-compose.yml`** — orquestra o container. Pontos-chave:
  - `env_file: .env` → injeta suas variáveis (banco, Asaas, e-mail...).
  - `NODE_ENV: development` → força modo dev (hot-reload), mesmo se o `.env` disser
    `production`.
  - `WATCHPACK_POLLING`/`CHOKIDAR_USEPOLLING` → no Windows, é o que faz o hot-reload
    detectar suas edições.
  - **Volumes** (a parte mais importante):
    - `.:/app` → monta seu código no container (é o que dá o hot-reload).
    - `/app/node_modules` e `/app/.next` → mantêm o `node_modules` **do container**
      (Linux). Isso é essencial: o `sharp` tem binário nativo compilado pra Linux;
      o `node_modules` do Windows não rodaria aqui.
- **`.dockerignore`** — lista o que NÃO entra na imagem (segredos, `node_modules`,
  `backups`, etc.).
- **`.env.docker`** — arquivo **vazio de propósito**. Só existe para o Compose
  ignorar o `./.env` (o parser dele quebra no `SMTP_FROM="Nome <email>"`). Quem
  carrega as variáveis reais é o próprio Next.js, lendo o `.env` do código montado.

## Perguntas comuns

**Mudei um arquivo e não recarregou.**
No Windows isso quase sempre é o watcher — confirme que o container está com
`WATCHPACK_POLLING=true` (já está no compose). Em último caso:
`docker compose --env-file .env.docker restart`.

**Instalei um pacote novo (mudei o `package.json`).**
Rode `docker compose --env-file .env.docker up --build` pra reinstalar as dependências.

**Quero um terminal dentro do container** (pra rodar comandos, ex. `npm run backup`):

```bash
docker compose --env-file .env.docker exec app sh
```

**Isso substitui a Hostinger?**
Não — este setup é só pra **desenvolvimento local**. Pra hospedar em produção
(num VPS) o ideal é uma imagem otimizada com `build` + `next start`. Quando quiser,
eu monto essa versão de produção também.
