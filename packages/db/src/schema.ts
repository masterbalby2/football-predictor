/**
 * Migrations are embedded as an ordered array of SQL strings so the compiled
 * package is self-contained (no SQL files to copy into dist). Each entry is
 * applied inside its own transaction by the runner.
 */
export interface Migration {
  id: string;
  description: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    id: "0001_init",
    description: "Initial schema: leagues, teams, matches, fixtures",
    sql: `
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS leagues (
        code        TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        country     TEXT NOT NULL,
        fd_code     TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS teams (
        id          TEXT PRIMARY KEY,
        league_code TEXT NOT NULL REFERENCES leagues(code) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        short_name  TEXT,
        fd_id       INTEGER,
        UNIQUE (league_code, name)
      );
      CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_code);

      CREATE TABLE IF NOT EXISTS matches (
        id            TEXT PRIMARY KEY,
        league_code   TEXT NOT NULL REFERENCES leagues(code) ON DELETE CASCADE,
        season        TEXT NOT NULL,
        date          TIMESTAMPTZ NOT NULL,
        home_team_id  TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        away_team_id  TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        home_goals    INTEGER,
        away_goals    INTEGER,
        status        TEXT NOT NULL DEFAULT 'FINISHED',
        source        TEXT NOT NULL DEFAULT 'seed'
      );
      CREATE INDEX IF NOT EXISTS idx_matches_league_date
        ON matches(league_code, date DESC);
      CREATE INDEX IF NOT EXISTS idx_matches_home ON matches(home_team_id);
      CREATE INDEX IF NOT EXISTS idx_matches_away ON matches(away_team_id);
    `,
  },
  {
    id: "0002_fixtures",
    description: "Fixtures (upcoming matches) table",
    sql: `
      CREATE TABLE IF NOT EXISTS fixtures (
        id            TEXT PRIMARY KEY,
        league_code   TEXT NOT NULL REFERENCES leagues(code) ON DELETE CASCADE,
        season        TEXT NOT NULL,
        date          TIMESTAMPTZ NOT NULL,
        home_team_id  TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        away_team_id  TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        status        TEXT NOT NULL DEFAULT 'SCHEDULED',
        source        TEXT NOT NULL DEFAULT 'seed',
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_fixtures_date ON fixtures(date);
      CREATE INDEX IF NOT EXISTS idx_fixtures_league ON fixtures(league_code);
    `,
  },
  {
    id: "0003_model",
    description: "Model runs, team strengths, predictions",
    sql: `
      CREATE TABLE IF NOT EXISTS model_runs (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        leagues     TEXT[] NOT NULL,
        match_count INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS team_strengths (
        model_run_id UUID NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
        team_id      TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        league_code  TEXT NOT NULL REFERENCES leagues(code) ON DELETE CASCADE,
        attack       DOUBLE PRECISION NOT NULL,
        defense      DOUBLE PRECISION NOT NULL,
        PRIMARY KEY (model_run_id, team_id)
      );
      CREATE INDEX IF NOT EXISTS idx_strengths_run
        ON team_strengths(model_run_id);

      CREATE TABLE IF NOT EXISTS predictions (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fixture_id          TEXT NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
        model_run_id        UUID NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
        home_win_prob       DOUBLE PRECISION NOT NULL,
        draw_prob           DOUBLE PRECISION NOT NULL,
        away_win_prob       DOUBLE PRECISION NOT NULL,
        expected_home_goals DOUBLE PRECISION NOT NULL,
        expected_away_goals DOUBLE PRECISION NOT NULL,
        top_scorelines      JSONB NOT NULL,
        pick                TEXT NOT NULL,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (fixture_id, model_run_id)
      );
      CREATE INDEX IF NOT EXISTS idx_predictions_fixture
        ON predictions(fixture_id);
    `,
  },
  {
    id: "0004_accuracy_subs",
    description: "Accuracy log + telegram subscribers",
    sql: `
      CREATE TABLE IF NOT EXISTS model_accuracy_log (
        date        DATE NOT NULL,
        league_code TEXT NOT NULL REFERENCES leagues(code) ON DELETE CASCADE,
        total       INTEGER NOT NULL,
        correct     INTEGER NOT NULL,
        accuracy    DOUBLE PRECISION NOT NULL,
        PRIMARY KEY (date, league_code)
      );

      CREATE TABLE IF NOT EXISTS telegram_subscribers (
        chat_id    BIGINT PRIMARY KEY,
        username   TEXT,
        joined_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `,
  },
  {
    id: "0005_accuracy_metrics",
    description: "Add Brier score and log-loss columns to accuracy log",
    sql: `
      ALTER TABLE model_accuracy_log
        ADD COLUMN IF NOT EXISTS brier_score DOUBLE PRECISION DEFAULT 0,
        ADD COLUMN IF NOT EXISTS log_loss   DOUBLE PRECISION DEFAULT 0;
    `,
  },
  {
    id: "0006_prediction_confidence_tip",
    description: "Add confidence and tip columns to predictions",
    sql: `
      ALTER TABLE predictions
        ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tip        TEXT NOT NULL DEFAULT '';
    `,
  },
];
