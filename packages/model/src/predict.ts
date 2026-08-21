import type { Scoreline } from "@soccer/shared-types";
import type { FitResult, PredictionResult } from "./types.js";
import { tau } from "./fit.js";

function poissonPmf(k: number, lambda: number): number {
  // P(X=k) = exp(-lambda) * lambda^k / k!
  let logp = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logp -= Math.log(i);
  return Math.exp(logp);
}

export interface PredictOptions {
  delta: number;
  maxGoals: number;
  /**
   * Weight (0–1) given to recent-form adjustment vs. the fitted model.
   * 0 = pure Dixon-Coles (season-long strength only).
   * 1 = pure recent form. Typical: 0.15–0.25.
   */
  formWeight?: number;
  /** Multiplicative form factor for the home team's attacking lambda (1 = no change). */
  homeAttackForm?: number;
  /** Multiplicative form factor for the away team's attacking lambda (1 = no change). */
  awayAttackForm?: number;
  /** Multiplicative defensive form factor for the home team (affects away lambda). */
  homeDefenseForm?: number;
  /** Multiplicative defensive form factor for the away team (affects home lambda). */
  awayDefenseForm?: number;
}

/**
 * Derive a human-readable tip from the pick, top probability, and confidence.
 *
 * Confidence bands (margin between top prob and runner-up):
 *   >= 0.20  => "Strong"
 *   >= 0.08  => "Lean"
 *   <  0.08  => "Too close to call"
 */
function deriveTip(
  pick: "HOME" | "DRAW" | "AWAY",
  topProb: number,
  confidence: number,
): string {
  if (confidence < 0.08) return "Too close to call";
  const label =
    pick === "HOME" ? "Home Win" : pick === "AWAY" ? "Away Win" : "Draw";
  const strength = confidence >= 0.2 ? "Strong" : "Lean";
  // High-probability draws are rare and worth flagging as value.
  if (pick === "DRAW" && topProb >= 0.3) return `Value Draw`;
  return `${strength} ${label}`;
}

/**
 * Predict a single fixture from a fitted model.
 * Returns W/D/L probabilities, expected goals, the full scoreline grid,
 * the top-3 most likely scorelines (Dixon-Coles corrected), a confidence
 * score, and a human-readable tip.
 */
export function predict(
  fit: FitResult,
  homeTeamId: string,
  awayTeamId: string,
  options: PredictOptions,
): PredictionResult | null {
  const home = fit.teams.find((t) => t.teamId === homeTeamId);
  const away = fit.teams.find((t) => t.teamId === awayTeamId);
  if (!home || !away) return null;

  const logLh = fit.intercept + home.attack - away.defense + fit.homeAdvantage;
  const logLa = fit.intercept + away.attack - home.defense;
  let lh = Math.exp(logLh);
  let la = Math.exp(logLa);

  // Apply recent-form adjustment (real-life recent performance).
  // Home attacking form scales home lambda up/down; away defensive form
  // also scales home lambda (a leaky away defense => more home goals).
  // Symmetric for the away lambda.
  const formWeight = options.formWeight ?? 0;
  if (formWeight > 0) {
    const hAtk = options.homeAttackForm ?? 1;
    const aAtk = options.awayAttackForm ?? 1;
    const hDef = options.homeDefenseForm ?? 1;
    const aDef = options.awayDefenseForm ?? 1;
    // Combined factor per team: blend attacking form of scorer and defensive
    // form of conceder. Geometric mean keeps the adjustment multiplicative
    // and symmetric.
    const homeFactor = Math.sqrt(hAtk * aDef);
    const awayFactor = Math.sqrt(aAtk * hDef);
    lh *= (1 - formWeight) + formWeight * homeFactor;
    la *= (1 - formWeight) + formWeight * awayFactor;
  }

  const maxG = options.maxGoals;
  const matrix: number[][] = Array.from({ length: maxG + 1 }, () =>
    new Array(maxG + 1).fill(0),
  );

  // Build independent Poisson grid, then apply DC tau correction.
  const homePmf = new Array(maxG + 1);
  const awayPmf = new Array(maxG + 1);
  for (let x = 0; x <= maxG; x++) homePmf[x] = poissonPmf(x, lh);
  for (let y = 0; y <= maxG; y++) awayPmf[y] = poissonPmf(y, la);

  let total = 0;
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  for (let x = 0; x <= maxG; x++) {
    for (let y = 0; y <= maxG; y++) {
      const p = homePmf[x] * awayPmf[y] * tau(x, y, options.delta);
      matrix[x][y] = p;
      total += p;
      if (x > y) homeWin += p;
      else if (x === y) draw += p;
      else awayWin += p;
    }
  }

  // Normalize (tau correction can move total slightly off 1).
  const norm = total > 0 ? 1 / total : 1;
  for (let x = 0; x <= maxG; x++)
    for (let y = 0; y <= maxG; y++) matrix[x][y] *= norm;
  homeWin *= norm;
  draw *= norm;
  awayWin *= norm;

  // Top-3 scorelines.
  const flat: Scoreline[] = [];
  for (let x = 0; x <= maxG; x++) {
    for (let y = 0; y <= maxG; y++) {
      flat.push({ home: x, away: y, probability: matrix[x][y] });
    }
  }
  flat.sort((a, b) => b.probability - a.probability);
  const top3 = flat.slice(0, 3).map((s) => ({
    home: s.home,
    away: s.away,
    probability: Number(s.probability.toFixed(4)),
  }));

  const pick: "HOME" | "DRAW" | "AWAY" =
    homeWin >= draw && homeWin >= awayWin
      ? "HOME"
      : draw >= homeWin && draw >= awayWin
        ? "DRAW"
        : "AWAY";

  // Confidence: margin between the top probability and the runner-up.
  const sortedProbs = [homeWin, draw, awayWin].sort((a, b) => b - a);
  const confidence = Number((sortedProbs[0] - sortedProbs[1]).toFixed(4));
  const tip = deriveTip(pick, sortedProbs[0], confidence);

  return {
    homeWinProb: Number(homeWin.toFixed(4)),
    drawProb: Number(draw.toFixed(4)),
    awayWinProb: Number(awayWin.toFixed(4)),
    expectedHomeGoals: Number(lh.toFixed(3)),
    expectedAwayGoals: Number(la.toFixed(3)),
    topScorelines: top3,
    pick,
    confidence,
    tip,
    scoreMatrix: matrix,
  };
}
