import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Leagues + teams                                                     */
/* ------------------------------------------------------------------ */

export const LeagueCodeSchema = z.enum(["EPL", "LAL", "BUN", "FL1"]);
export type LeagueCode = z.infer<typeof LeagueCodeSchema>;

export const LeagueSchema = z.object({
  id: z.string(),
  code: LeagueCodeSchema,
  name: z.string(),
  country: z.string(),
});
export type League = z.infer<typeof LeagueSchema>;

export const TeamSchema = z.object({
  id: z.string(),
  leagueId: z.string(),
  leagueCode: LeagueCodeSchema,
  name: z.string(),
  shortName: z.string().nullable(),
});
export type Team = z.infer<typeof TeamSchema>;

/* ------------------------------------------------------------------ */
/* Matches (finished) + fixtures (upcoming)                            */
/* ------------------------------------------------------------------ */

export const MatchStatusSchema = z.enum(["FINISHED", "SCHEDULED", "POSTPONED"]);
export type MatchStatus = z.infer<typeof MatchStatusSchema>;

export const MatchSchema = z.object({
  id: z.string(),
  leagueCode: LeagueCodeSchema,
  season: z.string(),
  date: z.string(), // ISO
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  homeGoals: z.number().int().nullable(),
  awayGoals: z.number().int().nullable(),
  status: MatchStatusSchema,
});
export type Match = z.infer<typeof MatchSchema>;

export const FixtureSchema = z.object({
  id: z.string(),
  leagueCode: LeagueCodeSchema,
  season: z.string(),
  date: z.string(), // ISO kickoff
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  homeTeam: TeamSchema,
  awayTeam: TeamSchema,
  status: MatchStatusSchema,
});
export type Fixture = z.infer<typeof FixtureSchema>;

/* ------------------------------------------------------------------ */
/* Model outputs                                                       */
/* ------------------------------------------------------------------ */

export const TeamStrengthSchema = z.object({
  teamId: z.string(),
  attack: z.number(),
  defense: z.number(),
  leagueCode: LeagueCodeSchema,
  modelRunId: z.string(),
});
export type TeamStrength = z.infer<typeof TeamStrengthSchema>;

export const ScorelineSchema = z.object({
  home: z.number().int(),
  away: z.number().int(),
  probability: z.number(),
});
export type Scoreline = z.infer<typeof ScorelineSchema>;

export const PredictionSchema = z.object({
  id: z.string(),
  fixtureId: z.string(),
  modelRunId: z.string(),
  homeWinProb: z.number(),
  drawProb: z.number(),
  awayWinProb: z.number(),
  expectedHomeGoals: z.number(),
  expectedAwayGoals: z.number(),
  topScorelines: z.array(ScorelineSchema).max(3),
  // Most likely outcome label
  pick: z.enum(["HOME", "DRAW", "AWAY"]),
  // Confidence in the pick: margin between top prob and runner-up [0, 1].
  confidence: z.number().default(0),
  // Human-readable suggestion, e.g. "Strong Home Win", "Value Draw".
  tip: z.string().default(""),
  createdAt: z.string(),
});
export type Prediction = z.infer<typeof PredictionSchema>;

/* ------------------------------------------------------------------ */
/* Model run + accuracy                                                */
/* ------------------------------------------------------------------ */

export const ModelRunSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  leagues: z.array(LeagueCodeSchema),
  matchCount: z.number().int(),
});
export type ModelRun = z.infer<typeof ModelRunSchema>;

export const AccuracyPointSchema = z.object({
  date: z.string(),
  leagueCode: LeagueCodeSchema,
  total: z.number().int(),
  correct: z.number().int(),
  accuracy: z.number(),
  brierScore: z.number().default(0),
  logLoss: z.number().default(0),
});
export type AccuracyPoint = z.infer<typeof AccuracyPointSchema>;

/* ------------------------------------------------------------------ */
/* API responses                                                       */
/* ------------------------------------------------------------------ */

export const FixtureWithPredictionSchema = z.object({
  fixture: FixtureSchema,
  prediction: PredictionSchema.nullable(),
});
export type FixtureWithPrediction = z.infer<typeof FixtureWithPredictionSchema>;

export const TeamDetailSchema = z.object({
  team: TeamSchema,
  strength: TeamStrengthSchema.nullable(),
  recentForm: z.array(
    z.object({
      date: z.string(),
      opponentId: z.string(),
      opponentName: z.string(),
      home: z.boolean(),
      goalsFor: z.number().int(),
      goalsAgainst: z.number().int(),
      result: z.enum(["W", "D", "L"]),
    }),
  ),
});
export type TeamDetail = z.infer<typeof TeamDetailSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
