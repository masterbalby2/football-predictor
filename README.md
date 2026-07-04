# Soccer Match Predictor

Dixon-Coles style statistical model that predicts EPL, La Liga, and Bundesliga
match outcomes (Win / Draw / Loss probabilities + top-3 most likely scorelines).

Outputs:
- **Web dashboard** — Next.js + shadcn/ui (browse fixtures, predictions, team stats, model accuracy)
- **Telegram bot** — daily digest push + on-demand commands (`/today`, `/fixture`, `/team`, `/accuracy`)

Both read from the same Postgres database, refreshed once daily by a scheduled
cron job. Redis is used for caching/ephemeral state.

## Tech stack

| Concern        | Choice                                   |
| -------------- | ---------------------------------------- |
| Language       | TypeScript (Node.js runtime)             |
| Monorepo       | pnpm workspaces                          |
| Database       | PostgreSQL via `postgres.js`             |
| Cache          | Redis via `ioredis`                       |
| API            | Fastify                                  |
| Frontend       | Next.js (App Router) + shadcn/ui + Tailwind |
| Telegram       | telegraf                                 |
| Data source    | football-data.org API (provider-agnostic scraper layer) |
| Scraping utils | cheerio + axios + p-retry                |
| Scheduler      | Railway Cron (standalone Node script)    |
| Validation     | zod (shared)                             |
| Icons          | lucide-react (no emojis)                 |
| Fonts          | Geist + Geist Mono                       |
| Deploy         | Railway (Postgres + Redis plugins + one service per app) |

## Monorepo layout

```
soccer-predictor/
├── apps/
│   ├── web/        # Next.js frontend
│   ├── api/        # Fastify API
│   ├── bot/        # Telegram bot
│   └── cron/       # Scraper + model job (Railway Cron)
├── packages/
│   ├── db/         # postgres.js client + schema + migrations + seed
│   ├── model/      # Poisson / Dixon-Coles prediction engine
│   ├── shared-types/  # zod schemas + TS types
│   └── config/     # shared env/config loader
├── docker-compose.yml
├── PROJECT_SPEC.md
├── pnpm-workspace.yaml
└── package.json
```

## Quick start (local)

```bash
# 1. Install
pnpm install

# 2. Start local Postgres + Redis
docker compose up -d

# 3. Configure env
cp .env.example .env
#   - DATABASE_URL=postgres://postgres:postgres@localhost:5432/soccer
#   - REDIS_URL=redis://localhost:6379
#   - FOOTBALL_DATA_API_TOKEN=  (optional; without it the app runs on seed data)
#   - TELEGRAM_BOT_TOKEN=       (optional; bot runs in dry-run mode without it)

# 4. Migrate + seed sample data
pnpm db:setup

# 5. Run the model refresh once (populates predictions)
pnpm cron:run

# 6. Start API + Web
pnpm dev:api   # http://localhost:4000
pnpm dev:web   # http://localhost:3000
```

The seed data is enough to demo the full UI/model without an external API token.
With a `FOOTBALL_DATA_API_TOKEN` set, the cron job pulls live results + fixtures
from football-data.org instead.

## Deploy to Railway

See [`DEPLOY.md`](./DEPLOY.md). In short:

1. Create a Railway project, add **PostgreSQL** and **Redis** plugins.
2. Create one Railway service per app (`api`, `web`, `bot`, `cron`).
3. Set env vars (reference `.env.example`).
4. `railway up` from each service directory (or wire to this repo for auto-deploy).
5. Add a cron schedule to the `cron` service (e.g. `0 6 * * *`).

## Data source

Primary: **football-data.org** REST API (`/v4`). Covers EPL (PL), La Liga (PD),
Bundesliga (BL1) on the free tier. The scraper is behind a provider interface
(`packages/db` / `apps/cron`) so an FBref HTML scraper can be added without
touching the model or API.
