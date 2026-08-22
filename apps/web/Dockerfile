# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

# ---- Builder ----
FROM base AS builder
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm install --frozen-lockfile || pnpm install
# Build shared packages first so the web app can import them.
RUN pnpm --filter @soccer/shared-types run build
RUN pnpm --filter @soccer/web run build

# ---- Runner ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy the standalone Next.js output + static assets.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
# public/ may be empty or missing — copy only if it exists
COPY --from=builder /app/apps/web/public* ./apps/web/public

USER nextjs
EXPOSE 3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
