import type { Env } from "@soccer/config";
import {
  getDb,
  getFixtures,
  getFixtureById,
  getPredictionsForFixtures,
  findTeamByName,
  getTeamById,
  getStrengthForTeam,
  getRecentMatchesForTeam,
  getAccuracyHistory,
  getLatestModelRun,
  addSubscriber,
  removeSubscriber,
} from "@soccer/db";
import type { LeagueCode } from "@soccer/shared-types";
import {
  formatHelp,
  formatFixtureList,
  formatFixtureDetail,
  formatTeam,
  formatAccuracy,
} from "./format.js";

async function loadFixturesWithPredictions(
  env: Env,
  leagueCode?: LeagueCode,
  limit = 30,
) {
  const sql = getDb(env);
  const fixtures = await getFixtures(sql, { leagueCode, from: new Date(), limit });
  const predMap = await getPredictionsForFixtures(
    sql,
    fixtures.map((f) => f.id),
  );
  return fixtures.map((f) => ({ fixture: f, prediction: predMap.get(f.id) ?? null }));
}

export async function cmdHelp(): Promise<string> {
  return formatHelp();
}

export async function cmdToday(env: Env): Promise<string> {
  const items = await loadFixturesWithPredictions(env, undefined, 30);
  // filter to today
  const todayStr = new Date().toDateString();
  const todays = items.filter((i) => new Date(i.fixture.date).toDateString() === todayStr);
  const list = todays.length > 0 ? todays : items.slice(0, 10);
  return formatFixtureList(list);
}

export async function cmdLeague(env: Env, code: string): Promise<string> {
  const upper = code.toUpperCase();
  if (!["EPL", "LAL", "BUN"].includes(upper)) {
    return "Unknown league. Use EPL, LAL, or BUN.";
  }
  const items = await loadFixturesWithPredictions(env, upper as LeagueCode, 20);
  return formatFixtureList(items);
}

export async function cmdFixture(env: Env, id: string): Promise<string> {
  const sql = getDb(env);
  const fixture = await getFixtureById(sql, id);
  if (!fixture) return "Fixture not found.";
  const { getPredictionForFixture } = await import("@soccer/db");
  const prediction = await getPredictionForFixture(sql, id);
  return formatFixtureDetail({ fixture, prediction });
}

export async function cmdTeam(env: Env, name: string): Promise<string> {
  const sql = getDb(env);
  const team = await findTeamByName(sql, name);
  if (!team) return `No team matched "${name}".`;
  const strength = await getStrengthForTeam(sql, team.id);
  const recent = await getRecentMatchesForTeam(sql, team.id, 6);
  const opponentIds = new Set(recent.flatMap((m) => [m.homeTeamId, m.awayTeamId]));
  const opponentNames = new Map<string, string>();
  for (const oid of opponentIds) {
    const ot = await getTeamById(sql, oid);
    if (ot) opponentNames.set(oid, ot.name);
  }
  const recentForm = recent.map((m) => {
    const isHome = m.homeTeamId === team.id;
    const gf = isHome ? m.homeGoals! : m.awayGoals!;
    const ga = isHome ? m.awayGoals! : m.homeGoals!;
    return {
      date: m.date,
      opponentId: isHome ? m.awayTeamId : m.homeTeamId,
      opponentName: opponentNames.get(isHome ? m.awayTeamId : m.homeTeamId) ?? "?",
      home: isHome,
      goalsFor: gf,
      goalsAgainst: ga,
      result: (gf > ga ? "W" : gf === ga ? "D" : "L") as "W" | "D" | "L",
    };
  });
  return formatTeam({ team, strength, recentForm });
}

export async function cmdAccuracy(env: Env): Promise<string> {
  const sql = getDb(env);
  const [history, latest] = await Promise.all([
    getAccuracyHistory(sql, 30),
    getLatestModelRun(sql),
  ]);
  return formatAccuracy(history, latest);
}

export async function cmdSubscribe(env: Env, chatId: number, username?: string): Promise<string> {
  await addSubscriber(getDb(env), chatId, username);
  return "Subscribed. You'll get a daily digest of predictions.";
}

export async function cmdUnsubscribe(env: Env, chatId: number): Promise<string> {
  await removeSubscriber(getDb(env), chatId);
  return "Unsubscribed. You won't get the daily digest anymore.";
}
