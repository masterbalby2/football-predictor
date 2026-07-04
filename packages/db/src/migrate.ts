import type { Sql } from "./client.js";
import { migrations } from "./schema.js";

/**
 * Apply pending migrations. Each migration runs in its own transaction.
 * Tracks applied migrations in a `_migrations` table.
 */
export async function migrate(sql: Sql): Promise<{ applied: string[] }> {
  await sql`CREATE TABLE IF NOT EXISTS _migrations (
    id        TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  const appliedRows = await sql`SELECT id FROM _migrations ORDER BY id`;
  const applied = new Set(appliedRows.map((r) => r.id as string));

  const toApply = migrations.filter((m) => !applied.has(m.id));
  for (const m of toApply) {
    await sql.begin(async (tx) => {
      await tx.unsafe(m.sql);
      await tx`INSERT INTO _migrations (id) VALUES (${m.id})`;
    });
  }
  return { applied: toApply.map((m) => m.id) };
}
