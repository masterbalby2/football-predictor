import type { Env } from "@soccer/config";
import {
  getDb,
  getFixtures,
  getFixtureById,
  getPredictionsForFixtures,
  getPredictionForFixture,
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
import { resolveLeagueCode } from "./labels.js";
import { escapeHtml } from "./format.js";
import {
  formatHelp,
  formatWelcome,
  formatFixtureList,
  formatMatchBreakdown,
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

export async function cmdWelcome(name?: string): Promise<string> {
  return formatWelcome(name);
}

export async function cmdToday(env: Env): Promise<string> {
  const items = await loadFixturesWithPredictions(env, undefined, 30);
  // Filter to today's fixtures; fall back to the next 10 if none today.
  const todayStr = new Date().toDateString();
  const todays = items.filter((i) => new Date(i.fixture.date).toDateString() === todayStr);
  const list = todays.length > 0 ? todays : items.slice(0, 10);
  return formatFixtureList(list);
}

export async function cmdLeague(env: Env, input: string): Promise<string> {
  const code = resolveLeagueCode(input);
  if (!code) {
    return (
      "Unknown league. Try one of: <code>epl</code>, <code>laliga</code>, <code>bundesliga</code>, <code>ligue1</code> " +
      "(or <code>EPL</code>, <code>LAL</code>, <code>BUN</code>, <code>FL1</code>)."
    );
  }
  const items = await loadFixturesWithPredictions(env, code, 20);
  return formatFixtureList(items);
}

/**
 * /match <team> — find the next upcoming fixture for a team and show the
 * full prediction breakdown (probabilities + top-3 scorelines + xG).
 */
export async function cmdMatch(env: Env, name: string): Promise<string> {
  if (!name.trim()) {
    return "Usage: /match <code>team name</code> — e.g. /match Arsenal";
  }
  const sql = getDb(env);
  const team = await findTeamByName(sql, name);
  if (!team) return `No team matched "${escapeHtml(name)}".`;

  // Find upcoming fixtures involving this team.
  const fixtures = await getFixtures(sql, { from: new Date(), limit: 300 });
  const next = fixtures.find(
    (f) => f.homeTeamId === team.id || f.awayTeamId === team.id,
  );
  if (!next) {
    return `No upcoming fixture found for <b>${escapeHtml(team.name)}</b>.`;
  }
  const prediction = await getPredictionForFixture(sql, next.id);
  return formatMatchBreakdown({ fixture: next, prediction });
}

export async function cmdTeam(env: Env, name: string): Promise<string> {
  const sql = getDb(env);
  const team = await findTeamByName(sql, name);
  if (!team) return `No team matched "${escapeHtml(name)}".`;
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
