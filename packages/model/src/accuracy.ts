import type { FitResult, MatchInput, PredictionResult } from "./types.js";
import { predict } from "./predict.js";

export interface AccuracyResult {
  total: number;
  correct: number;
  accuracy: number;
  /** Brier score (lower = better; 0 = perfect, 0.222 = random guessing on 3-way). */
  brierScore: number;
  /** Log-loss / negative log-likelihood (lower = better). */
  logLoss: number;
}

/**
 * Evaluate a fitted model on a set of finished matches by comparing the
 * model's most-likely outcome (HOME/DRAW/AWAY) to the actual result.
 * Intended for out-of-sample (held-out) test matches for an honest metric.
 *
 * Returns 1X2 accuracy, Brier score, and log-loss.
 */
export function evaluateOnMatches(
  fit: FitResult,
  testMatches: MatchInput[],
  options: { delta: number; maxGoals: number },
): AccuracyResult {
  let correct = 0;
  let total = 0;
  let brierSum = 0;
  let logLossSum = 0;

  for (const m of testMatches) {
    const p: PredictionResult | null = predict(fit, m.homeTeamId, m.awayTeamId, options);
    if (!p) continue;
    total++;

    const actual =
      m.homeGoals > m.awayGoals ? "HOME" : m.homeGoals === m.awayGoals ? "DRAW" : "AWAY";

    // 1X2 accuracy
    if (p.pick === actual) correct++;

    // Brier score: sum of squared errors across the 3 outcomes.
    // Actual is 1 for the true outcome, 0 for others.
    const probs = { HOME: p.homeWinProb, DRAW: p.drawProb, AWAY: p.awayWinProb };
    for (const outcome of ["HOME", "DRAW", "AWAY"] as const) {
      const actualP = outcome === actual ? 1 : 0;
      const diff = probs[outcome] - actualP;
      brierSum += diff * diff;
    }
    // Brier score is averaged over outcomes (divide by 3), then we average over matches below.

    // Log-loss: -log(P(actual outcome))
    const pActual = probs[actual];
    // Clamp to avoid log(0)
    const clamped = Math.max(pActual, 1e-15);
    logLossSum += -Math.log(clamped);
  }

  const brierScore = total > 0 ? Number((brierSum / (total * 3)).toFixed(4)) : 0;
  const logLoss = total > 0 ? Number((logLossSum / total).toFixed(4)) : 0;

  return {
    total,
    correct,
    accuracy: total > 0 ? Number((correct / total).toFixed(4)) : 0,
    brierScore,
    logLoss,
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

/**
 * Walk-forward (rolling-origin) cross-validation.
 *
 * Sorts matches chronologically, then repeatedly fits on the first `k`
 * matches and evaluates on the next `testSize` matches. This mimics how
 * the model would actually be used: fit on all available history, predict
 * the next batch of fixtures.
 *
 * Returns aggregated accuracy across all folds.
 */
export function walkForwardEval(
  leagueCode: FitResult["leagueCode"],
  matches: MatchInput[],
  fitOptions: import("./types.js").FitOptions,
  options: { testSize: number; minTrain: number; step?: number },
): AccuracyResult {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const step = options.step ?? options.testSize;
  let correct = 0;
  let total = 0;
  let brierSum = 0;
  let logLossSum = 0;

  for (let start = options.minTrain; start + options.testSize <= sorted.length; start += step) {
    const train = sorted.slice(0, start);
    const test = sorted.slice(start, start + options.testSize);
    if (train.length < fitOptions.minMatches) continue;

    // Use the `now` from the last training match for time decay.
    const trainOpts = { ...fitOptions, now: new Date(train[train.length - 1].date) };
    const fit = fitModel(leagueCode, train, trainOpts);
    if (!fit) continue;

    const res = evaluateOnMatches(fit, test, {
      delta: fitOptions.delta,
      maxGoals: fitOptions.maxGoals,
    });
    correct += res.correct;
    total += res.total;
    brierSum += res.brierScore * res.total;
    logLossSum += res.logLoss * res.total;
  }

  return {
    total,
    correct,
    accuracy: total > 0 ? Number((correct / total).toFixed(4)) : 0,
    brierScore: total > 0 ? Number((brierSum / total).toFixed(4)) : 0,
    logLoss: total > 0 ? Number((logLossSum / total).toFixed(4)) : 0,
  };
}

// Late import to avoid circular dependency at module load time.
import { fitModel } from "./fit.js";
