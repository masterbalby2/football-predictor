import Redis from "ioredis";
import type { Env } from "@soccer/config";

let redis: Redis | null = null;

export function getRedis(env: Env): Redis {
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
    const raw = await getRedis(env).get(key);
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
    await getRedis(env).set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    /* ignore */
  }
}
