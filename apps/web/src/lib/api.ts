import {
  type FixtureWithPrediction,
  type Fixture,
  type Prediction,
  type Team,
  type TeamDetail,
  type League,
  LeagueCodeSchema,
  type AccuracyPoint,
  type ModelRun,
} from "@soccer/shared-types";

const BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchApi<T>(path: string, revalidate = 60): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) {
    throw new Error(`API ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function getLeagues(): Promise<League[]> {
  return fetchApi<League[]>("/leagues");
}

export async function getFixtures(
  leagueCode?: string,
  limit = 100,
): Promise<FixtureWithPrediction[]> {
  const q = leagueCode ? `?league=${leagueCode}&limit=${limit}` : `?limit=${limit}`;
  return fetchApi<FixtureWithPrediction[]>(`/fixtures${q}`);
}

export async function getFixture(
  id: string,
): Promise<FixtureWithPrediction> {
  return fetchApi<FixtureWithPrediction>(`/fixtures/${id}`);
}

export async function getTeams(leagueCode?: string): Promise<Team[]> {
  const q = leagueCode ? `?league=${leagueCode}` : "";
  return fetchApi<Team[]>(`/teams${q}`);
}

export async function getTeamDetail(id: string): Promise<TeamDetail> {
  return fetchApi<TeamDetail>(`/teams/${id}`);
}

export async function getAccuracy(): Promise<{
  latestRun: ModelRun | null;
  history: AccuracyPoint[];
}> {
  return fetchApi(`/accuracy`);
}

export type {
  FixtureWithPrediction,
  Fixture,
  Prediction,
  Team,
  TeamDetail,
  League,
  AccuracyPoint,
  ModelRun,
};

export { LeagueCodeSchema };
