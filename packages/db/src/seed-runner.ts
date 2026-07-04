import type { Sql } from "./client.js";
import { upsertLeagues, upsertTeam, upsertMatch, upsertFixture, clearFixturesFromSource } from "./repo.js";
import { generateSeedData } from "./seed.js";

/**
 * Insert deterministic seed data (leagues, teams, ~1.5 seasons of results,
 * and upcoming fixtures). Safe to run multiple times (upserts).
 * Replaces any prior 'seed' fixtures so the upcoming list stays fresh
 * relative to "now".
 */
export async function seedDatabase(sql: Sql): Promise<{
  teams: number;
  matches: number;
  fixtures: number;
}> {
  await upsertLeagues(sql);
  const data = generateSeedData();

  for (const t of data.teams) {
    await upsertTeam(sql, {
      id: t.id,
      leagueCode: t.leagueCode,
      name: t.name,
      shortName: t.shortName,
    });
  }

  for (const m of data.matches) {
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
      source: "seed",
    });
  }

  // Replace seed-sourced upcoming fixtures so dates stay in the future.
  await clearFixturesFromSource(sql, "seed");
  for (const f of data.fixtures) {
    await upsertFixture(sql, {
      id: f.id,
      leagueCode: f.leagueCode,
      season: f.season,
      date: f.date,
      homeTeamId: f.homeTeamId,
      awayTeamId: f.awayTeamId,
      status: "SCHEDULED",
      source: "seed",
    });
  }

  return {
    teams: data.teams.length,
    matches: data.matches.length,
    fixtures: data.fixtures.length,
  };
}
