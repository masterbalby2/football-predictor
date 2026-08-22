import { Telegraf } from "telegraf";
import { loadEnv, type Env } from "@soccer/config";
import { closeDb, migrate } from "@soccer/db";
import {
  cmdHelp,
  cmdWelcome,
  cmdToday,
  cmdLeague,
  cmdMatch,
  cmdTeam,
  cmdAccuracy,
  cmdSubscribe,
  cmdUnsubscribe,
} from "./commands.js";
import { startDigestScheduler } from "./digest.js";

async function main() {
  const env = loadEnv();

  if (env.DB_RUN_MIGRATIONS) {
    const { getDb } = await import("@soccer/db");
    await migrate(getDb(env));
  }

  if (!env.TELEGRAM_BOT_TOKEN) {
    console.warn(
      "[bot] TELEGRAM_BOT_TOKEN not set — running in dry-run mode (no polling).",
    );
    console.warn("[bot] Set TELEGRAM_BOT_TOKEN to enable the bot.");
    // Keep the process alive for Railway (and for the digest scheduler if a
    // token is later provided via restart). In dry-run we just idle.
    setInterval(() => {}, 1000 * 60 * 60);
    return;
  }

  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

  bot.start(async (ctx) =>
    ctx.reply(await cmdWelcome((ctx.from as { first_name?: string })?.first_name), {
      parse_mode: "Markdown",
    }),
  );
  bot.help(async (ctx) => ctx.reply(await cmdHelp(), { parse_mode: "Markdown" }));

  bot.command("today", async (ctx) => {
    const text = await cmdToday(env);
    ctx.reply(text, { parse_mode: "Markdown" });
  });

  bot.command("league", async (ctx) => {
    const arg = ctx.message.text.split(/\s+/).slice(1).join(" ");
    const text = await cmdLeague(env, arg);
    ctx.reply(text, { parse_mode: "Markdown" });
  });

  bot.command("match", async (ctx) => {
    const arg = ctx.message.text.split(/\s+/).slice(1).join(" ");
    const text = await cmdMatch(env, arg);
    ctx.reply(text, { parse_mode: "Markdown" });
  });

  bot.command("team", async (ctx) => {
    const arg = ctx.message.text.split(/\s+/).slice(1).join(" ");
    const text = await cmdTeam(env, arg);
    ctx.reply(text, { parse_mode: "Markdown" });
  });

  bot.command("accuracy", async (ctx) => {
    const text = await cmdAccuracy(env);
    ctx.reply(text, { parse_mode: "Markdown" });
  });

  bot.command("subscribe", async (ctx) => {
    const text = await cmdSubscribe(
      env,
      ctx.chat.id,
      (ctx.from as { username?: string })?.username,
    );
    ctx.reply(text);
  });

  bot.command("unsubscribe", async (ctx) => {
    const text = await cmdUnsubscribe(env, ctx.chat.id);
    ctx.reply(text);
  });

  // Daily digest scheduler (reads from Postgres directly, batched sends).
  startDigestScheduler(env, {
    sendMessage: (chatId, text) =>
      bot.telegram.sendMessage(chatId, text, { parse_mode: "Markdown" }),
  });

  bot.catch((err) => console.error("[bot] error:", err));

  // Railway sends SIGTERM on redeploy.
  process.once("SIGTERM", () => {
    bot.stop("SIGTERM");
    closeDb().finally(() => process.exit(0));
  });
  process.once("SIGINT", () => {
    bot.stop("SIGINT");
    closeDb().finally(() => process.exit(0));
  });

  // Use long polling (webhook not configured for MVP).
  // If the token is invalid/revoked, Telegram returns 404 on getMe during
  // launch. Fall back to dry-run mode instead of crash-looping.
  try {
    await bot.launch();
    console.log("[bot] launched — polling for updates.");
  } catch (err) {
    console.error("[bot] failed to launch (invalid token?):", err);
    console.warn("[bot] Falling back to dry-run mode (no polling).");
    setInterval(() => {}, 1000 * 60 * 60);
  }
}

main().catch((err) => {
  console.error("[bot] failed to start:", err);
  closeDb().finally(() => process.exit(1));
});
