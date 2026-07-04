import type { Env } from "@soccer/config";
import { getDb, getSubscribers } from "@soccer/db";
import { cmdToday } from "./commands.js";

interface BotSender {
  sendMessage: (chatId: number, text: string) => Promise<unknown>;
}

const BATCH_DELAY_MS = 80; // ~12 msgs/sec — well under Telegram's 30/sec limit
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // check every 15 minutes

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Runs a daily digest push to all subscribers at env.TELEGRAM_DIGEST_HOUR_UTC.
 * Checks every 15 minutes; pushes once per day. Sends are batched with small
 * delays to respect Telegram's bulk-send rate limits.
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

    let sent = 0;
    for (const s of subs) {
      await bot
        .sendMessage(s.chatId, text)
        .then(() => sent++)
        .catch((err) => {
          console.warn(`[digest] failed to send to ${s.chatId}:`, err.message);
        });
      // Batch delay between sends to respect rate limits.
      if (sent < subs.length) await sleep(BATCH_DELAY_MS);
    }
    console.log(`[digest] pushed to ${sent}/${subs.length} subscribers.`);
  }

  return setInterval(tick, CHECK_INTERVAL_MS);
}
