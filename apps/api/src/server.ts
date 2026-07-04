import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { loadEnv, type Env } from "@soccer/config";
import {
  getDb,
  closeDb,
  migrate,
  getLeagues,
  getTeams,
  getTeamById,
  findTeamByName,
  getStrengthForTeam,
  getRecentMatchesForTeam,
  getFixtures,
  getFixtureById,
  getPredictionForFixture,
  getPredictionsForFixtures,
  getAccuracyHistory,
  getLatestModelRun,
} from "@soccer/db";
import { cacheGet, cacheSet, closeRedis } from "./cache.js";
import {
  LeagueCodeSchema,
  type TeamDetail,
  type FixtureWithPrediction,
} from "@soccer/shared-types";

const CACHE_TTL = 60; // seconds — short, since cron refreshes daily

export async function buildServer(env: Env = loadEnv()): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: "info" } });

  const origins = env.API_CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
  await app.register(cors, {
    origin: origins.length ? origins : true,
    methods: ["GET"],
  });

  if (env.DB_RUN_MIGRATIONS) {
    const sql = getDb(env);
    await migrate(sql);
  }

  /* ---- health ---- */
  app.get("/health", async () => ({ status: "ok", time: new Date().toISOString() }));

  /* ---- leagues ---- */
  app.get("/leagues", async (_req, reply) => {
    const cacheKey = "leagues";
    const cached = await cacheGet(env, cacheKey);
    if (cached) return cached;
    const sql = getDb(env);
    const leagues = await getLeagues(sql);
    await cacheSet(env, cacheKey, leagues, CACHE_TTL);
    return leagues;
  });

  /* ---- fixtures ---- */
  app.get("/fixtures", async (req) => {
    const q = (req.query as { league?: string; limit?: string });
    const leagueCode = q.league ? LeagueCodeSchema.parse(q.league) : undefined;
    const limit = q.limit ? Math.min(300, Number(q.limit)) : 100;
    const cacheKey = `fixtures:${leagueCode ?? "all"}:${limit}`;
    const cached = await cacheGet(env, cacheKey);
    if (cached) return cached;
    const sql = getDb(env);
    const fixtures = await getFixtures(sql, {
      leagueCode,
      from: new Date(),
      limit,
    });
    const predMap = await getPredictionsForFixtures(
      sql,
      fixtures.map((f) => f.id),
    );
    const result: FixtureWithPrediction[] = fixtures.map((f) => ({
      fixture: f,
      prediction: predMap.get(f.id) ?? null,
    }));
    await cacheSet(env, cacheKey, result, CACHE_TTL);
    return result;
  });

  app.get("/leagues/:code/fixtures", async (req, reply) => {
    const { code } = req.params as { code: string };
    const parsed = LeagueCodeSchema.safeParse(code);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_league", message: "Unknown league code" });
    const sql = getDb(env);
    const fixtures = await getFixtures(sql, { leagueCode: parsed.data, from: new Date(), limit: 100 });
    const predMap = await getPredictionsForFixtures(sql, fixtures.map((f) => f.id));
    return fixtures.map((f) => ({ fixture: f, prediction: predMap.get(f.id) ?? null }));
  });

  app.get("/fixtures/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const cacheKey = `fixture:${id}`;
    const cached = await cacheGet<FixtureWithPrediction>(env, cacheKey);
    if (cached) return cached;
    const sql = getDb(env);
    const fixture = await getFixtureById(sql, id);
    if (!fixture) return reply.code(404).send({ error: "not_found", message: "Fixture not found" });
    const prediction = await getPredictionForFixture(sql, id);
    const result: FixtureWithPrediction = { fixture, prediction };
    await cacheSet(env, cacheKey, result, CACHE_TTL);
    return result;
  });

  app.get("/fixtures/:id/prediction", async (req, reply) => {
    const { id } = req.params as { id: string };
    const sql = getDb(env);
    const prediction = await getPredictionForFixture(sql, id);
    if (!prediction) return reply.code(404).send({ error: "not_found", message: "No prediction for fixture" });
    return prediction;
  });

  /* ---- teams ---- */
  app.get("/teams", async (req) => {
    const q = (req.query as { league?: string });
    const leagueCode = q.league ? LeagueCodeSchema.parse(q.league) : undefined;
    const cacheKey = `teams:${leagueCode ?? "all"}`;
    const cached = await cacheGet(env, cacheKey);
    if (cached) return cached;
    const sql = getDb(env);
    const teams = await getTeams(sql, leagueCode);
    await cacheSet(env, cacheKey, teams, CACHE_TTL);
    return teams;
  });

  app.get("/teams/search", async (req, reply) => {
    const q = (req.query as { q?: string });
    if (!q.q) return reply.code(400).send({ error: "missing_query", message: "q is required" });
    const sql = getDb(env);
    const team = await findTeamByName(sql, q.q);
    return team ?? reply.code(404).send({ error: "not_found", message: "No team matched" });
  });

  app.get("/teams/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const cacheKey = `team:${id}`;
    const cached = await cacheGet<TeamDetail>(env, cacheKey);
    if (cached) return cached;
    const sql = getDb(env);
    const team = await getTeamById(sql, id);
    if (!team) return reply.code(404).send({ error: "not_found", message: "Team not found" });
    const strength = await getStrengthForTeam(sql, id);
    const recent = await getRecentMatchesForTeam(sql, id, 6);
    // Build form with opponent names.
    const opponentIds = new Set(recent.flatMap((m) => [m.homeTeamId, m.awayTeamId]));
    const opponentNames = new Map<string, string>();
    for (const oid of opponentIds) {
      const ot = await getTeamById(sql, oid);
      if (ot) opponentNames.set(oid, ot.name);
    }
    const recentForm = recent.map((m) => {
      const isHome = m.homeTeamId === id;
      const gf = isHome ? m.homeGoals! : m.awayGoals!;
      const ga = isHome ? m.awayGoals! : m.homeGoals!;
      const result: "W" | "D" | "L" = gf > ga ? "W" : gf === ga ? "D" : "L";
      return {
        date: m.date,
        opponentId: isHome ? m.awayTeamId : m.homeTeamId,
        opponentName: opponentNames.get(isHome ? m.awayTeamId : m.homeTeamId) ?? "?",
        home: isHome,
        goalsFor: gf,
        goalsAgainst: ga,
        result,
      };
    });
    const detail: TeamDetail = { team, strength, recentForm };
    await cacheSet(env, cacheKey, detail, CACHE_TTL);
    return detail;
  });

  /* ---- accuracy ---- */
  app.get("/accuracy", async () => {
    const cacheKey = "accuracy";
    const cached = await cacheGet(env, cacheKey);
    if (cached) return cached;
    const sql = getDb(env);
    const [history, latest] = await Promise.all([
      getAccuracyHistory(sql, 30),
      getLatestModelRun(sql),
    ]);
    const result = { latestRun: latest, history };
    await cacheSet(env, cacheKey, result, CACHE_TTL);
    return result;
  });

  return app;
}

export async function startServer(): Promise<void> {
  const env = loadEnv();
  const app = await buildServer(env);
  try {
    await app.listen({ host: env.API_HOST, port: env.API_PORT });
    console.log(`API listening on http://${env.API_HOST}:${env.API_PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  await closeRedis();
  await closeDb();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
