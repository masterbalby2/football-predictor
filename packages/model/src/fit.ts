import type { LeagueCode } from "@soccer/shared-types";
import type { FitOptions, FitResult, MatchInput, TeamParam } from "./types.js";

/**
 * Dixon-Coles low-score correction (draw-boosting form).
 * Boosts 0-0 / 1-1, depresses 0-1 / 1-0.
 */
export function tau(x: number, y: number, delta: number): number {
  if (x === 0 && y === 0) return 1 + delta;
  if (x === 0 && y === 1) return 1 - delta;
  if (x === 1 && y === 0) return 1 - delta;
  if (x === 1 && y === 1) return 1 + delta;
  return 1;
}

/** Time-decay weight: more recent matches weigh more. */
export function timeWeight(
  matchDate: Date,
  now: Date,
  halfLifeDays: number,
): number {
  const days = (now.getTime() - matchDate.getTime()) / 86_400_000;
  if (days < 0) return 0; // future matches shouldn't contribute
  return Math.exp(-(Math.LN2 * days) / halfLifeDays);
}

function logFactorial(n: number): number {
  // precomputed up to a reasonable max; for n>15 use lgamma
  if (n <= 1) return 0;
  let s = 0;
  for (let k = 2; k <= n; k++) s += Math.log(k);
  return s;
}

/**
 * Fit a Dixon-Coles model for a single league via gradient ascent (Adam)
 * on the time-decayed weighted log-likelihood with L2 ridge regularization.
 *
 * Parameterization (higher = better for both attack and defense):
 *   log(lambda_home) = intercept + attack[home] - defense[away] + homeAdv
 *   log(lambda_away) = intercept + attack[away] - defense[home]
 *
 * Identifiability: attack and defense are mean-centered each step.
 */
export function fitModel(
  leagueCode: LeagueCode,
  matches: MatchInput[],
  options: FitOptions,
): FitResult | null {
  if (matches.length < options.minMatches) return null;

  const now = (options.now ?? new Date()).getTime();
  const lr = options.learningRate ?? 0.02;
  const iters = options.iterations ?? 4000;
  const ridge = options.ridgeLambda;
  const halfLife = options.halfLifeDays;
  const delta = options.delta;

  // Index teams.
  const teamIds: string[] = [];
  const teamIndex = new Map<string, number>();
  for (const m of matches) {
    for (const id of [m.homeTeamId, m.awayTeamId]) {
      if (!teamIndex.has(id)) {
        teamIndex.set(id, teamIds.length);
        teamIds.push(id);
      }
    }
  }
  const nTeams = teamIds.length;

  // Precompute per-match data.
  interface MatchRow {
    hi: number;
    ai: number;
    x: number;
    y: number;
    w: number;
    logTau: number;
  }
  const rows: MatchRow[] = [];
  for (const m of matches) {
    const hi = teamIndex.get(m.homeTeamId);
    const ai = teamIndex.get(m.awayTeamId);
    if (hi == null || ai == null) continue;
    const d = new Date(m.date);
    const w = timeWeight(d, new Date(now), halfLife);
    if (w <= 0) continue;
    rows.push({
      hi,
      ai,
      x: m.homeGoals,
      y: m.awayGoals,
      w,
      logTau: Math.log(tau(m.homeGoals, m.awayGoals, delta)),
    });
  }
  if (rows.length < options.minMatches) return null;

  // Data-driven initialization: start intercept at log(mean goals) and
  // homeAdv at log(mean home goals / mean away goals). This speeds up
  // convergence significantly vs. arbitrary constants.
  let totalHomeGoals = 0;
  let totalAwayGoals = 0;
  let totalWeight = 0;
  for (const r of rows) {
    totalHomeGoals += r.w * r.x;
    totalAwayGoals += r.w * r.y;
    totalWeight += r.w;
  }
  const meanHome = totalHomeGoals / totalWeight;
  const meanAway = totalAwayGoals / totalWeight;
  const meanAll = (meanHome + meanAway) / 2;

  // Parameters.
  let intercept = Math.log(Math.max(meanAll, 0.1));
  let homeAdv = Math.log(Math.max(meanHome, 0.05)) - Math.log(Math.max(meanAway, 0.05));
  const attack = new Float64Array(nTeams);
  const defense = new Float64Array(nTeams);

  // Adam state.
  const mInt = { m: 0, v: 0 };
  const mAdv = { m: 0, v: 0 };
  const aAdam = Array.from({ length: nTeams }, () => ({ m: 0, v: 0 }));
  const dAdam = Array.from({ length: nTeams }, () => ({ m: 0, v: 0 }));
  const beta1 = 0.9;
  const beta2 = 0.999;
  const eps = 1e-8;

  let logLik = 0;

  for (let iter = 1; iter <= iters; iter++) {
    // Learning rate decay: linearly decay to 10% of initial by the last iter.
    const lrDecay = 1 - 0.9 * ((iter - 1) / iters);
    const lrIter = lr * lrDecay;

    let gInt = 0;
    let gAdv = 0;
    const gAtk = new Float64Array(nTeams);
    const gDef = new Float64Array(nTeams);
    logLik = 0;

    for (const r of rows) {
      const lh = Math.exp(intercept + attack[r.hi] - defense[r.ai] + homeAdv);
      const la = Math.exp(intercept + attack[r.ai] - defense[r.hi]);
      // log-likelihood contribution
      logLik +=
        r.w *
        (r.logTau +
          r.x * Math.log(lh) -
          lh -
          logFactorial(r.x) +
          r.y * Math.log(la) -
          la -
          logFactorial(r.y));
      // gradients
      const dh = r.x - lh; // d/d(intercept or homeAdv or attack[home]) of home part
      const da = r.y - la;
      gInt += r.w * (dh + da);
      gAdv += r.w * dh; // homeAdv only affects home lambda
      gAtk[r.hi] += r.w * dh;
      gAtk[r.ai] += r.w * da;
      // defense enters with minus sign: d/d defense[away] of lh = -lh, so grad = -(x - lh) = lh - x
      gDef[r.ai] += r.w * (lh - r.x);
      gDef[r.hi] += r.w * (la - r.y);
    }

    // Ridge (centered params are already near 0; light penalty).
    gInt -= ridge * intercept;
    gAdv -= ridge * homeAdv;
    for (let i = 0; i < nTeams; i++) {
      gAtk[i] -= ridge * attack[i];
      gDef[i] -= ridge * defense[i];
    }

    // Adam update (with decayed learning rate).
    const t = iter;
    // intercept
    mInt.m = beta1 * mInt.m + (1 - beta1) * gInt;
    mInt.v = beta2 * mInt.v + (1 - beta2) * gInt * gInt;
    intercept += (lrIter * (mInt.m / (1 - Math.pow(beta1, t)))) /
      (Math.sqrt(mInt.v / (1 - Math.pow(beta2, t))) + eps);
    // homeAdv
    mAdv.m = beta1 * mAdv.m + (1 - beta1) * gAdv;
    mAdv.v = beta2 * mAdv.v + (1 - beta2) * gAdv * gAdv;
    homeAdv += (lrIter * (mAdv.m / (1 - Math.pow(beta1, t)))) /
      (Math.sqrt(mAdv.v / (1 - Math.pow(beta2, t))) + eps);
    // attack / defense
    for (let i = 0; i < nTeams; i++) {
      const aA = aAdam[i];
      aA.m = beta1 * aA.m + (1 - beta1) * gAtk[i];
      aA.v = beta2 * aA.v + (1 - beta2) * gAtk[i] * gAtk[i];
      attack[i] += (lrIter * (aA.m / (1 - Math.pow(beta1, t)))) /
        (Math.sqrt(aA.v / (1 - Math.pow(beta2, t))) + eps);
      const dA = dAdam[i];
      dA.m = beta1 * dA.m + (1 - beta1) * gDef[i];
      dA.v = beta2 * dA.v + (1 - beta2) * gDef[i] * gDef[i];
      defense[i] += (lrIter * (dA.m / (1 - Math.pow(beta1, t)))) /
        (Math.sqrt(dA.v / (1 - Math.pow(beta2, t))) + eps);
    }

    // Center attack & defense for identifiability.
    let aMean = 0;
    let dMean = 0;
    for (let i = 0; i < nTeams; i++) {
      aMean += attack[i];
      dMean += defense[i];
    }
    aMean /= nTeams;
    dMean /= nTeams;
    for (let i = 0; i < nTeams; i++) {
      attack[i] -= aMean;
      defense[i] -= dMean;
    }
  }

  const teams: TeamParam[] = teamIds.map((id, i) => ({
    teamId: id,
    attack: Number(attack[i].toFixed(4)),
    defense: Number(defense[i].toFixed(4)),
  }));

  return {
    leagueCode,
    intercept,
    homeAdvantage: homeAdv,
    teams,
    matchCount: rows.length,
    logLikelihood: logLik,
  };
}
