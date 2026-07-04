import type { Sql } from "./client.js";
import { LEAGUES } from "@soccer/config";
import type {
  League,
  Team,
  Match,
  Fixture,
  Prediction,
  TeamStrength,
  ModelRun,
  AccuracyPoint,
  Scoreline,
  LeagueCode,
} from "@soccer/shared-types";

/* ------------------------------------------------------------------ */
/* Leagues + teams                                                     */
/* ------------------------------------------------------------------ */

export async function upsertLeagues(sql: Sql): Promise<void> {
  await sql`INSERT INTO leagues (code, name, country, fd_code)
            VALUES ${sql(
              LEAGUES.map((l) => [l.code, l.name, l.country, l.fdCode]),
            )}
            ON CONFLICT (code) DO UPDATE SET
              name = EXCLUDED.name,
              country = EXCLUDED.country,
              fd_code = EXCLUDED.fd_code`;
}

export async function getLeagues(sql: Sql): Promise<League[]> {
  const rows = await sql`SELECT code, name, country FROM leagues ORDER BY code`;
  return rows.map((r) => ({ id: r.code, code: r.code, name: r.name, country: r.country })) as League[];
}

export async function upsertTeam(
  sql: Sql,
  team: { id: string; leagueCode: LeagueCode; name: string; shortName?: string | null; fdId?: number | null },
): Promise<void> {
  await sql`
    INSERT INTO teams (id, league_code, name, short_name, fd_id)
    VALUES (${team.id}, ${team.leagueCode}, ${team.name}, ${team.shortName ?? null}, ${team.fdId ?? null})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      short_name = EXCLUDED.short_name,
      fd_id = COALESCE(EXCLUDED.fd_id, teams.fd_id)
  `;
}

export async function getTeams(sql: Sql, leagueCode?: LeagueCode): Promise<Team[]> {
  const rows =
    leagueCode
      ? await sql`SELECT id, league_code AS "leagueId", league_code AS "leagueCode", name, short_name AS "shortName" FROM teams WHERE league_code = ${leagueCode} ORDER BY name`
      : await sql`SELECT id, league_code AS "leagueId", league_code AS "leagueCode", name, short_name AS "shortName" FROM teams ORDER BY league_code, name`;
  return rows as unknown as Team[];
}

export async function getTeamById(sql: Sql, id: string): Promise<Team | null> {
  const rows = await sql`SELECT id, league_code AS "leagueId", league_code AS "leagueCode", name, short_name AS "shortName" FROM teams WHERE id = ${id}`;
  return (rows[0] as Team | undefined) ?? null;
}

export async function findTeamByName(
  sql: Sql,
  name: string,
): Promise<Team | null> {
  const rows = await sql`
    SELECT id, league_code AS "leagueId", league_code AS "leagueCode", name, short_name AS "shortName" FROM teams
    WHERE name ILIKE ${"%" + name + "%"} OR short_name ILIKE ${"%" + name + "%"}
    ORDER BY length(name) ASC LIMIT 1`;
  return (rows[0] as Team | undefined) ?? null;
}

/* ------------------------------------------------------------------ */
/* Matches + fixtures                                                  */
/* ------------------------------------------------------------------ */

export async function upsertMatch(
  sql: Sql,
  m: {
    id: string;
    leagueCode: LeagueCode;
    season: string;
    date: Date;
    homeTeamId: string;
    awayTeamId: string;
    homeGoals: number | null;
    awayGoals: number | null;
    status?: string;
    source?: string;
  },
): Promise<void> {
  await sql`
    INSERT INTO matches (id, league_code, season, date, home_team_id, away_team_id, home_goals, away_goals, status, source)
    VALUES (${m.id}, ${m.leagueCode}, ${m.season}, ${m.date}, ${m.homeTeamId}, ${m.awayTeamId}, ${m.homeGoals}, ${m.awayGoals}, ${m.status ?? "FINISHED"}, ${m.source ?? "seed"})
    ON CONFLICT (id) DO UPDATE SET
      date = EXCLUDED.date,
      home_goals = EXCLUDED.home_goals,
      away_goals = EXCLUDED.away_goals,
      status = EXCLUDED.status
  `;
}

export async function getFinishedMatches(
  sql: Sql,
  leagueCode: LeagueCode,
  sinceDays = 730,
): Promise<Match[]> {
  const rows = await sql`
    SELECT id, league_code AS "leagueCode", season, date::text AS date,
           home_team_id AS "homeTeamId", away_team_id AS "awayTeamId",
           home_goals AS "homeGoals", away_goals AS "awayGoals", status
    FROM matches
    WHERE league_code = ${leagueCode}
      AND status = 'FINISHED'
      AND home_goals IS NOT NULL AND away_goals IS NOT NULL
      AND date >= now() - ${sinceDays} * interval '1 day'
    ORDER BY date ASC`;
  return rows as unknown as Match[];
}

export async function getRecentMatchesForTeam(
  sql: Sql,
  teamId: string,
  limit = 6,
): Promise<Match[]> {
  const rows = await sql`
    SELECT id, league_code AS "leagueCode", season, date::text AS date,
           home_team_id AS "homeTeamId", away_team_id AS "awayTeamId",
           home_goals AS "homeGoals", away_goals AS "awayGoals", status
    FROM matches
    WHERE (home_team_id = ${teamId} OR away_team_id = ${teamId})
      AND status = 'FINISHED' AND home_goals IS NOT NULL
    ORDER BY date DESC LIMIT ${limit}`;
  return rows as unknown as Match[];
}

export async function upsertFixture(
  sql: Sql,
  f: {
    id: string;
    leagueCode: LeagueCode;
    season: string;
    date: Date;
    homeTeamId: string;
    awayTeamId: string;
    status?: string;
    source?: string;
  },
): Promise<void> {
  await sql`
    INSERT INTO fixtures (id, league_code, season, date, home_team_id, away_team_id, status, source, updated_at)
    VALUES (${f.id}, ${f.leagueCode}, ${f.season}, ${f.date}, ${f.homeTeamId}, ${f.awayTeamId}, ${f.status ?? "SCHEDULED"}, ${f.source ?? "seed"}, now())
    ON CONFLICT (id) DO UPDATE SET
      date = EXCLUDED.date,
      status = EXCLUDED.status,
      updated_at = now()
  `;
}

export async function clearFixturesFromSource(
  sql: Sql,
  source: string,
): Promise<void> {
  await sql`DELETE FROM fixtures WHERE source = ${source}`;
}

export async function getFixtures(
  sql: Sql,
  opts: { leagueCode?: LeagueCode; from?: Date; limit?: number } = {},
): Promise<Fixture[]> {
  const limit = opts.limit ?? 100;
  const rows = opts.leagueCode
    ? await sql`
        SELECT f.id, f.league_code, f.season, f.date::text AS date,
               f.home_team_id, f.away_team_id, f.status,
               ht.id AS h_id, ht.league_code AS h_league_code, ht.name AS h_name, ht.short_name AS h_short,
               at.id AS a_id, at.league_code AS a_league_code, at.name AS a_name, at.short_name AS a_short
        FROM fixtures f
        JOIN teams ht ON ht.id = f.home_team_id
        JOIN teams at ON at.id = f.away_team_id
        WHERE f.league_code = ${opts.leagueCode}
          ${opts.from ? sql`AND f.date >= ${opts.from}` : sql``}
        ORDER BY f.date ASC LIMIT ${limit}`
    : await sql`
        SELECT f.id, f.league_code, f.season, f.date::text AS date,
               f.home_team_id, f.away_team_id, f.status,
               ht.id AS h_id, ht.league_code AS h_league_code, ht.name AS h_name, ht.short_name AS h_short,
               at.id AS a_id, at.league_code AS a_league_code, at.name AS a_name, at.short_name AS a_short
        FROM fixtures f
        JOIN teams ht ON ht.id = f.home_team_id
        JOIN teams at ON at.id = f.away_team_id
        ${opts.from ? sql`WHERE f.date >= ${opts.from}` : sql``}
        ORDER BY f.date ASC LIMIT ${limit}`;
  return rows.map((r) => ({
    id: r.id,
    leagueCode: r.league_code,
    season: r.season,
    date: r.date,
    homeTeamId: r.home_team_id,
    awayTeamId: r.away_team_id,
    status: r.status,
    homeTeam: {
      id: r.h_id,
      leagueId: r.h_league_code,
      leagueCode: r.h_league_code,
      name: r.h_name,
      shortName: r.h_short,
    },
    awayTeam: {
      id: r.a_id,
      leagueId: r.a_league_code,
      leagueCode: r.a_league_code,
      name: r.a_name,
      shortName: r.a_short,
    },
  })) as Fixture[];
}

export async function getFixtureById(
  sql: Sql,
  id: string,
): Promise<Fixture | null> {
  const rows = await sql`
    SELECT f.id, f.league_code, f.season, f.date::text AS date,
           f.home_team_id, f.away_team_id, f.status,
           ht.id AS h_id, ht.league_code AS h_league_code, ht.name AS h_name, ht.short_name AS h_short,
           at.id AS a_id, at.league_code AS a_league_code, at.name AS a_name, at.short_name AS a_short
    FROM fixtures f
    JOIN teams ht ON ht.id = f.home_team_id
    JOIN teams at ON at.id = f.away_team_id
    WHERE f.id = ${id}`;
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    leagueCode: r.league_code,
    season: r.season,
    date: r.date,
    homeTeamId: r.home_team_id,
    awayTeamId: r.away_team_id,
    status: r.status,
    homeTeam: {
      id: r.h_id,
      leagueId: r.h_league_code,
      leagueCode: r.h_league_code,
      name: r.h_name,
      shortName: r.h_short,
    },
    awayTeam: {
      id: r.a_id,
      leagueId: r.a_league_code,
      leagueCode: r.a_league_code,
      name: r.a_name,
      shortName: r.a_short,
    },
  } as Fixture;
}

/* ------------------------------------------------------------------ */
/* Model run + strengths + predictions                                 */
/* ------------------------------------------------------------------ */

export async function createModelRun(
  sql: Sql,
  leagues: LeagueCode[],
  matchCount: number,
): Promise<string> {
  const rows = await sql`
    INSERT INTO model_runs (leagues, match_count) VALUES (${leagues}::text[], ${matchCount})
    RETURNING id::text`;
  return rows[0].id as string;
}

export async function getLatestModelRun(sql: Sql): Promise<ModelRun | null> {
  const rows = await sql`
    SELECT id::text AS id, created_at::text AS created_at, leagues, match_count
    FROM model_runs ORDER BY created_at DESC LIMIT 1`;
  const r = rows[0];
  return r
    ? {
        id: r.id,
        createdAt: r.created_at,
        leagues: r.leagues as LeagueCode[],
        matchCount: r.match_count,
      }
    : null;
}

export async function saveStrengths(
  sql: Sql,
  modelRunId: string,
  strengths: TeamStrength[],
): Promise<void> {
  if (strengths.length === 0) return;
  for (const s of strengths) {
    await sql`
      INSERT INTO team_strengths (model_run_id, team_id, league_code, attack, defense)
      VALUES (${modelRunId}::uuid, ${s.teamId}, ${s.leagueCode}, ${s.attack}, ${s.defense})
      ON CONFLICT (model_run_id, team_id) DO UPDATE SET
        attack = EXCLUDED.attack, defense = EXCLUDED.defense`;
  }
}

export async function getStrengthsForRun(
  sql: Sql,
  modelRunId: string,
): Promise<TeamStrength[]> {
  const rows = await sql`
    SELECT team_id, league_code, attack, defense, model_run_id::text AS model_run_id
    FROM team_strengths WHERE model_run_id = ${modelRunId}`;
  return rows.map((r) => ({
    teamId: r.team_id,
    leagueCode: r.league_code,
    attack: r.attack,
    defense: r.defense,
    modelRunId: r.model_run_id,
  })) as TeamStrength[];
}

export async function getStrengthForTeam(
  sql: Sql,
  teamId: string,
): Promise<TeamStrength | null> {
  const rows = await sql`
    SELECT ts.team_id, ts.league_code, ts.attack, ts.defense, ts.model_run_id::text AS model_run_id
    FROM team_strengths ts
    JOIN model_runs mr ON mr.id = ts.model_run_id
    WHERE ts.team_id = ${teamId}
    ORDER BY mr.created_at DESC LIMIT 1`;
  const r = rows[0];
  return r
    ? {
        teamId: r.team_id,
        leagueCode: r.league_code,
        attack: r.attack,
        defense: r.defense,
        modelRunId: r.model_run_id,
      }
    : null;
}

export async function savePrediction(
  sql: Sql,
  p: Omit<Prediction, "id" | "createdAt"> & { id?: string },
): Promise<void> {
  await sql`
    INSERT INTO predictions
      (fixture_id, model_run_id, home_win_prob, draw_prob, away_win_prob,
       expected_home_goals, expected_away_goals, top_scorelines, pick)
    VALUES
      (${p.fixtureId}, ${p.modelRunId}, ${p.homeWinProb}, ${p.drawProb}, ${p.awayWinProb},
       ${p.expectedHomeGoals}, ${p.expectedAwayGoals}, ${JSON.stringify(
         p.topScorelines,
       )}::jsonb, ${p.pick})
    ON CONFLICT (fixture_id, model_run_id) DO UPDATE SET
      home_win_prob = EXCLUDED.home_win_prob,
      draw_prob = EXCLUDED.draw_prob,
      away_win_prob = EXCLUDED.away_win_prob,
      expected_home_goals = EXCLUDED.expected_home_goals,
      expected_away_goals = EXCLUDED.expected_away_goals,
      top_scorelines = EXCLUDED.top_scorelines,
      pick = EXCLUDED.pick`;
}

export async function getPredictionForFixture(
  sql: Sql,
  fixtureId: string,
): Promise<Prediction | null> {
  const rows = await sql`
    SELECT id::text AS id, fixture_id, model_run_id::text AS model_run_id,
           home_win_prob, draw_prob, away_win_prob,
           expected_home_goals, expected_away_goals,
           top_scorelines, pick, created_at::text AS created_at
    FROM predictions
    WHERE fixture_id = ${fixtureId}
    ORDER BY created_at DESC LIMIT 1`;
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    fixtureId: r.fixture_id,
    modelRunId: r.model_run_id,
    homeWinProb: r.home_win_prob,
    drawProb: r.draw_prob,
    awayWinProb: r.away_win_prob,
    expectedHomeGoals: r.expected_home_goals,
    expectedAwayGoals: r.expected_away_goals,
    topScorelines: typeof r.top_scorelines === "string" ? JSON.parse(r.top_scorelines) : r.top_scorelines,
    pick: r.pick,
    createdAt: r.created_at,
  } as Prediction;
}

export async function getPredictionsForFixtures(
  sql: Sql,
  fixtureIds: string[],
): Promise<Map<string, Prediction>> {
  if (fixtureIds.length === 0) return new Map();
  const rows = await sql`
    SELECT DISTINCT ON (fixture_id)
           fixture_id, id::text AS id, model_run_id::text AS model_run_id,
           home_win_prob, draw_prob, away_win_prob,
           expected_home_goals, expected_away_goals,
           top_scorelines, pick, created_at::text AS created_at
    FROM predictions
    WHERE fixture_id IN ${sql(fixtureIds)}
    ORDER BY fixture_id, created_at DESC`;
  const map = new Map<string, Prediction>();
  for (const r of rows) {
    map.set(r.fixture_id, {
      id: r.id,
      fixtureId: r.fixture_id,
      modelRunId: r.model_run_id,
      homeWinProb: r.home_win_prob,
      drawProb: r.draw_prob,
      awayWinProb: r.away_win_prob,
      expectedHomeGoals: r.expected_home_goals,
      expectedAwayGoals: r.expected_away_goals,
      topScorelines: typeof r.top_scorelines === "string" ? JSON.parse(r.top_scorelines) : r.top_scorelines,
      pick: r.pick,
      createdAt: r.created_at,
    } as Prediction);
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* Accuracy                                                            */
/* ------------------------------------------------------------------ */

export async function upsertAccuracy(
  sql: Sql,
  point: AccuracyPoint,
): Promise<void> {
  await sql`
    INSERT INTO model_accuracy_log (date, league_code, total, correct, accuracy, brier_score, log_loss)
    VALUES (${point.date}, ${point.leagueCode}, ${point.total}, ${point.correct}, ${point.accuracy}, ${point.brierScore}, ${point.logLoss})
    ON CONFLICT (date, league_code) DO UPDATE SET
      total = EXCLUDED.total, correct = EXCLUDED.correct, accuracy = EXCLUDED.accuracy,
      brier_score = EXCLUDED.brier_score, log_loss = EXCLUDED.log_loss`;
}

export async function getAccuracyHistory(
  sql: Sql,
  limit = 30,
): Promise<AccuracyPoint[]> {
  const rows = await sql`
    SELECT date::text AS date, league_code, total, correct, accuracy, brier_score, log_loss
    FROM model_accuracy_log
    ORDER BY date DESC, league_code ASC LIMIT ${limit}`;
  return rows.map((r) => ({
    date: r.date,
    leagueCode: r.league_code,
    total: r.total,
    correct: r.correct,
    accuracy: r.accuracy,
    brierScore: r.brier_score ?? 0,
    logLoss: r.log_loss ?? 0,
  })) as AccuracyPoint[];
}

/* ------------------------------------------------------------------ */
/* Telegram subscribers                                                */
/* ------------------------------------------------------------------ */

export async function addSubscriber(
  sql: Sql,
  chatId: number,
  username?: string,
): Promise<void> {
  await sql`
    INSERT INTO telegram_subscribers (chat_id, username) VALUES (${chatId}, ${username ?? null})
    ON CONFLICT (chat_id) DO NOTHING`;
}

export async function removeSubscriber(
  sql: Sql,
  chatId: number,
): Promise<void> {
  await sql`DELETE FROM telegram_subscribers WHERE chat_id = ${chatId}`;
}

export async function getSubscribers(
  sql: Sql,
): Promise<{ chatId: number; username: string | null }[]> {
  const rows = await sql`SELECT chat_id, username FROM telegram_subscribers`;
  return rows.map((r) => ({ chatId: r.chat_id, username: r.username }));
}
