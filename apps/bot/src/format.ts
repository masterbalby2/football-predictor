import type {
  FixtureWithPrediction,
  Prediction,
  TeamDetail,
  AccuracyPoint,
  ModelRun,
} from "@soccer/shared-types";
import { leagueLabel } from "./labels.js";

const MONO = (s: string) => "```\n" + s + "\n```";

export function formatHelp(): string {
  return [
    "*Soccer Match Predictor*",
    "Dixon-Coles predictions for EPL, La Liga, Bundesliga.",
    "",
    "*Commands*",
    "/today — today's fixtures + predictions",
    "/league <EPL|LAL|BUN> — upcoming for a league",
    "/fixture <id> — single fixture prediction",
    "/team <name> — team strengths + recent form",
    "/accuracy — model accuracy",
    "/subscribe — get the daily digest",
    "/unsubscribe — stop the daily digest",
  ].join("\n");
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
  const match = `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`;
  if (!prediction) return `${head}\n${match}\n  no prediction yet`;
  const pick =
    prediction.pick === "HOME"
      ? fixture.homeTeam.name
      : prediction.pick === "AWAY"
        ? fixture.awayTeam.name
        : "Draw";
  const probs = `H ${(prediction.homeWinProb * 100).toFixed(1)}%  D ${(
    prediction.drawProb * 100
  ).toFixed(1)}%  A ${(prediction.awayWinProb * 100).toFixed(1)}%`;
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

export function formatTeam(detail: TeamDetail): string {
  const { team, strength, recentForm } = detail;
  const lines: string[] = [`${team.name} (${leagueLabel(team.leagueCode)})`];
  if (strength) {
    lines.push(
      `attack:  ${strength.attack > 0 ? "+" : ""}${strength.attack.toFixed(3)}`,
      `defense: ${strength.defense > 0 ? "+" : ""}${strength.defense.toFixed(3)}`,
    );
  } else {
    lines.push("no model fit yet");
  }
  if (recentForm.length > 0) {
    lines.push("", "form: " + recentForm.map((f) => f.result).join(" "));
    for (const f of recentForm) {
      lines.push(
        `  ${new Date(f.date).toLocaleDateString()}  ${f.home ? "H" : "A"}  ${f.opponentName}  ${f.goalsFor}-${f.goalsAgainst}`,
      );
    }
  }
  return MONO(lines.join("\n"));
}

export function formatAccuracy(
  history: AccuracyPoint[],
  latest: ModelRun | null,
): string {
  const lines: string[] = [];
  if (latest) {
    lines.push(
      `latest run: ${latest.id.slice(0, 8)}  matches: ${latest.matchCount}`,
    );
  }
  if (history.length === 0) {
    lines.push("no accuracy data yet");
  } else {
    const byLeague = new Map<string, AccuracyPoint>();
    for (const h of history) {
      if (!byLeague.has(h.leagueCode)) byLeague.set(h.leagueCode, h);
    }
    for (const [code, h] of byLeague) {
      lines.push(
        `${leagueLabel(code)}: ${h.correct}/${h.total} = ${(h.accuracy * 100).toFixed(1)}%`,
      );
    }
  }
  return MONO(lines.join("\n"));
}
