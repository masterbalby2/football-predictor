import Redis from "ioredis";
import type { Env } from "@soccer/config";

let redis: Redis | null = null;

export function getRedis(env: Env): Redis | null {
  if (!env.REDIS_URL) return null;
  if (redis) return redis;
  redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  redis.on("error", (err) => {
    // Don't crash on redis errors — caching is best-effort.
    console.warn("[redis] error:", err.message);
  });
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit().catch(() => {});
    redis = null;
  }
}

/**
 * Best-effort cache get. Returns parsed JSON or null on miss/error.
 */
export async function cacheGet<T>(env: Env, key: string): Promise<T | null> {
  try {
    const r = getRedis(env);
    if (!r) return null;
    const raw = await r.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Best-effort cache set. Never throws.
 */
export async function cacheSet(
  env: Env,
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  try {
    const r = getRedis(env);
    if (!r) return;
    await r.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    /* ignore */
  }
}

/**
 * Best-effort cache flush. Clears all cached API responses so the next
 * request re-reads from the database. Used by POST /refresh for real-time
 * updates after a cron data refresh.
 */
export async function cacheFlush(env: Env): Promise<number> {
  try {
    const r = getRedis(env);
    if (!r) return 0;
    // SCAN-based deletion to avoid blocking Redis with KEYS on large keyspaces.
    let cursor = "0";
    let deleted = 0;
    do {
      const [next, keys] = await r.scan(cursor, "COUNT", 200);
      cursor = next;
      if (keys.length > 0) {
        deleted += await r.del(...keys);
      }
    } while (cursor !== "0");
    return deleted;
  } catch {
    return 0;
  }
}
