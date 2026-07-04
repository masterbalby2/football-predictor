# Soccer Match Predictor — Project Spec

Predicts EPL, La Liga, and Bundesliga match outcomes using a Dixon-Coles style
statistical model (Poisson with a low-score correction + time-decay weighting).

## Decisions made (clarifications)

- **Data source:** football-data.org API (primary). Provider-agnostic scraper
  layer so FBref can be added later. A seed dataset ships so the app runs
  end-to-end without an API token.
- **Railway:** config + Dockerfiles + `DEPLOY.md` provided; user runs `railway up`.
- **Telegram:** reads `TELEGRAM_BOT_TOKEN` from env; runs in dry-run mode
  (skips polling) when absent so dev works without it.
- **Model fit:** one Dixon-Coles model per league (teams never play cross-league),
  fit by gradient ascent on the time-decayed log-likelihood with ridge
  regularization. Half-life = 540 days (Dixon-Coles default).
- **No emojis** anywhere in UI or bot output — lucide-react icons only.

## Leagues

| Code | Name        | football-data.org code |
| ---- | ----------- | ---------------------- |
| EPL  | Premier League | PL                  |
| LAL  | La Liga     | PD                     |
| BUN  | Bundesliga  | BL1                    |

## Domain model

- `League` — id, code, name, country
- `Team` — id, league_id, name, short_name, fbref_id?
- `Match` — finished game: home/away team, goals, date, season
- `Fixture` — upcoming game: home/away team, kickoff, season
- `TeamStrength` — per-team attack/defense params per league per model run
- `Prediction` — per-fixture: W/D/L probs, top-3 scorelines, expected goals
- `ModelRun` / `ModelAccuracyLog` — tracks model runs + rolling accuracy

## Dixon-Coles model

For a match with home team `h` and away team `a`:

```
lambda_home = exp(intercept + attack[h] + defense[a] + home_advantage)
lambda_away = exp(intercept + attack[a] + defense[h])
```

Low-score correction (Dixon-Coles `tau`) — boosts low-score draws and
depresses the corresponding 0-1 / 1-0 results, correcting the independence
assumption (tunable via env `DC_DELTA`, default `0.011`):

```
tau(x, y) =
  1 + delta   if x==0, y==0
  1 - delta   if x==0, y==1
  1 - delta   if x==1, y==0
  1 + delta   if x==1, y==1
  1           otherwise
```

Time decay: weight for a match played `t` days ago is
`exp(-ln(2) * t / half_life)` with `half_life = 540` days.

Optimization: gradient ascent on weighted log-likelihood with L2 ridge
(`lambda_reg`, default `0.002`) and identifiability constraint
`sum(attack) = 0` per league.

## API surface (Fastify)

- `GET /health`
- `GET /leagues`
- `GET /leagues/:code/fixtures?status=scheduled|all`
- `GET /fixtures/:id` — fixture + prediction
- `GET /fixtures/:id/prediction`
- `GET /teams`
- `GET /teams/:id` — team + strengths + recent form
- `GET /accuracy` — rolling model accuracy per league

## Telegram bot commands

- `/start` — welcome message + point to /help
- `/today` — today's predictions across all 3 leagues (compact list)
- `/league epl|laliga|bundesliga` — filter predictions by league
- `/match <team>` — find upcoming fixture for a team, full breakdown
  (probabilities + top-3 scorelines + expected goals)
- `/team <name>` — team strengths + recent form
- `/accuracy` — recent model accuracy stats
- `/subscribe` — opt into the daily push digest
- `/unsubscribe` — opt out
- `/help` — list commands

Bot reads directly from Postgres (not via the Fastify API) for resilience.
Daily digest: internal scheduler pushes at `TELEGRAM_DIGEST_HOUR_UTC` to every
row in `telegram_subscribers`, batched with small delays to respect Telegram's
bulk-send rate limits. Messages use Telegram Markdown with bolded team names
and aligned percentages (no emojis).
