import type {
  FixtureWithPrediction,
  Prediction,
  TeamDetail,
  AccuracyPoint,
  ModelRun,
} from "@soccer/shared-types";
import { leagueLabel } from "./labels.js";

/** Escape HTML special characters so user-provided text is safe. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function b(s: string): string {
  return `<b>${escapeHtml(s)}</b>`;
}

function i(s: string): string {
  return `<i>${escapeHtml(s)}</i>`;
}

function code(s: string): string {
  return `<code>${escapeHtml(s)}</code>`;
}

function pre(s: string): string {
  return `<pre>${escapeHtml(s)}</pre>`;
}

/** Join paragraphs/lines with <br> so newlines render in Telegram HTML. */
function join(...lines: (string | null | undefined)[]): string {
  return lines.filter((x): x is string => x !== null && x !== undefined).join("<br>");
}

function fmtDateTime(date: string | Date): string {
  return new Date(date).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatHelp(): string {
  return join(
    "<b>⚽ Soccer Match Predictor</b>",
    "",
    "Dixon–Coles predictions for the top 3 leagues.",
    "",
    "<b>Commands</b>",
    "/today — today's predictions",
    "/league " + code("epl | laliga | bundesliga") + " — filter by league",
    "/match " + code("team") + " — upcoming fixture for a team",
    "/team " + code("team") + " — team details & recent form",
    "/accuracy — model accuracy",
    "/subscribe — daily digest",
    "/unsubscribe — stop digest",
    "/help — show this message",
  );
}

export function formatWelcome(name?: string): string {
  const greet = name ? `Hi ${b(name)} 👋` : "Hi there 👋";
  return join(
    greet,
    "",
    "I'm your <b>Soccer Match Predictor</b> 🤖",
    "I use a Dixon–Coles model to forecast matches in:",
    "• Premier League",
    "• La Liga",
    "• Bundesliga",
    "",
    "Quick start:",
    "/today — today's picks",
    "/help — all commands",
  );
}

export function formatFixtureLine(item: FixtureWithPrediction): string {
  const { fixture, prediction } = item;
  const time = fmtDateTime(fixture.date);
  const head = `⚽ ${b(fixture.homeTeam.name)} vs ${b(fixture.awayTeam.name)}` +
    `<br>${i(leagueLabel(fixture.leagueCode) + " · " + time)}`;

  if (!prediction) {
    return `${head}<br><i>no prediction yet</i>`;
  }

  const pick =
    prediction.pick === "HOME"
      ? b(fixture.homeTeam.name)
      : prediction.pick === "AWAY"
        ? b(fixture.awayTeam.name)
        : "Draw";

  const probs =
    `H ${(prediction.homeWinProb * 100).toFixed(1)}%` +
    ` · D ${(prediction.drawProb * 100).toFixed(1)}%` +
    ` · A ${(prediction.awayWinProb * 100).toFixed(1)}%`;

  const xg = `xG: ${prediction.expectedHomeGoals.toFixed(2)} - ${prediction.expectedAwayGoals.toFixed(2)}`;

  const top = prediction.topScorelines
    .map((s) => `${s.home}-${s.away} (${(s.probability * 100).toFixed(1)}%)`)
    .join(" · ");

  return join(
    head,
    `Pick: ${pick}`,
    probs,
    xg,
    `Top: ${top}`,
  );
}

export function formatFixtureList(items: FixtureWithPrediction[]): string {
  if (items.length === 0) return "No upcoming fixtures.";
  return items.map(formatFixtureLine).join("<br><br>");
}

export function formatFixtureDetail(item: FixtureWithPrediction): string {
  return formatFixtureLine(item);
}

export function formatMatchBreakdown(item: FixtureWithPrediction): string {
  const { fixture, prediction } = item;
  const time = fmtDateTime(fixture.date);
  const header =
    `⚽ ${b(fixture.homeTeam.name)} vs ${b(fixture.awayTeam.name)}` +
    `<br>${i(leagueLabel(fixture.leagueCode) + " · " + time)}`;

  if (!prediction) {
    return `${header}<br><i>no prediction yet</i>`;
  }

  const pick =
    prediction.pick === "HOME"
      ? b(fixture.homeTeam.name)
      : prediction.pick === "AWAY"
        ? b(fixture.awayTeam.name)
        : "Draw";

  const probLines = [
    "Home".padEnd(6) + (prediction.homeWinProb * 100).toFixed(1) + "%",
    "Draw".padEnd(6) + (prediction.drawProb * 100).toFixed(1) + "%",
    "Away".padEnd(6) + (prediction.awayWinProb * 100).toFixed(1) + "%",
  ].join("\n");

  const scoreLines = prediction.topScorelines
    .map(
      (s, i) =>
        `${(i + 1).toString().padEnd(2)} ${s.home}-${s.away}   ${(s.probability * 100).toFixed(1)}%`,
    )
    .join("\n");

  return join(
    header,
    "",
    `Pick: ${pick}`,
    "",
    "<b>Win probabilities</b>",
    pre(probLines),
    "",
    "<b>Expected goals</b>",
    pre(`${prediction.expectedHomeGoals.toFixed(2)} - ${prediction.expectedAwayGoals.toFixed(2)}`),
    "",
    "<b>Top 3 scorelines</b>",
    pre(scoreLines),
  );
}

export function formatTeam(detail: TeamDetail): string {
  const { team, strength, recentForm } = detail;

  const lines: (string | null)[] = [
    `🏟️ ${b(team.name)} (${escapeHtml(leagueLabel(team.leagueCode))})`,
  ];

  if (strength) {
    const strengthLines = [
      `attack:  ${strength.attack > 0 ? "+" : ""}${strength.attack.toFixed(3)}`,
      `defense: ${strength.defense > 0 ? "+" : ""}${strength.defense.toFixed(3)}`,
    ].join("\n");
    lines.push(
      "",
      "<b>Strengths</b>",
      pre(strengthLines),
    );
  } else {
    lines.push("", "No model fit yet.");
  }

  if (recentForm.length > 0) {
    const results = recentForm.map((f) => f.result).join(" ");
    const formLines = recentForm
      .map((f) => {
        const date = new Date(f.date).toLocaleDateString();
        const home = f.home ? "H" : "A";
        const opponent = f.opponentName.padEnd(20);
        return `${date.padEnd(12)} ${home}  ${opponent} ${f.goalsFor}-${f.goalsAgainst}`;
      })
      .join("\n");
    lines.push(
      "",
      `<b>Recent form:</b> ${results}`,
      pre(formLines),
    );
  }

  return join(...lines);
}

export function formatAccuracy(
  history: AccuracyPoint[],
  latest: ModelRun | null,
): string {
  const lines: (string | null)[] = [];

  if (latest) {
    lines.push(
      `Latest run: ${code(escapeHtml(latest.id.slice(0, 8)))} · ${latest.matchCount} matches`,
    );
  }

  if (history.length === 0) {
    lines.push("No accuracy data yet.");
  } else {
    const byLeague = new Map<string, AccuracyPoint>();
    for (const h of history) {
      if (!byLeague.has(h.leagueCode)) byLeague.set(h.leagueCode, h);
    }

    const rows = Array.from(byLeague.entries())
      .map(([code, h]) => {
        const label = leagueLabel(code).padEnd(16);
        return `${label} ${h.correct}/${h.total}  =  ${(h.accuracy * 100).toFixed(1)}%`;
      })
      .join("\n");

    lines.push(
      "",
      "<b>Out-of-sample accuracy</b>",
      pre(rows),
    );
  }

  return join(...lines);
}
