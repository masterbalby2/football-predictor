import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { timingSafeEqual } from "node:crypto";
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
import { cacheGet, cacheSet, cacheFlush, closeRedis } from "./cache.js";
import {
  LeagueCodeSchema,
  type TeamDetail,
  type FixtureWithPrediction,
} from "@soccer/shared-types";

const CACHE_TTL = 30; // seconds — short for near-real-time freshness

/**
 * Bearer token auth hook. If API_AUTH_TOKEN is set, all requests
 * (except /health and /docs) must include `Authorization: Bearer <token>`.
 * If API_AUTH_TOKEN is empty, auth is disabled (dev mode).
 */
function authHook(env: Env) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    // Always allow health checks and docs
    if (req.url.startsWith("/health") || req.url.startsWith("/docs")) {
      return;
    }

    // If no token configured, auth is disabled
    if (!env.API_AUTH_TOKEN) return;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.code(401).send({
        error: "unauthorized",
        message: "Missing or invalid Authorization header. Use: Bearer <token>",
      });
    }

    const token = authHeader.slice(7);
    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(env.API_AUTH_TOKEN);

    if (
      tokenBuf.length !== expectedBuf.length ||
      !timingSafeEqual(tokenBuf, expectedBuf)
    ) {
      return reply.code(401).send({
        error: "unauthorized",
        message: "Invalid API token",
      });
    }
  };
}

export async function buildServer(env: Env = loadEnv()): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: "info" } });

  const origins = env.API_CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
  await app.register(cors, {
    origin: origins.length ? origins : true,
    methods: ["GET", "POST"],
  });

  // Swagger / OpenAPI docs at /docs
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Soccer Match Predictor API",
        description:
          "Dixon-Coles match predictions for EPL, La Liga, and Bundesliga.\n\n" +
          "## Authentication\n" +
          "If `API_AUTH_TOKEN` is set on the server, all endpoints (except `/health` and `/docs`) " +
          "require a Bearer token in the `Authorization` header:\n\n" +
          "```\nAuthorization: Bearer <your-token>\n```",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            description: "Set API_AUTH_TOKEN on the server. If empty, auth is disabled.",
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  // Register auth hook (runs before route handlers)
  app.addHook("onRequest", authHook(env));

  if (env.DB_RUN_MIGRATIONS) {
    const sql = getDb(env);
    await migrate(sql);
  }

  /* ---- health ---- */
  app.get("/health", {
    schema: { tags: ["system"], summary: "Health check" },
  }, async () => ({ status: "ok", time: new Date().toISOString() }));

  /* ---- leagues ---- */
  app.get("/leagues", {
    schema: { tags: ["leagues"], summary: "List all leagues" },
  }, async (_req, reply) => {
    const cacheKey = "leagues";
    const cached = await cacheGet(env, cacheKey);
    if (cached) return cached;
    const sql = getDb(env);
    const leagues = await getLeagues(sql);
    await cacheSet(env, cacheKey, leagues, CACHE_TTL);
    return leagues;
  });

  /* ---- fixtures ---- */
  app.get("/fixtures", {
    schema: {
      tags: ["fixtures"],
      summary: "List upcoming fixtures with predictions",
      querystring: {
        type: "object",
        properties: {
          league: { type: "string", enum: ["EPL", "LAL", "BUN"] },
          limit: { type: "integer", minimum: 1, maximum: 300 },
        },
      },
    },
  }, async (req) => {
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

  app.get("/leagues/:code/fixtures", {
    schema: { tags: ["fixtures"], summary: "List fixtures for a specific league" },
  }, async (req, reply) => {
    const { code } = req.params as { code: string };
    const parsed = LeagueCodeSchema.safeParse(code);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_league", message: "Unknown league code" });
    const sql = getDb(env);
    const fixtures = await getFixtures(sql, { leagueCode: parsed.data, from: new Date(), limit: 100 });
    const predMap = await getPredictionsForFixtures(sql, fixtures.map((f) => f.id));
    return fixtures.map((f) => ({ fixture: f, prediction: predMap.get(f.id) ?? null }));
  });

  app.get("/fixtures/:id", {
    schema: { tags: ["fixtures"], summary: "Get a single fixture with prediction" },
  }, async (req, reply) => {
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

  app.get("/fixtures/:id/prediction", {
    schema: { tags: ["fixtures"], summary: "Get prediction for a fixture" },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const sql = getDb(env);
    const prediction = await getPredictionForFixture(sql, id);
    if (!prediction) return reply.code(404).send({ error: "not_found", message: "No prediction for fixture" });
    return prediction;
  });

  /* ---- teams ---- */
  app.get("/teams", {
    schema: {
      tags: ["teams"],
      summary: "List teams (optionally filtered by league)",
      querystring: {
        type: "object",
        properties: { league: { type: "string", enum: ["EPL", "LAL", "BUN"] } },
      },
    },
  }, async (req) => {
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

  app.get("/teams/search", {
    schema: { tags: ["teams"], summary: "Search teams by name" },
  }, async (req, reply) => {
    const q = (req.query as { q?: string });
    if (!q.q) return reply.code(400).send({ error: "missing_query", message: "q is required" });
    const sql = getDb(env);
    const team = await findTeamByName(sql, q.q);
    return team ?? reply.code(404).send({ error: "not_found", message: "No team matched" });
  });

  app.get("/teams/:id", {
    schema: { tags: ["teams"], summary: "Get team detail with strength and recent form" },
  }, async (req, reply) => {
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
  app.get("/accuracy", {
    schema: { tags: ["accuracy"], summary: "Model accuracy stats and history" },
  }, async () => {
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

  /* ---- refresh (real-time cache flush) ---- */
  app.post("/refresh", {
    schema: {
      tags: ["system"],
      summary:
        "Flush the API cache so subsequent reads pull fresh data from the DB. " +
        "Call this after running the cron refresh to make new predictions visible immediately.",
    },
  }, async () => {
    const flushed = await cacheFlush(env);
    const sql = getDb(env);
    const latestRun = await getLatestModelRun(sql);
    return {
      status: "ok",
      cacheKeysFlushed: flushed,
      latestRun,
    };
  });

  return app;
}

export async function startServer(): Promise<void> {
  const env = loadEnv();
  const app = await buildServer(env);
  // Railway and other hosts may provide a PORT env var that should take
  // precedence over the configured API_PORT.
  const port = process.env.PORT ? Number(process.env.PORT) : env.API_PORT;
  try {
    await app.listen({ host: env.API_HOST, port });
    console.log(`API listening on http://${env.API_HOST}:${port}`);
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
