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
        : "No pending migrations.",
    );
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
