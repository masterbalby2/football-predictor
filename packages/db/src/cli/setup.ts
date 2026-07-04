import { loadEnv } from "@soccer/config";
import { getDb, closeDb, migrate } from "../index.js";

async function main() {
  const env = loadEnv();
  const sql = getDb(env);
  try {
    const { applied } = await migrate(sql);
    console.log(
      applied.length
        ? `Applied migrations: ${applied.join(", ")}`
        : "Schema up to date.",
    );
    console.log("Database ready. Run `pnpm cron:run` to fetch data and generate predictions.");
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
