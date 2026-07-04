import type { LeagueCode, Scoreline } from "@soccer/shared-types";

export interface MatchInput {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  /** ISO date string or Date — when the match was played (for time decay). */
  date: string | Date;
}

export interface FitOptions {
  halfLifeDays: number;
  ridgeLambda: number;
  /** Dixon-Coles low-score correction strength. */
  delta: number;
  /** Max goals considered in the scoreline grid. */
  maxGoals: number;
  /** Minimum matches required to fit (otherwise returns null). */
  minMatches: number;
  /** Reference "now" for time decay (defaults to current time). */
  now?: Date;
  /** Optimizer iterations. */
  iterations?: number;
  /** Optimizer learning rate. */
  learningRate?: number;
}

export interface TeamParam {
  teamId: string;
  attack: number;
  defense: number;
}

export interface FitResult {
  leagueCode: LeagueCode;
  intercept: number;
  homeAdvantage: number;
  teams: TeamParam[];
  matchCount: number;
  logLikelihood: number;
}

export interface PredictionResult {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  topScorelines: Scoreline[];
  pick: "HOME" | "DRAW" | "AWAY";
  /** Full P(home=x, away=y) grid, indexed [x][y]. */
  scoreMatrix: number[][];
}

export const DEFAULT_FIT_OPTIONS: FitOptions = {
  halfLifeDays: 365,
  ridgeLambda: 0,
  delta: 0.15,
  maxGoals: 10,
  minMatches: 20,
  iterations: 4000,
  learningRate: 0.02,
};
