# syntax=docker/dockerfile:1.7
#
# Dockerfile único do site "casamento" (Next.js 16 + custom server em server.js).
# Multi-stage com um padrão comum aos dois projetos do monorepo:
#   deps    -> instala node_modules (camada cacheada por lockfile)
#   builder -> gera o .next de produção (next build)
#   dev     -> next dev com hot-reload (usado via `target: dev` no compose)
#   runtime -> imagem final enxuta de produção (roda server.js)
#
# Base node:20-slim (Debian) e NÃO alpine: o "sharp" usa binário nativo que
# precisa de glibc. Alpine (musl) daria dor de cabeça.

########## deps: instala dependências ##########
FROM node:20-slim AS deps
WORKDIR /app
# Copia só os manifests primeiro: o npm ci só re-roda quando o lockfile muda.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

########## builder: build de produção ##########
FROM node:20-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# O `next build` roda a validação de env (NODE_ENV=production) e exige os valores
# reais. Montamos o .env como SECRET só durante este RUN — ele NÃO fica em
# nenhuma camada da imagem. (docker compose passa via build.secrets abaixo.)
RUN --mount=type=secret,id=dotenv,target=/app/.env,required=true npm run build

########## dev: hot-reload (docker compose --profile dev up) ##########
FROM node:20-slim AS dev
WORKDIR /app
ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1 \
    # Windows/WSL: o watcher só detecta mudança em volume montado com polling.
    WATCHPACK_POLLING=true \
    CHOKIDAR_USEPOLLING=true
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", "3000"]

########## runtime: imagem final de produção ##########
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOST=0.0.0.0
# node_modules completo é intencional: as ferramentas de build (typescript, @types)
# ficam em "dependencies" e o `next start` precisa do typescript pra ler o
# next.config.ts. Como não há devDependencies, não há o que podar.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY public ./public
COPY scripts ./scripts
COPY package.json package-lock.json next.config.ts server.js ./
EXPOSE 3000
# Healthcheck via Node (a imagem slim não traz curl/wget).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"
# server.js é o wrapper (mesmo usado na Hostinger): sobe `next start` + backup diário.
CMD ["node", "server.js"]
