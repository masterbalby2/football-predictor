import postgres from "postgres";
import type { Env } from "@soccer/config";

let client: ReturnType<typeof postgres> | null = null;

/**
 * Get a shared postgres.js client. The connection is reused across calls.
 * Pass an explicit env (from loadEnv()) so callers control config.
 */
export function getDb(env: Env): ReturnType<typeof postgres> {
  if (client) return client;
  const sql = postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // postgres.js uses ssl by default when connection string says so;
    // Railway sets sslmode in DATABASE_URL.
    onnotice: () => {
      /* suppress NOTICE noise */
    },
  });
  client = sql;
  return sql;
}

/** Close the shared client (mainly for tests / one-shot scripts). */
export async function closeDb(): Promise<void> {
  if (client) {
    await client.end({ timeout: 5 });
    client = null;
  }
}

export type Sql = ReturnType<typeof postgres>;
