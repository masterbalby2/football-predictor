import type { LeagueCode } from "@soccer/shared-types";

export interface ProviderTeam {
  /** Stable id we generate, e.g. "EPL:ARS". */
  id: string;
  leagueCode: LeagueCode;
  name: string;
  shortName: string | null;
  /** Provider-specific id (football-data.org team id). */
  externalId?: number;
}

export interface ProviderMatch {
  id: string;
  leagueCode: LeagueCode;
  season: string;
  date: Date;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: "FINISHED" | "SCHEDULED" | "POSTPONED";
}

export interface ProviderFixture {
  id: string;
  leagueCode: LeagueCode;
  season: string;
  date: Date;
  homeTeamId: string;
  awayTeamId: string;
  status: "FINISHED" | "SCHEDULED" | "POSTPONED";
}

export interface FootballDataProvider {
  /** Whether the provider is configured (has credentials etc.). */
  available(): boolean;
  fetchTeams(leagueCode: LeagueCode): Promise<ProviderTeam[]>;
  fetchFinishedMatches(leagueCode: LeagueCode): Promise<ProviderMatch[]>;
  fetchScheduledFixtures(leagueCode: LeagueCode): Promise<ProviderFixture[]>;
}
