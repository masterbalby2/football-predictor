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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
        // Rate limit: free tier allows 10 requests/minute.
        // Add a 7-second delay between requests to stay under the limit.
        await sleep(7000);
        const res = await this.client.get<T>(path);
        return res.data;
      },
      {
        retries: 4,
        onFailedAttempt: (err) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 401 || status === 403) {
            throw new Error(`Aborting retries: HTTP ${status}`);
          }
          // On 429 (rate limit), wait longer before retrying.
          if (status === 429) {
            console.warn("  Rate limited (429) — waiting 60s before retry...");
          }
        },
        minTimeout: 65000,
        maxTimeout: 120000,
      },
    );
  }

  /**
   * The football-data.org API defaults to the "current" season which may not
   * have started yet. We fetch from the most recent completed season (2024)
   * for finished matches, and also try the current season for scheduled
   * fixtures that haven't been played yet.
   */
  private readonly dataSeason = "2024";

  async fetchTeams(leagueCode: LeagueCode, season?: string): Promise<ProviderTeam[]> {
    const fdCode = LEAGUES.find((l) => l.code === leagueCode)?.fdCode;
    if (!fdCode) return [];
    const seasonParam = season ?? this.dataSeason;
    const data = await this.get<{ teams: FdTeam[] }>(
      `/competitions/${fdCode}/teams?season=${seasonParam}`,
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
      `/competitions/${fdCode}/matches?status=FINISHED&season=${this.dataSeason}`,
    );
    const season = data.season?.startDate?.slice(0, 4) ?? this.dataSeason;
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

    // Try the data season first (may have upcoming fixtures if season is ongoing).
    const data = await this.get<{ matches: FdMatch[]; season?: { startDate?: string } }>(
      `/competitions/${fdCode}/matches?status=SCHEDULED&season=${this.dataSeason}`,
    );
    let fixtures = (data.matches ?? []).map((m) => ({
      id: `fd:${m.id}`,
      leagueCode,
      season: data.season?.startDate?.slice(0, 4) ?? this.dataSeason,
      date: new Date(m.utcDate),
      homeTeamId: makeTeamId(leagueCode, m.homeTeam.name),
      awayTeamId: makeTeamId(leagueCode, m.awayTeam.name),
      status: "SCHEDULED" as const,
    }));

    // If no scheduled fixtures in the data season, try the default (current) season.
    // The API defaults to the latest season which may have upcoming fixtures.
    if (fixtures.length === 0) {
      try {
        const currentData = await this.get<{ matches: FdMatch[]; season?: { startDate?: string } }>(
          `/competitions/${fdCode}/matches?status=SCHEDULED`,
        );
        const currentSeason = currentData.season?.startDate?.slice(0, 4) ?? "2026";
        fixtures = (currentData.matches ?? []).map((m) => ({
          id: `fd:${m.id}`,
          leagueCode,
          season: currentSeason,
          date: new Date(m.utcDate),
          homeTeamId: makeTeamId(leagueCode, m.homeTeam.name),
          awayTeamId: makeTeamId(leagueCode, m.awayTeam.name),
          status: "SCHEDULED" as const,
        }));
      } catch {
        // If the current season fetch fails, just return whatever we have.
      }
    }

    return fixtures;
  }
}

export { FD_LEAGUE_CODE };
