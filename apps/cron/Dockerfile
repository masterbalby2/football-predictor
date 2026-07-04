# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

FROM base AS builder
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm -r run build

FROM base AS cron
ENV NODE_ENV=production
ENV CRON_ONE_SHOT=true
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/cron/dist ./apps/cron/dist
COPY --from=builder /app/apps/cron/package.json ./apps/cron/package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/package.json ./package.json
WORKDIR /app/apps/cron
# Runs once and exits — Railway Cron restarts on schedule.
CMD ["node", "dist/index.js"]
