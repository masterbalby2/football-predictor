import { loadEnv, type Env } from "@soccer/config";
import { closeDb, migrate } from "@soccer/db";
import { runRefresh } from "./refresh.js";

async function runOnce(env: Env): Promise<void> {
  if (env.DB_RUN_MIGRATIONS) {
    const { getDb } = await import("@soccer/db");
    const sql = getDb(env);
    await migrate(sql);
  }
  const result = await runRefresh(env);
  console.log("Refresh complete:");
  console.log(`  source:     ${result.source}`);
  console.log(`  leagues:    ${result.leagues.join(", ")}`);
  console.log(`  matches:    ${result.totalMatches}`);
  console.log(`  fixtures:   ${result.totalFixtures}`);
  console.log(`  predictions:${result.predictions}`);
  for (const a of result.accuracy) {
    console.log(
      `  accuracy[${a.leagueCode}]: ${a.correct}/${a.total} = ${(a.accuracy * 100).toFixed(1)}%`,
    );
  }
}

async function main(): Promise<void> {
  const env = loadEnv();
  try {
    await runOnce(env);
    if (env.CRON_ONE_SHOT) {
      console.log("CRON_ONE_SHOT=true — exiting.");
      return;
    }
    // Long-running mode: re-run every 6 hours (for non-cron deployments).
    console.log("Running in scheduled mode (every 6 hours).");
    setInterval(() => {
      runOnce(env).catch((err) => console.error("Scheduled refresh failed:", err));
    }, 6 * 60 * 60 * 1000);
  } finally {
    if (env.CRON_ONE_SHOT) await closeDb();
  }
}

main().catch((err) => {
  console.error("Cron job failed:", err);
  closeDb().finally(() => process.exit(1));
});
