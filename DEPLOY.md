# Deploy to Railway

This guide deploys the four services (`api`, `web`, `bot`, `cron`) to Railway,
backed by the Railway PostgreSQL and Redis plugins. All four read from the
same database; only `cron` writes the model output.

## 1. Create the project + plugins

1. Create a new Railway project.
2. Add the **PostgreSQL** plugin — note the public `DATABASE_URL`.
3. Add the **Redis** plugin — note the public `REDIS_URL`.

## 2. Create the four services

For each of `api`, `web`, `bot`, `cron`:

1. **New Service → GitHub Repo** (or "Empty service" + `railway up`).
2. Set **Root Directory** to the corresponding app folder
   (`apps/api`, `apps/web`, `apps/bot`, `apps/cron`).
3. Set **Dockerfile path** to `Dockerfile` (relative to the service root).
   - The Dockerfiles copy the whole monorepo and build inside the image, so
     the build context is the repo root even though the service root is the
     app folder. If Railway complains about the context, set the service's
     **Root Directory** to the repo root and the **Dockerfile path** to
     `apps/<app>/Dockerfile`.

> Tip: the simplest setup is to set each service's **Root Directory** to the
> repo root and **Dockerfile path** to `apps/<app>/Dockerfile`.

## 3. Environment variables

Set these on each service (reference `.env.example`):

| Variable                     | api | web | bot | cron | Notes                                              |
| ---------------------------- | :-: | :-: | :-: | :--: | -------------------------------------------------- |
| `DATABASE_URL`               |  x | (x)|  x  |  x   | From the Postgres plugin (reference variable).    |
| `REDIS_URL`                  |  x |    |     |      | From the Redis plugin (reference variable).       |
| `DB_RUN_MIGRATIONS`          |  x |    |     |  x   | `true` — api/cron run migrations on boot.         |
| `NEXT_PUBLIC_API_URL`        |    |  x |     |      | Public URL of the deployed `api` service.         |
| `API_CORS_ORIGIN`            |  x |    |     |      | Public URL of the deployed `web` service.         |
| `API_HOST` / `API_PORT`      |  x |    |     |      | `0.0.0.0` / `4000`.                                |
| `FOOTBALL_DATA_API_KEY`      |    |    |     |  x   | Required. Free at football-data.org.               |
| `TELEGRAM_BOT_TOKEN`         |    |    |  x  |      | Optional. Bot runs in dry-run mode without it.     |
| `TELEGRAM_DIGEST_HOUR_UTC`   |    |    |  x  |      | Default `7`.                                       |
| `CRON_ONE_SHOT`              |    |    |     |  x   | `true` — cron exits after one refresh (Railway Cron). |
| `DC_*` (model params)        |    |    |     |  x   | Optional; defaults are sensible.                   |

Reference plugin variables in Railway with `${{ Postgres.DATABASE_URL }}`
and `${{ Redis.REDIS_URL }}` rather than hardcoding.

## 4. Networking

- **api**: add a public domain (e.g. `api.yourapp.up.railway.app`).
  Set `web`'s `NEXT_PUBLIC_API_URL` and `api`'s `API_CORS_ORIGIN` to it.
- **web**: add a public domain (e.g. `yourapp.up.railway.app`).
- **bot**: no public port needed (long polling).
- **cron**: no public port needed.

## 5. Schedule the cron job

On the `cron` service:

1. **Settings → Cron Schedule** → set to e.g. `0 6 * * *` (06:00 UTC daily).
2. The container runs `node dist/index.js`, refreshes data + model, then
   exits (`CRON_ONE_SHOT=true`). Railway re-runs it on the schedule.

## 6. First deploy

1. Deploy `api` first (it runs migrations).
2. Deploy `cron` and trigger a run (Railway → Deploy → Redeploy) to fetch
   data from football-data.org, fit the model, and populate predictions.
   Requires `FOOTBALL_DATA_API_KEY` to be set.
3. Deploy `web` and `bot`.

## 7. Verify

- `GET https://<api-domain>/health` → `{ "status": "ok" }`
- `GET https://<api-domain>/fixtures` → list with predictions
- Open the web domain → dashboard with fixture cards
- Telegram: message your bot `/today` (after setting `TELEGRAM_BOT_TOKEN`)

## Local pre-flight

```bash
docker compose up -d
cp .env.example .env
pnpm install
pnpm db:migrate      # run migrations
pnpm cron:run        # fetch data + fit model + generate predictions
pnpm dev:api         # http://localhost:4000
pnpm dev:web         # http://localhost:3000
```
