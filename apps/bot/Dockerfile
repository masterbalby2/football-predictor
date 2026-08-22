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
RUN pnpm deploy --filter=@soccer/bot --prod --legacy /app/deploy

# ---- Bot runtime ----
FROM node:22-alpine AS bot
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/deploy ./
CMD ["node", "dist/index.js"]
