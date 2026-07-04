import { LEAGUES, type Env } from "@soccer/config";
import {
  getDb,
  upsertLeagues,
  upsertTeam,
  upsertMatch,
  upsertFixture,
  clearFixturesFromSource,
  getFinishedMatches,
  getFixtures,
  createModelRun,
  saveStrengths,
  savePrediction,
  upsertAccuracy,
  type Sql,
} from "@soccer/db";
import {
  fitModel,
  predict,
  walkForwardEval,
  DEFAULT_FIT_OPTIONS,
  type MatchInput,
} from "@soccer/model";
import type { LeagueCode, TeamStrength } from "@soccer/shared-types";
import { FootballDataScraper } from "./scraper/fd.js";

const LEAGUE_CODES = LEAGUES.map((l) => l.code) as LeagueCode[];

export interface RefreshResult {
  modelRunId: string;
  leagues: LeagueCode[];
  totalMatches: number;
  totalFixtures: number;
  predictions: number;
  accuracy: { leagueCode: LeagueCode; total: number; correct: number; accuracy: number }[];
  source: "football-data.org";
}

/**
 * Pull data from football-data.org, fit a Dixon-Coles model per league,
 * predict upcoming fixtures, and log out-of-sample accuracy.
 * Requires FOOTBALL_DATA_API_KEY to be set.
 */
export async function runRefresh(env: Env): Promise<RefreshResult> {
  const sql = getDb(env);
  const scraper = new FootballDataScraper(env);

  if (!scraper.available()) {
    throw new Error(
      "FOOTBALL_DATA_API_KEY is not set. Register at https://www.football-data.org/client/register to get a free token.",
    );
  }

  await upsertLeagues(sql);
  await ingestFromProvider(sql, scraper);

  const fitOpts = {
    ...DEFAULT_FIT_OPTIONS,
    delta: env.DC_DELTA,
    halfLifeDays: env.DC_HALF_LIFE_DAYS,
    ridgeLambda: env.DC_RIDGE_LAMBDA,
    maxGoals: env.DC_MAX_GOALS,
    minMatches: env.DC_MIN_MATCHES,
  };

  let totalMatches = 0;
  const strengths: TeamStrength[] = [];
  const accuracyRows: RefreshResult["accuracy"] = [];
  const leagueCodesUsed: LeagueCode[] = [];
  const fitsByLeague = new Map<LeagueCode, ReturnType<typeof fitModel>>();

  // Single model run covering all leagues.
  const modelRunId = await createModelRun(sql, LEAGUE_CODES, 0);

  for (const leagueCode of LEAGUE_CODES) {
    const matches = await getFinishedMatches(sql, leagueCode, 730);
    if (matches.length < fitOpts.minMatches) {
      console.warn(
        `[${leagueCode}] only ${matches.length} finished matches — skipping model fit.`,
      );
      continue;
    }
    leagueCodesUsed.push(leagueCode);
    totalMatches += matches.length;

    const matchInputs: MatchInput[] = matches.map((m) => ({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeGoals: m.homeGoals!,
      awayGoals: m.awayGoals!,
      date: m.date,
    }));

    // Fit on all matches for predictions + stored strengths.
    const fit = fitModel(leagueCode, matchInputs, fitOpts);
    if (!fit) {
      console.warn(`[${leagueCode}] fit returned null — skipping.`);
      continue;
    }
    fitsByLeague.set(leagueCode, fit);
    for (const t of fit.teams) {
      strengths.push({
        teamId: t.teamId,
        leagueCode,
        attack: t.attack,
        defense: t.defense,
        modelRunId,
      });
    }

    // Out-of-sample accuracy via walk-forward (rolling-origin) validation:
    // repeatedly fit on the first k matches, evaluate on the next batch.
    // This is more robust than a single train/test split.
    if (matchInputs.length >= fitOpts.minMatches + 20) {
      const acc = walkForwardEval(leagueCode, matchInputs, fitOpts, {
        testSize: 20,
        minTrain: Math.max(fitOpts.minMatches, 40),
        step: 20,
      });
      if (acc.total > 0) {
        accuracyRows.push({
          leagueCode,
          total: acc.total,
          correct: acc.correct,
          accuracy: acc.accuracy,
        });
        await upsertAccuracy(sql, {
          date: new Date().toISOString().slice(0, 10),
          leagueCode,
          total: acc.total,
          correct: acc.correct,
          accuracy: acc.accuracy,
          brierScore: acc.brierScore,
          logLoss: acc.logLoss,
        });
      }
    }
  }

  await saveStrengths(sql, modelRunId, strengths);

  // Predict upcoming fixtures (reuse the per-league fits already computed).
  const from = new Date();
  const fixtures = await getFixtures(sql, { from, limit: 300 });
  let predictions = 0;
  for (const f of fixtures) {
    const fit = fitsByLeague.get(f.leagueCode);
    if (!fit) continue;
    const p = predict(fit, f.homeTeamId, f.awayTeamId, {
      delta: fitOpts.delta,
      maxGoals: fitOpts.maxGoals,
    });
    if (!p) continue;
    await savePrediction(sql, {
      fixtureId: f.id,
      modelRunId,
      homeWinProb: p.homeWinProb,
      drawProb: p.drawProb,
      awayWinProb: p.awayWinProb,
      expectedHomeGoals: p.expectedHomeGoals,
      expectedAwayGoals: p.expectedAwayGoals,
      topScorelines: p.topScorelines,
      pick: p.pick,
    });
    predictions++;
  }

  // Update model_run match count.
  await sql`UPDATE model_runs SET match_count = ${totalMatches} WHERE id = ${modelRunId}::uuid`;

  return {
    modelRunId,
    leagues: leagueCodesUsed,
    totalMatches,
    totalFixtures: fixtures.length,
    predictions,
    accuracy: accuracyRows,
    source: "football-data.org",
  };
}

async function ingestFromProvider(
  sql: Sql,
  scraper: FootballDataScraper,
): Promise<void> {
  for (const leagueCode of LEAGUE_CODES) {
    console.log(`[${leagueCode}] fetching from football-data.org...`);
    // Fetch teams from the data season (for historical matches).
    const teams = await scraper.fetchTeams(leagueCode);
    for (const t of teams) {
      await upsertTeam(sql, {
        id: t.id,
        leagueCode: t.leagueCode,
        name: t.name,
        shortName: t.shortName,
        fdId: t.externalId,
      });
    }
    // Also fetch teams from the current (upcoming) season — promoted/relegated
    // teams may appear in scheduled fixtures but not in the data season.
    try {
      const currentTeams = await scraper.fetchTeams(leagueCode, "2026");
      for (const t of currentTeams) {
        await upsertTeam(sql, {
          id: t.id,
          leagueCode: t.leagueCode,
          name: t.name,
          shortName: t.shortName,
          fdId: t.externalId,
        });
      }
    } catch {
      // Current season teams may not be available yet — that's OK.
    }

    const finished = await scraper.fetchFinishedMatches(leagueCode);
    for (const m of finished) {
      if (m.homeGoals == null || m.awayGoals == null) continue;
      await upsertMatch(sql, {
        id: m.id,
        leagueCode: m.leagueCode,
        season: m.season,
        date: m.date,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeGoals: m.homeGoals,
        awayGoals: m.awayGoals,
        status: "FINISHED",
        source: "football-data.org",
      });
    }
    // Replace FD-sourced fixtures for this league.
    await sql`DELETE FROM fixtures WHERE league_code = ${leagueCode} AND source = 'football-data.org'`;
    const fixtures = await scraper.fetchScheduledFixtures(leagueCode);
    for (const f of fixtures) {
      await upsertFixture(sql, {
        id: f.id,
        leagueCode: f.leagueCode,
        season: f.season,
        date: f.date,
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        status: "SCHEDULED",
        source: "football-data.org",
      });
    }
    console.log(
      `[${leagueCode}] ingested ${teams.length} teams, ${finished.length} matches, ${fixtures.length} fixtures.`,
    );
  }
}
