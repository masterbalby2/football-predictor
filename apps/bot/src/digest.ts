import type { Env } from "@soccer/config";
import { getDb, getSubscribers } from "@soccer/db";
import { cmdToday } from "./commands.js";

interface BotSender {
  sendMessage: (chatId: number, text: string) => Promise<unknown>;
}

/**
 * Runs a daily digest push to all subscribers at env.TELEGRAM_DIGEST_HOUR_UTC.
 * Checks every 15 minutes; pushes once per day. Uses an in-memory flag that
 * resets at midnight UTC.
 */
export function startDigestScheduler(env: Env, bot: BotSender): NodeJS.Timeout {
  let lastPushedDay = "";

  async function tick() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const dayKey = now.toISOString().slice(0, 10);
    if (utcHour !== env.TELEGRAM_DIGEST_HOUR_UTC) return;
    if (lastPushedDay === dayKey) return;
    lastPushedDay = dayKey;

    const subs = await getSubscribers(getDb(env)).catch(() => []);
    if (subs.length === 0) return;
    const text = await cmdToday(env).catch(() => "Digest unavailable right now.");
    for (const s of subs) {
      await bot.sendMessage(s.chatId, text).catch((err) => {
        console.warn(`[digest] failed to send to ${s.chatId}:`, err.message);
      });
    }
    console.log(`[digest] pushed to ${subs.length} subscribers.`);
  }

  return setInterval(tick, 15 * 60 * 1000);
}
