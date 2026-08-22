# syntax=docker/dockerfile:1.7

# ---- Base: install pnpm ----
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# ---- Builder: install + build all workspaces ----
FROM base AS builder
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm -r run build
# Create a self-contained deploy bundle with real files (no symlinks).
# pnpm deploy resolves all workspace + external deps into a flat node_modules.
RUN pnpm deploy --filter=@soccer/api --prod --legacy /app/deploy

# ---- API runtime ----
FROM node:22-alpine AS api
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/deploy ./
EXPOSE 4000
CMD ["node", "dist/index.js"]
