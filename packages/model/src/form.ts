/**
 * Recent-form adjustment for the Dixon-Coles model.
 *
 * The fitted model captures season-long attack/defense strength, but short-term
 * form (injuries, morale, tactical shifts) can move a team's actual scoring rate
 * away from its season average. We compute a multiplicative "form factor" from
 * the most recent N matches and blend it into the predicted lambda.
 *
 * formFactor = (recent goals scored per game) / (league average goals scored per game)
 *   - 1.0  => scoring at the league-average rate (no adjustment)
 *   - >1.0 => scoring above average (good attacking form)
 *   - <1.0 => scoring below average (poor form)
 *
 * The factor is clamped to [0.4, 2.0] to avoid a single hot/cold streak
 * overwhelming the model.
 */

export interface FormMatch {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  date: string | Date;
}

export interface FormFactorInput {
  teamId: string;
  matches: FormMatch[];
  /** Number of most-recent matches to consider. */
  recentN: number;
  /** League-average goals scored per game by a single team. */
  leagueAvgGoalsFor: number;
}

export const FORM_FACTOR_MIN = 0.4;
export const FORM_FACTOR_MAX = 2.0;

export function computeFormFactor(input: FormFactorInput): number {
  const { teamId, matches, recentN, leagueAvgGoalsFor } = input;
  if (recentN <= 0 || leagueAvgGoalsFor <= 0) return 1;

  const recent = matches
    .filter(
      (m) =>
        (m.homeTeamId === teamId || m.awayTeamId === teamId) &&
        m.homeGoals != null &&
        m.awayGoals != null,
    )
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    .slice(0, recentN);

  if (recent.length === 0) return 1;

  let scored = 0;
  for (const m of recent) {
    const isHome = m.homeTeamId === teamId;
    scored += isHome ? m.homeGoals : m.awayGoals;
  }

  const recentAvg = scored / recent.length;
  const factor = recentAvg / leagueAvgGoalsFor;
  return clamp(factor, FORM_FACTOR_MIN, FORM_FACTOR_MAX);
}

/**
 * Defensive form factor: how many goals a team has been *conceding* recently
 * relative to the league average. Used to adjust the opponent's lambda.
 *
 * defFactor = (recent goals conceded per game) / (league average goals conceded per game)
 *   - 1.0  => conceding at league-average rate
 *   - >1.0 => leaking more than average (poor defensive form) — opponent lambda goes up
 *   - <1.0 => conceding less than average (good defensive form) — opponent lambda goes down
 */
export function computeDefensiveFormFactor(input: FormFactorInput): number {
  const { teamId, matches, recentN, leagueAvgGoalsFor } = input;
  if (recentN <= 0 || leagueAvgGoalsFor <= 0) return 1;

  const recent = matches
    .filter(
      (m) =>
        (m.homeTeamId === teamId || m.awayTeamId === teamId) &&
        m.homeGoals != null &&
        m.awayGoals != null,
    )
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    .slice(0, recentN);

  if (recent.length === 0) return 1;

  let conceded = 0;
  for (const m of recent) {
    const isHome = m.homeTeamId === teamId;
    conceded += isHome ? m.awayGoals : m.homeGoals;
  }

  const recentAvg = conceded / recent.length;
  const factor = recentAvg / leagueAvgGoalsFor;
  return clamp(factor, FORM_FACTOR_MIN, FORM_FACTOR_MAX);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
