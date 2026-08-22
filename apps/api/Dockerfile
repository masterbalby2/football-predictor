# syntax=docker/dockerfile:1.7

# ---- Base: install pnpm + deps for the whole monorepo ----
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

# ---- API runtime ----
FROM base AS api
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/package.json ./package.json
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/index.js"]
