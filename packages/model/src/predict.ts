import type { Scoreline } from "@soccer/shared-types";
import type { FitResult, PredictionResult } from "./types.js";
import { tau } from "./fit.js";

function poissonPmf(k: number, lambda: number): number {
  // P(X=k) = exp(-lambda) * lambda^k / k!
  let logp = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logp -= Math.log(i);
  return Math.exp(logp);
}

/**
 * Predict a single fixture from a fitted model.
 * Returns W/D/L probabilities, expected goals, the full scoreline grid,
 * and the top-3 most likely scorelines (Dixon-Coles corrected).
 */
export function predict(
  fit: FitResult,
  homeTeamId: string,
  awayTeamId: string,
  options: { delta: number; maxGoals: number },
): PredictionResult | null {
  const home = fit.teams.find((t) => t.teamId === homeTeamId);
  const away = fit.teams.find((t) => t.teamId === awayTeamId);
  if (!home || !away) return null;

  const logLh = fit.intercept + home.attack - away.defense + fit.homeAdvantage;
  const logLa = fit.intercept + away.attack - home.defense;
  const lh = Math.exp(logLh);
  const la = Math.exp(logLa);

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

  return {
    homeWinProb: Number(homeWin.toFixed(4)),
    drawProb: Number(draw.toFixed(4)),
    awayWinProb: Number(awayWin.toFixed(4)),
    expectedHomeGoals: Number(lh.toFixed(3)),
    expectedAwayGoals: Number(la.toFixed(3)),
    topScorelines: top3,
    pick,
    scoreMatrix: matrix,
  };
}
