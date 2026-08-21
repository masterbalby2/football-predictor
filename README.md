<div align="center">

# Football Predictor

### AI-powered football match predictions using the Dixon-Coles Poisson model

Predict **Premier League**, **La Liga**, and **Bundesliga** match outcomes with
Win / Draw / Loss probabilities, expected goals, top-3 scoreline forecasts,
recent-form adjustment, and confidence-rated betting-style tips.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/mintahandrews/football-predictor/pulls)

</div>

---

## Overview

**Football Predictor** is a full-stack sports analytics platform that uses the
**Dixon-Coles statistical model** (Poisson regression with a low-score correction
and time-decay weighting) to forecast football match results. It blends
season-long team strength with **recent real-life form** to produce accurate,
calibrated predictions.

The model is fit per league via **gradient ascent (Adam optimizer)** on the
time-decayed weighted log-likelihood with L2 ridge regularization, then used to
generate full scoreline probability grids for upcoming fixtures.

### What makes it accurate

| Feature | Description |
|---------|-------------|
| **Dixon-Coles model** | Poisson regression with low-score correction (`tau` function) that boosts 0-0/1-1 draws and depresses 0-1/1-0 results — correcting the independence assumption |
| **Time-decay weighting** | Recent matches weigh more than old ones (`exp(-ln2 * days / halfLife)`) so the model tracks current team strength |
| **Recent-form adjustment** | Blends each team's last-N-matches scoring/conceding rate (real-life form) into the season-long lambda — captures injuries, morale, tactical shifts |
| **Confidence scoring** | Every prediction includes a confidence score (margin between top probability and runner-up) so you know how much to trust the pick |
| **Walk-forward validation** | Rolling-origin cross-validation tracks out-of-sample accuracy, Brier score, and log-loss over time |

### What you get

- **Win / Draw / Loss probabilities** for every upcoming fixture
- **Expected goals (xG)** for both teams
- **Top-3 most likely scorelines** with probabilities
- **Confidence-rated tips** — "Strong Home Win", "Lean Draw", "Value Draw", "Too close to call"
- **Team attack/defense strengths** (model parameters)
- **Recent form** (last 5 results per team)
- **Model accuracy tracking** (rolling Brier score, log-loss, 1X2 accuracy)
- **REST API** with OpenAPI/Swagger docs
- **Telegram bot** with daily digest push + on-demand commands

---

## Screenshots

> Add screenshots here after first deploy:
> - Dashboard with fixture cards (tip + confidence + probability bar)
> - Match detail page (prediction tab with tip banner, scoreline forecast)
> - Team detail page (attack/defense strengths + recent form)
> - Accuracy page (rolling model performance charts)

---

## Tech stack

| Concern | Choice |
|---------|--------|
| Language | TypeScript (Node.js 20+) |
| Monorepo | pnpm workspaces |
| Database | PostgreSQL via `postgres.js` |
| Cache | Redis via `ioredis` |
| API | Fastify + Swagger/OpenAPI |
| Frontend | Next.js 15 (App Router) + shadcn/ui + Tailwind CSS |
| Icons | Phosphor Icons |
| Fonts | Geist + Geist Mono |
| Telegram | Telegraf |
| Data source | football-data.org API (provider-agnostic scraper layer) |
| Scraping | axios + cheerio + p-retry |
| Scheduler | Railway Cron (standalone Node script) |
| Validation | Zod (shared across all packages) |
| Deploy | Railway (Postgres + Redis plugins + one service per app) |
| Model | Dixon-Coles Poisson regression + Adam optimizer + recent-form blending |

---

## Monorepo layout

```
football-predictor/
├── apps/
│   ├── web/           # Next.js frontend (dashboard, match details, team stats)
│   ├── api/           # Fastify REST API + Swagger docs
│   ├── bot/           # Telegram bot (daily digest + on-demand commands)
│   └── cron/          # Data scraper + model fit + prediction job
├── packages/
│   ├── db/            # postgres.js client + schema + migrations + repo
│   ├── model/         # Dixon-Coles engine (fit, predict, form, accuracy)
│   ├── shared-types/  # Zod schemas + TypeScript types
│   └── config/        # Shared env/config loader
├── docker-compose.yml # Local Postgres + Redis
├── DEPLOY.md          # Railway deployment guide
├── PROJECT_SPEC.md    # Full project specification
└── package.json
```

---

## Quick start (local)

### Prerequisites

- **Node.js** 20+
- **pnpm** 10+ (`npm install -g pnpm`)
- **Docker** (for local Postgres + Redis)
- **football-data.org API token** — free at [football-data.org/client/register](https://www.football-data.org/client/register)

### Setup

```bash
# 1. Clone
git clone https://github.com/mintahandrews/football-predictor.git
cd football-predictor

# 2. Install dependencies
pnpm install

# 3. Start local Postgres + Redis
docker compose up -d

# 4. Configure environment
cp .env.example .env
#   Edit .env and set:
#   - FOOTBALL_DATA_API_KEY=your-token-here   (required for real data)
#   - AUTH_USERNAME=admin                      (web login)
#   - AUTH_PASSWORD=your-password              (web login)

# 5. Run database migrations
pnpm db:migrate

# 6. Fetch data + fit model + generate predictions
pnpm cron:run

# 7. Start the API + web dashboard
pnpm dev:api   # http://localhost:4000  (API + Swagger docs at /docs)
pnpm dev:web   # http://localhost:3000  (dashboard)
```

Open [http://localhost:3000](http://localhost:3000) and log in with your
`AUTH_USERNAME` / `AUTH_PASSWORD`.

### Optional: Telegram bot

```bash
# In .env, set:
#   TELEGRAM_BOT_TOKEN=your-bot-token
#   TELEGRAM_BOT_OWNER_CHAT_ID=your-chat-id

pnpm dev:bot
```

Without a token, the bot runs in dry-run mode (no polling) for development.

---

## How the model works

### Dixon-Coles Poisson regression

For a match with home team `h` and away team `a`, the model estimates the
expected goals (lambda) for each team:

```
lambda_home = exp(intercept + attack[h] - defense[a] + home_advantage)
lambda_away = exp(intercept + attack[a] - defense[h])
```

Where:
- **attack[team]** — team's attacking strength (higher = scores more)
- **defense[team]** — team's defensive strength (higher = concedes less)
- **home_advantage** — home-field advantage bonus
- **intercept** — baseline scoring rate

### Low-score correction (tau)

The Dixon-Coles `tau` function corrects the independence assumption for
low-scoring results:

```
tau(x, y) =
  1 + delta   if x==0, y==0    (boosts 0-0 draws)
  1 - delta   if x==0, y==1    (depresses 0-1)
  1 - delta   if x==1, y==0    (depresses 1-0)
  1 + delta   if x==1, y==1    (boosts 1-1 draws)
  1           otherwise
```

### Time-decay weighting

Matches are weighted by recency:

```
weight = exp(-ln(2) * days_ago / half_life_days)
```

Default half-life: **365 days** — recent matches influence the model more than
old ones, tracking current team form.

### Recent-form adjustment (real-life form)

The season-long Dixon-Coles strength is blended with each team's **last 6
matches** scoring/conceding rate:

```
form_factor = recent_goals_per_game / league_avg_goals_per_game
  (clamped to [0.4, 2.0] to prevent streaks from dominating)

lambda_adjusted = lambda * ((1 - form_weight) + form_weight * combined_form_factor)
```

This captures short-term factors the season-long model can't see: injuries,
morale, tactical changes, new signings.

### Confidence + tips

Every prediction includes:
- **Confidence** — margin between the top probability and the runner-up (0-100%)
- **Tip** — human-readable suggestion:
  - `Strong Home Win` / `Strong Away Win` (confidence >= 20%)
  - `Lean Home Win` / `Lean Away Win` (confidence >= 8%)
  - `Value Draw` (draw pick with >= 30% probability)
  - `Too close to call` (confidence < 8%)

### Model fitting

The model is fit via **gradient ascent (Adam optimizer)** on the time-decayed
weighted log-likelihood with L2 ridge regularization. Attack and defense
parameters are mean-centered each step for identifiability.

---

## API reference

Base URL: `http://localhost:4000` (or your deployed API URL)
Swagger docs: `GET /docs`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/leagues` | List all leagues |
| `GET` | `/fixtures?league=EPL&limit=100` | Upcoming fixtures with predictions |
| `GET` | `/fixtures/:id` | Single fixture with full prediction |
| `GET` | `/fixtures/:id/prediction` | Prediction for a fixture |
| `GET` | `/teams?league=EPL` | List teams (optionally filtered) |
| `GET` | `/teams/search?q=arsenal` | Search teams by name |
| `GET` | `/teams/:id` | Team detail with strengths + recent form |
| `GET` | `/accuracy` | Rolling model accuracy + Brier score + log-loss |
| `POST` | `/refresh` | Flush cache for real-time data refresh |

### Authentication

If `API_AUTH_TOKEN` is set, all endpoints (except `/health` and `/docs`) require
a Bearer token:

```
Authorization: Bearer <your-token>
```

---

## Configuration

All config is via environment variables (see [`.env.example`](./.env.example)):

### Required

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `REDIS_URL` | Redis connection string | — |
| `FOOTBALL_DATA_API_KEY` | football-data.org API token (free) | — |

### Model tuning

| Variable | Description | Default |
|----------|-------------|---------|
| `DC_DELTA` | Dixon-Coles low-score correction strength | `0.15` |
| `DC_HALF_LIFE_DAYS` | Time-decay half-life | `365` |
| `DC_RIDGE_LAMBDA` | L2 regularization strength | `0` |
| `DC_MAX_GOALS` | Max goals in scoreline grid | `10` |
| `DC_MIN_MATCHES` | Min matches required to fit | `20` |
| `DC_FORM_WEIGHT` | Weight given to recent form (0=season only, 1=form only) | `0.2` |
| `DC_FORM_RECENT_N` | Number of recent matches for form factor | `6` |

### Web auth

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_USERNAME` | Web dashboard login username | `admin` |
| `AUTH_PASSWORD` | Web dashboard login password | `predictor123` |
| `AUTH_SECRET` | Session cookie signing secret | `dev-secret-change-in-production` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token (bot runs in dry-run mode without it) | — |
| `TELEGRAM_BOT_OWNER_CHAT_ID` | Owner chat ID | — |
| `TELEGRAM_DIGEST_HOUR_UTC` | Hour to push daily digest | `7` |
| `API_AUTH_TOKEN` | Bearer token for API auth (empty = open) | — |

---

## Telegram bot commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/today` | Today's predictions across all leagues |
| `/league epl\|laliga\|bundesliga` | Filter predictions by league |
| `/match <team>` | Full breakdown for a team's next fixture |
| `/team <name>` | Team strengths + recent form |
| `/accuracy` | Recent model accuracy stats |
| `/subscribe` | Opt into daily push digest |
| `/unsubscribe` | Opt out |
| `/help` | List all commands |

---

## Deploy to Railway

See [`DEPLOY.md`](./DEPLOY.md) for the full guide. In short:

1. Create a Railway project + add **PostgreSQL** and **Redis** plugins
2. Create one service per app (`api`, `web`, `bot`, `cron`)
3. Set env vars (reference `.env.example`)
4. `railway up` from each service directory
5. Add a cron schedule to the `cron` service (e.g. `0 6 * * *` for daily 6AM UTC)

---

## Data source

**[football-data.org](https://www.football-data.org/)** REST API (v4) — covers
EPL (PL), La Liga (PD), and Bundesliga (BL1) on the free tier (10 req/min).

The scraper is behind a provider interface (`apps/cron/src/scraper/`) so an
FBref HTML scraper or a paid live-data provider can be added without touching
the model or API.

### Live in-play data

The free football-data.org tier does not include live match scores. The
architecture (form adjustment, on-demand `POST /refresh` cache flush, short
cache TTL) is ready to plug in a live data source (e.g. football-data.org paid
tier, SportMonks, or API-Football) for real-time in-play predictions.

---

## Development

```bash
# Typecheck all packages
pnpm typecheck

# Build all packages
pnpm build

# Run the cron job once (fetch data + fit model + predict)
pnpm cron:run

# Run database migrations
pnpm db:migrate

# Migrate + verify schema
pnpm db:setup
```

---

## Roadmap

- [ ] Live in-play predictions (with paid data provider)
- [ ] More leagues (Serie A, Ligue 1, Champions League)
- [ ] FBref scraper as alternative data source
- [ ] Expected goals (xG) from shot data
- [ ] Head-to-head history in match details
- [ ] Value bets (compare model odds vs bookmaker odds)
- [ ] Model ensemble (Dixon-Coles + Poisson + Elo)
- [ ] Backtesting dashboard with historical accuracy

---

## Contributing

Contributions are welcome! Please:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

---

## Acknowledgements

- **Dixon & Coles** — for the original paper on the low-score correction model
- **[football-data.org](https://www.football-data.org/)** — for the free football data API
- **[Next.js](https://nextjs.org/)**, **[Fastify](https://fastify.dev/)**, **[shadcn/ui](https://ui.shadcn.com/)** — for the excellent tooling

---

<div align="center">

**[Report Bug](https://github.com/mintahandrews/football-predictor/issues)** ·
**[Request Feature](https://github.com/mintahandrews/football-predictor/issues)** ·
**[Star the repo](https://github.com/mintahandrews/football-predictor)**

</div>
