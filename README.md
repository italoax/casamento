# 💍 Site de Casamento — Emanuelle & Italo

Site completo de casamento: confirmação de presença (RSVP), lista de presentes com
pagamento online, mural de recados, álbum colaborativo de fotos da festa e um painel
administrativo para os noivos gerenciarem tudo.

Construído com **Next.js 16** (App Router) e **MySQL**, rodando em servidor Node
próprio e empacotado em **Docker**.

---

## ✨ Funcionalidades

### Para os convidados

- **Confirmação de presença (RSVP)** — o convidado busca seu nome, valida a
  identidade pelos 4 últimos dígitos do telefone e confirma quantos lugares vai usar.
- **Lista de presentes** — carrinho de compras com pagamento via **PIX** (QR Code) ou
  **cartão de crédito**, com controle de estoque.
- **Mural de recados** — mensagens para os noivos, com ajuda opcional de IA para
  escrever o texto.
- **Área da festa** — após o evento, os convidados acessam por QR Code e enviam suas
  fotos para um álbum colaborativo.
- **Página dos padrinhos** e páginas legais (termos de uso e política de privacidade).
- **PWA** — instalável no celular, com página offline.

### Para os noivos (painel administrativo)

- **Gestão de convidados** — cadastro, listas, importação por CSV e exportação.
- **Acompanhamento de RSVP** — quem confirmou, quantos lugares, observações.
- **Vendas e presentes** — pedidos, status de pagamento e sincronização com o gateway.
- **Disparo por WhatsApp** — envio de convites com fila, modelos de mensagem e histórico.
- **Moderação de recados** e curadoria das **fotos da festa**.
- **Segurança** — login com **2FA (TOTP)**, múltiplos usuários com permissões,
  logs de auditoria e alertas.
- **Backups** automáticos do banco de dados.

---

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2 (App Router) + React 19 |
| Linguagem | TypeScript |
| Banco de dados | MySQL (`mysql2`) |
| Cache / rate limit | Redis |
| Pagamentos | [Asaas](https://www.asaas.com/) (PIX e cartão) |
| E-mail | Nodemailer (SMTP) |
| Autenticação | JWT (`jose`) + 2FA TOTP (`otplib`) + bcrypt |
| Anti-spam | Cloudflare Turnstile |
| Imagens | `sharp` |
| IA (recados) | Claude (`@anthropic-ai/sdk`) |
| Validação | Zod |
| Infra | Docker (multi-stage) |

---

## 📋 Requisitos

- **Node.js** `>=20 <23`
- **MySQL** 8+
- **Docker Desktop** (opcional, mas recomendado — veja [DOCKER.md](DOCKER.md))

---

## ⚙️ Configuração

Crie um arquivo **`.env`** na raiz do projeto. Ele está no `.gitignore` e **nunca**
deve ser versionado.

### Variáveis obrigatórias (em produção)

| Variável | Descrição |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexão com o MySQL |
| `BASE_URL` | URL pública do site (ex.: `https://seusite.com`) |
| `ASAAS_ENV` | `sandbox` ou `production` |
| `ASAAS_API_KEY` | Chave da API do Asaas (ou `ASAAS_API_KEY_B64` em base64) |
| `TURNSTILE_SECRET` | Chave secreta do Cloudflare Turnstile |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Envio de e-mails |
| `SESSION_SECRET` | Segredo da sessão — **mínimo 64 caracteres** |
| `RSVP_TOKEN_SECRET` | Segredo do token de RSVP — **mínimo 64 caracteres** |
| `ENCRYPTION_KEY` | **Exatamente 64 caracteres hexadecimais** (AES-256-GCM) |

> A aplicação valida tudo isso na inicialização em produção e **recusa subir** com
> variáveis ausentes, segredos fracos ou valores de placeholder.

### Gerando os segredos

```bash
# SESSION_SECRET e RSVP_TOKEN_SECRET (64+ caracteres)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# ENCRYPTION_KEY (exatamente 64 hex = 256 bits)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🗄️ Banco de dados

Crie as tabelas a partir do schema:

```bash
mysql -u SEU_USUARIO -p SEU_BANCO < database/schema.sql
```

Depois gere o primeiro usuário administrador do painel (a senha é gravada com
bcrypt, nunca em texto puro):

```bash
node database/criar-admin.mjs admin "SuaSenhaForte123!"
```

O comando imprime o `INSERT` pronto para você executar no banco.

---

## ▶️ Rodando o projeto

### Com Docker (recomendado)

Crie uma vez o arquivo **`.env.docker`** — ele é **vazio de propósito**: serve só para
o Compose ignorar o `./.env` real (cujo formato o parser dele rejeita). Quem carrega as
variáveis é o próprio Next.js.

```bash
touch .env.docker
docker compose --env-file .env.docker --profile dev up --build
```

Acesse **http://localhost:3000**. O guia completo, com explicação de cada parte,
está em **[DOCKER.md](DOCKER.md)**.

### Direto com Node

```bash
npm install
npm run dev
```

---

## 📜 Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (hot-reload) |
| `npm run dev:https` | Desenvolvimento com HTTPS (útil para testar PWA/webhooks) |
| `npm run build` | Build de produção |
| `npm start` | Sobe o servidor de produção (`server.js`) |
| `npm run deploy` | Publica no servidor de produção |
| `npm run backup` | Backup do banco de dados |

Scripts utilitários avulsos ficam em [`scripts/`](scripts/) (importar convidados de
CSV, atribuir listas, verificar integridade do banco).

---

## 📁 Estrutura

```
src/
├── app/
│   ├── api/          # Rotas de API (convidados, presentes, pagamentos, painel...)
│   ├── painel/       # Painel administrativo dos noivos
│   ├── festa/        # Área da festa (fotos dos convidados)
│   └── ...           # Páginas públicas
├── components/       # Componentes React compartilhados
└── lib/              # Regras de negócio (pagamentos, auth, e-mail, WhatsApp, banco)

public/               # Assets estáticos e JS do site público
database/             # Schema SQL e script de criação de admin
scripts/              # Utilitários de manutenção
```

---

## 🔒 Segurança

Este projeto lida com dados pessoais de convidados e pagamentos. Cuidados adotados:

- Dados sensíveis (e-mail, CPF, telefone) **criptografados** com AES-256-GCM.
- Senhas com **bcrypt**; painel com **2FA (TOTP)** e permissões por usuário.
- **Rate limiting** nas rotas públicas e bloqueio progressivo por tentativas.
- Todas as consultas SQL são **parametrizadas**.
- Telefones **mascarados** nas respostas públicas da busca de convidados.
- **Logs de auditoria** das ações do painel.
- Segredos ficam exclusivamente em variáveis de ambiente — o `.env` nunca é versionado.

> Encontrou uma vulnerabilidade? Veja [`public/.well-known/security.txt`](public/.well-known/security.txt).

---

## 📄 Licença

Projeto pessoal, publicado como portfólio. O código pode servir de referência, mas
os textos, fotos e identidade visual do casal não devem ser reutilizados.
