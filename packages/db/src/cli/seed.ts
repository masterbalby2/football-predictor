import { loadEnv } from "@soccer/config";
import { getDb, closeDb, seedDatabase } from "../index.js";

async function main() {
  const env = loadEnv();
  const sql = getDb(env);
  try {
    const result = await seedDatabase(sql);
    console.log(
      `Seed complete: ${result.teams} teams, ${result.matches} matches, ${result.fixtures} fixtures.`,
    );
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
