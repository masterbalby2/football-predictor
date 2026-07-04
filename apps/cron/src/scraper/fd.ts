import axios, { type AxiosInstance } from "axios";
import pRetry from "p-retry";
import { LEAGUES, type Env } from "@soccer/config";
import { makeTeamId, shortSlug } from "@soccer/db";
import type { LeagueCode } from "@soccer/shared-types";
import type {
  FootballDataProvider,
  ProviderFixture,
  ProviderMatch,
  ProviderTeam,
} from "./types.js";

const FD_LEAGUE_CODE = new Map<string, LeagueCode>(
  LEAGUES.map((l) => [l.fdCode, l.code]),
);

interface FdTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
}

interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number;
  season?: { startDate?: string };
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score?: { fullTime?: { home: number | null; away: number | null } };
}

/**
 * football-data.org v4 provider. Uses axios + p-retry for resilient fetching.
 * Free tier: 10 requests/minute. Requires an API token.
 */
export class FootballDataScraper implements FootballDataProvider {
  private client: AxiosInstance;
  private token: string;

  constructor(env: Env) {
    // Prefer FOOTBALL_DATA_API_KEY (spec naming), fall back to TOKEN.
    this.token = env.FOOTBALL_DATA_API_KEY || env.FOOTBALL_DATA_API_TOKEN;
    this.client = axios.create({
      baseURL: env.FOOTBALL_DATA_BASE_URL,
      timeout: 15000,
      headers: {
        "X-Auth-Token": this.token,
        Accept: "application/json",
      },
    });
  }

  available(): boolean {
    return Boolean(this.token);
  }

  private async get<T>(path: string): Promise<T> {
    return pRetry(
      async () => {
        const res = await this.client.get<T>(path);
        return res.data;
      },
      {
        retries: 4,
        onFailedAttempt: (err) => {
          // Stop retrying on rate limit (429) or auth errors.
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 429 || status === 401 || status === 403) {
            throw new Error(`Aborting retries: HTTP ${status}`);
          }
        },
        minTimeout: 1500,
        maxTimeout: 8000,
      },
    );
  }

  async fetchTeams(leagueCode: LeagueCode): Promise<ProviderTeam[]> {
    const fdCode = LEAGUES.find((l) => l.code === leagueCode)?.fdCode;
    if (!fdCode) return [];
    const data = await this.get<{ teams: FdTeam[] }>(
      `/competitions/${fdCode}/teams`,
    );
    return (data.teams ?? []).map((t) => ({
      id: makeTeamId(leagueCode, t.name),
      leagueCode,
      name: t.name,
      shortName: t.shortName ?? t.tla ?? shortSlug(t.name),
      externalId: t.id,
    }));
  }

  async fetchFinishedMatches(leagueCode: LeagueCode): Promise<ProviderMatch[]> {
    const fdCode = LEAGUES.find((l) => l.code === leagueCode)?.fdCode;
    if (!fdCode) return [];
    const data = await this.get<{ matches: FdMatch[]; season?: { startDate?: string } }>(
      `/competitions/${fdCode}/matches?status=FINISHED`,
    );
    const season = data.season?.startDate?.slice(0, 4) ?? "2024";
    return (data.matches ?? []).map((m) => ({
      id: `fd:${m.id}`,
      leagueCode,
      season,
      date: new Date(m.utcDate),
      homeTeamId: makeTeamId(leagueCode, m.homeTeam.name),
      awayTeamId: makeTeamId(leagueCode, m.awayTeam.name),
      homeGoals: m.score?.fullTime?.home ?? null,
      awayGoals: m.score?.fullTime?.away ?? null,
      status: "FINISHED" as const,
    }));
  }

  async fetchScheduledFixtures(
    leagueCode: LeagueCode,
  ): Promise<ProviderFixture[]> {
    const fdCode = LEAGUES.find((l) => l.code === leagueCode)?.fdCode;
    if (!fdCode) return [];
    const data = await this.get<{ matches: FdMatch[]; season?: { startDate?: string } }>(
      `/competitions/${fdCode}/matches?status=SCHEDULED`,
    );
    const season = data.season?.startDate?.slice(0, 4) ?? "2024";
    return (data.matches ?? []).map((m) => ({
      id: `fd:${m.id}`,
      leagueCode,
      season,
      date: new Date(m.utcDate),
      homeTeamId: makeTeamId(leagueCode, m.homeTeam.name),
      awayTeamId: makeTeamId(leagueCode, m.awayTeam.name),
      status: "SCHEDULED" as const,
    }));
  }
}

export { FD_LEAGUE_CODE };
