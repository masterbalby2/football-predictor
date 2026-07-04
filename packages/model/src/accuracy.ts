import type { FitResult, MatchInput, PredictionResult } from "./types.js";
import { predict } from "./predict.js";

export interface AccuracyResult {
  total: number;
  correct: number;
  accuracy: number;
}

/**
 * Evaluate a fitted model on a set of finished matches by comparing the
 * model's most-likely outcome (HOME/DRAW/AWAY) to the actual result.
 * Intended for out-of-sample (held-out) test matches for an honest metric.
 */
export function evaluateOnMatches(
  fit: FitResult,
  testMatches: MatchInput[],
  options: { delta: number; maxGoals: number },
): AccuracyResult {
  let correct = 0;
  let total = 0;
  for (const m of testMatches) {
    const p: PredictionResult | null = predict(fit, m.homeTeamId, m.awayTeamId, options);
    if (!p) continue;
    total++;
    const actual =
      m.homeGoals > m.awayGoals ? "HOME" : m.homeGoals === m.awayGoals ? "DRAW" : "AWAY";
    if (p.pick === actual) correct++;
  }
  return {
    total,
    correct,
    accuracy: total > 0 ? Number((correct / total).toFixed(4)) : 0,
  };
}

/**
 * Split matches into train / held-out test by time. The most recent
 * `testFraction` of matches (by date) form the test set; the rest train.
 */
export function splitTrainTest(
  matches: MatchInput[],
  testFraction = 0.2,
): { train: MatchInput[]; test: MatchInput[] } {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const cut = Math.floor(sorted.length * (1 - testFraction));
  return { train: sorted.slice(0, cut), test: sorted.slice(cut) };
}
