# syntax=docker/dockerfile:1

# ---------- dependências ----------
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

# ---------- build do front (SSR) ----------
FROM deps AS build
# Variáveis VITE_* entram no bundle do navegador no momento do build.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    NITRO_PRESET=node-server
COPY . .
RUN bun run build

# ---------- runner de migrações ----------
FROM node:22-alpine AS migrator
WORKDIR /app
COPY --from=deps /app/node_modules/postgres ./node_modules/postgres
COPY scripts/migrate.mjs ./scripts/migrate.mjs
COPY supabase/migrations ./supabase/migrations
CMD ["node", "scripts/migrate.mjs"]

# ---------- runtime do front ----------
FROM node:22-alpine AS web
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", ".output/server/index.mjs"]
