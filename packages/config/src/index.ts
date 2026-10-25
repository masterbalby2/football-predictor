import { z } from "zod";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env file in development (Railway sets env vars directly in prod).
// Search from cwd upward so workspace scripts find the root .env.
for (let dir = process.cwd(); dir !== "/"; dir = resolve(dir, "..")) {
  const envPath = resolve(dir, ".env");
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath });
    break;
  }
}

const bool = z
  .string()
  .transform((v) => v === "true" || v === "1")
  .pipe(z.boolean());

const num = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null || v === "" ? fallback : Number(v)))
    .pipe(z.number());

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DB_RUN_MIGRATIONS: bool.default("true"),

  REDIS_URL: z.string().optional().default(""),

  // football-data.org API token. Accepts either FOOTBALL_DATA_API_KEY
  // (per spec naming) or FOOTBALL_DATA_API_TOKEN (football-data.org convention).
  FOOTBALL_DATA_API_KEY: z.string().optional().default(""),
  FOOTBALL_DATA_API_TOKEN: z.string().optional().default(""),
  FOOTBALL_DATA_BASE_URL: z
    .string()
    .default("https://api.football-data.org/v4"),

  DC_DELTA: num(0.15),
  DC_HALF_LIFE_DAYS: num(365),
  DC_RIDGE_LAMBDA: num(0),
  DC_MAX_GOALS: num(10),
  DC_MIN_MATCHES: num(20),
  // Recent-form adjustment: weight given to last-N-matches form vs. season strength.
  // 0 = pure Dixon-Coles (season-long only). 0.2 = 20% form, 80% season strength.
  DC_FORM_WEIGHT: num(0.2),
  // Number of most-recent matches used to compute the form factor.
  DC_FORM_RECENT_N: num(6),
  MODEL_VERSION: z.string().default("DC-1"),

  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: num(4000),
  API_BASE_URL: z.string().default("http://localhost:4000"),
  API_CORS_ORIGIN: z.string().default("http://localhost:3000"),
  API_AUTH_TOKEN: z.string().optional().default(""),

  WEB_PORT: num(3000),
  NEXT_PUBLIC_API_URL: z.string().default("http://localhost:4000"),

  // Auth credentials for the web frontend.
  AUTH_USERNAME: z.string().default("admin"),
  AUTH_PASSWORD: z.string().default("predictor123"),
  AUTH_SECRET: z.string().default("dev-secret-change-in-production"),

  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  TELEGRAM_BOT_OWNER_CHAT_ID: z.string().optional().default(""),
  TELEGRAM_DIGEST_HOUR_UTC: num(7),

  CRON_ONE_SHOT: bool.default("true"),
  CRON_LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("info"),
  CRON_LOCK_TTL_SECONDS: num(600),

  NODE_ENV: z.string().default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

/**
 * Load and validate environment variables. Cached after first call.
 * Throws a clear error listing every invalid/missing variable.
 */
export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Reload env (mainly for tests). */
export function reloadEnv(): Env {
  cached = null;
  return loadEnv();
}

export const LEAGUES = [
  { code: "EPL", fdCode: "PL", name: "Premier League", country: "England" },
  { code: "LAL", fdCode: "PD", name: "La Liga", country: "Spain" },
  { code: "BUN", fdCode: "BL1", name: "Bundesliga", country: "Germany" },
  { code: "FL1", fdCode: "FL1", name: "Ligue1", country: "France" },  
  { code: "CL", fdCode: "CL", name: "UEFA", country: "UEFA" },
  { code: "DED", fdCode: "DED", name: "Eridivisie", country: "Pays-Bas" },
  { code: "PPL", fdCode: "PPL", name: "Primeira", country: "Portugal" },
  { code: "SA", fdCode: "SA", name: "SerieA", country: "Italie" },   
] as const;

export type LeagueCode = (typeof LEAGUES)[number]["code"];
