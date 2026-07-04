import type {
  FixtureWithPrediction,
  Prediction,
  TeamDetail,
  AccuracyPoint,
  ModelRun,
} from "@soccer/shared-types";
import { leagueLabel } from "./labels.js";

const MONO = (s: string) => "```\n" + s + "\n```";

/** Pad a percentage string to a fixed width for alignment. */
function padProb(label: string, value: number, width = 6): string {
  const pct = `${(value * 100).toFixed(1)}%`;
  return `${label} ${pct.padStart(width)}`;
}

export function formatHelp(): string {
  return [
    "*Soccer Match Predictor*",
    "Dixon-Coles predictions for EPL, La Liga, and Bundesliga.",
    "",
    "*Commands*",
    "/today — today's predictions (all leagues)",
    "/league `epl|laliga|bundesliga` — filter by league",
    "/match `<team>` — upcoming fixture for a team, full breakdown",
    "/accuracy — recent model accuracy stats",
    "/subscribe — opt into the daily digest",
    "/unsubscribe — opt out of the daily digest",
    "/help — show this message",
  ].join("\n");
}

export function formatWelcome(name?: string): string {
  const greet = name ? `Hi *${escapeMd(name)}*.` : "Hi there.";
  return [
    `${greet} I'm the Soccer Match Predictor bot.`,
    "I generate Dixon-Coles predictions for EPL, La Liga, and Bundesliga.",
    "",
    "Send /help to see what I can do, or try /today for today's picks.",
  ].join("\n");
}

/** Escape special Markdown characters in a team name for safe bolding. */
function escapeMd(s: string): string {
  // Telegram MarkdownV1 only treats *, _, ` and [ as special.
  return s.replace(/([*_`\[])/g, "\\$1");
}

export function formatFixtureLine(item: FixtureWithPrediction): string {
  const { fixture, prediction } = item;
  const time = new Date(fixture.date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const head = `${leagueLabel(fixture.leagueCode)} · ${time}`;
  const match = `*${escapeMd(fixture.homeTeam.name)}* vs *${escapeMd(fixture.awayTeam.name)}*`;
  if (!prediction) return `${head}\n${match}\n  no prediction yet`;
  const pick =
    prediction.pick === "HOME"
      ? `*${escapeMd(fixture.homeTeam.name)}*`
      : prediction.pick === "AWAY"
        ? `*${escapeMd(fixture.awayTeam.name)}*`
        : "Draw";
  const probs = `${padProb("H", prediction.homeWinProb)}  ${padProb("D", prediction.drawProb)}  ${padProb("A", prediction.awayWinProb)}`;
  const xg = `xG ${prediction.expectedHomeGoals.toFixed(2)} - ${prediction.expectedAwayGoals.toFixed(2)}`;
  const top = prediction.topScorelines
    .map((s) => `${s.home}-${s.away} (${(s.probability * 100).toFixed(1)}%)`)
    .join("  ");
  return `${head}\n${match}\n  pick: ${pick}\n  ${probs}\n  ${xg}\n  top: ${top}`;
}

export function formatFixtureList(items: FixtureWithPrediction[]): string {
  if (items.length === 0) return "No upcoming fixtures.";
  const body = items.map(formatFixtureLine).join("\n\n");
  return MONO(body);
}

export function formatFixtureDetail(item: FixtureWithPrediction): string {
  return "```\n" + formatFixtureLine(item) + "\n```";
}

/**
 * Full breakdown for /match: bolded teams, aligned W/D/L probabilities,
 * expected goals, and the top-3 scorelines with their probabilities.
 */
export function formatMatchBreakdown(item: FixtureWithPrediction): string {
  const { fixture, prediction } = item;
  const time = new Date(fixture.date).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!prediction) {
    return [
      `*${escapeMd(fixture.homeTeam.name)}* vs *${escapeMd(fixture.awayTeam.name)}*`,
      `${leagueLabel(fixture.leagueCode)} · ${time}`,
      "",
      "No prediction available yet.",
    ].join("\n");
  }
  const pick =
    prediction.pick === "HOME"
      ? `*${escapeMd(fixture.homeTeam.name)}*`
      : prediction.pick === "AWAY"
        ? `*${escapeMd(fixture.awayTeam.name)}*`
        : "Draw";

  const lines = [
    `*${escapeMd(fixture.homeTeam.name)}* vs *${escapeMd(fixture.awayTeam.name)}*`,
    `${leagueLabel(fixture.leagueCode)} · ${time}`,
    "",
    `*Pick:* ${pick}`,
    "",
    "*Win probabilities*",
    MONO(
      [
        `${padProb("Home", prediction.homeWinProb, 7)}`,
        `${padProb("Draw", prediction.drawProb, 7)}`,
        `${padProb("Away", prediction.awayWinProb, 7)}`,
      ].join("\n"),
    ),
    "",
    `*Expected goals:* ${prediction.expectedHomeGoals.toFixed(2)} - ${prediction.expectedAwayGoals.toFixed(2)}`,
    "",
    "*Top 3 scorelines*",
    MONO(
      prediction.topScorelines
        .map(
          (s, i) =>
            `${i + 1}.  ${s.home}-${s.away}   ${(s.probability * 100).toFixed(1)}%`,
        )
        .join("\n"),
    ),
  ];
  return lines.join("\n");
}

export function formatTeam(detail: TeamDetail): string {
  const { team, strength, recentForm } = detail;
  const lines: string[] = [
    `*${escapeMd(team.name)}* (${leagueLabel(team.leagueCode)})`,
  ];
  if (strength) {
    lines.push(
      "",
      "*Strengths*",
      MONO(
        [
          `attack:  ${strength.attack > 0 ? "+" : ""}${strength.attack.toFixed(3)}`,
          `defense: ${strength.defense > 0 ? "+" : ""}${strength.defense.toFixed(3)}`,
        ].join("\n"),
      ),
    );
  } else {
    lines.push("", "No model fit yet.");
  }
  if (recentForm.length > 0) {
    lines.push(
      "",
      `*Recent form:* ${recentForm.map((f) => f.result).join(" ")}`,
      MONO(
        recentForm
          .map(
            (f) =>
              `  ${new Date(f.date).toLocaleDateString()}  ${f.home ? "H" : "A"}  ${f.opponentName}  ${f.goalsFor}-${f.goalsAgainst}`,
          )
          .join("\n"),
      ),
    );
  }
  return lines.join("\n");
}

export function formatAccuracy(
  history: AccuracyPoint[],
  latest: ModelRun | null,
): string {
  const lines: string[] = [];
  if (latest) {
    lines.push(
      `*Latest run:* \`${latest.id.slice(0, 8)}\`  matches: ${latest.matchCount}`,
    );
  }
  if (history.length === 0) {
    lines.push("No accuracy data yet.");
  } else {
    const byLeague = new Map<string, AccuracyPoint>();
    for (const h of history) {
      if (!byLeague.has(h.leagueCode)) byLeague.set(h.leagueCode, h);
    }
    const rows: string[] = [];
    for (const [code, h] of byLeague) {
      rows.push(
        `${leagueLabel(code).padEnd(16)} ${h.correct}/${h.total}  =  ${(h.accuracy * 100).toFixed(1)}%`,
      );
    }
    lines.push("", "*Out-of-sample accuracy*", MONO(rows.join("\n")));
  }
  return lines.join("\n");
}
