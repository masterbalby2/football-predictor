import type { LeagueCode } from "@soccer/shared-types";
import { makeTeamId } from "./ids.js";

/**
 * Deterministic seeded RNG (mulberry32) so seed data is reproducible.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sample from Poisson(lambda) via Knuth. */
function poisson(rng: () => number, lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

interface SeedTeam {
  name: string;
  short: string;
  /** latent attack strength (higher = scores more) */
  atk: number;
  /** latent defense (higher = concedes less) */
  def: number;
}

const EPL_TEAMS: SeedTeam[] = [
  { name: "Arsenal", short: "ARS", atk: 1.5, def: 1.2 },
  { name: "Manchester City", short: "MCI", atk: 1.7, def: 1.1 },
  { name: "Liverpool", short: "LIV", atk: 1.6, def: 1.0 },
  { name: "Tottenham", short: "TOT", atk: 1.3, def: 0.8 },
  { name: "Chelsea", short: "CHE", atk: 1.3, def: 0.9 },
  { name: "Manchester United", short: "MUN", atk: 1.2, def: 0.8 },
  { name: "Newcastle United", short: "NEW", atk: 1.2, def: 0.9 },
  { name: "Aston Villa", short: "AVL", atk: 1.1, def: 0.8 },
  { name: "Brighton", short: "BHA", atk: 1.1, def: 0.7 },
  { name: "West Ham United", short: "WHU", atk: 1.0, def: 0.7 },
  { name: "Everton", short: "EVE", atk: 0.9, def: 0.8 },
  { name: "Fulham", short: "FUL", atk: 1.0, def: 0.7 },
  { name: "Crystal Palace", short: "CRY", atk: 0.9, def: 0.7 },
  { name: "Wolverhampton", short: "WOL", atk: 0.9, def: 0.6 },
  { name: "Bournemouth", short: "BOU", atk: 0.9, def: 0.6 },
  { name: "Brentford", short: "BRE", atk: 1.0, def: 0.6 },
  { name: "Nottingham Forest", short: "NOT", atk: 0.8, def: 0.6 },
  { name: "Luton Town", short: "LUT", atk: 0.7, def: 0.5 },
  { name: "Burnley", short: "BUR", atk: 0.7, def: 0.5 },
  { name: "Sheffield United", short: "SHU", atk: 0.6, def: 0.4 },
];

const LAL_TEAMS: SeedTeam[] = [
  { name: "Real Madrid", short: "RMA", atk: 1.7, def: 1.2 },
  { name: "Barcelona", short: "BAR", atk: 1.6, def: 1.0 },
  { name: "Atletico Madrid", short: "ATM", atk: 1.4, def: 1.2 },
  { name: "Athletic Bilbao", short: "ATH", atk: 1.2, def: 1.0 },
  { name: "Real Sociedad", short: "RSO", atk: 1.2, def: 0.9 },
  { name: "Real Betis", short: "BET", atk: 1.1, def: 0.8 },
  { name: "Villarreal", short: "VIL", atk: 1.2, def: 0.7 },
  { name: "Valencia", short: "VAL", atk: 1.0, def: 0.8 },
  { name: "Sevilla", short: "SEV", atk: 1.0, def: 0.8 },
  { name: "Getafe", short: "GET", atk: 0.9, def: 0.9 },
  { name: "Osasuna", short: "OSA", atk: 0.9, def: 0.8 },
  { name: "Celta Vigo", short: "CEL", atk: 1.0, def: 0.6 },
  { name: "Mallorca", short: "MLL", atk: 0.8, def: 0.8 },
  { name: "Rayo Vallecano", short: "RAY", atk: 0.9, def: 0.6 },
  { name: "Girona", short: "GIR", atk: 1.1, def: 0.7 },
  { name: "Alaves", short: "ALV", atk: 0.8, def: 0.7 },
  { name: "Las Palmas", short: "LAS", atk: 0.8, def: 0.7 },
  { name: "Cadiz", short: "CAD", atk: 0.7, def: 0.5 },
  { name: "Granada", short: "GRA", atk: 0.7, def: 0.5 },
  { name: "Almeria", short: "ALM", atk: 0.7, def: 0.4 },
];

const BUN_TEAMS: SeedTeam[] = [
  { name: "Bayern Munich", short: "BAY", atk: 1.9, def: 1.1 },
  { name: "Borussia Dortmund", short: "DOR", atk: 1.5, def: 0.9 },
  { name: "Bayer Leverkusen", short: "LEV", atk: 1.6, def: 1.1 },
  { name: "RB Leipzig", short: "RBL", atk: 1.5, def: 1.0 },
  { name: "VfB Stuttgart", short: "STU", atk: 1.4, def: 0.8 },
  { name: "Eintracht Frankfurt", short: "FRA", atk: 1.3, def: 0.8 },
  { name: "Wolfsburg", short: "WOL", atk: 1.1, def: 0.8 },
  { name: "Freiburg", short: "FRE", atk: 1.1, def: 0.9 },
  { name: "Hoffenheim", short: "HOF", atk: 1.2, def: 0.7 },
  { name: "Mainz 05", short: "MAI", atk: 0.9, def: 0.8 },
  { name: "Borussia M'gladbach", short: "MON", atk: 1.1, def: 0.6 },
  { name: "Werder Bremen", short: "WER", atk: 1.0, def: 0.7 },
  { name: "Augsburg", short: "AUG", atk: 1.0, def: 0.6 },
  { name: "Union Berlin", short: "UNB", atk: 0.9, def: 0.9 },
  { name: "VfL Bochum", short: "BOC", atk: 0.8, def: 0.5 },
  { name: "FC Koln", short: "KOL", atk: 0.9, def: 0.6 },
  { name: "Darmstadt 98", short: "DAR", atk: 0.7, def: 0.4 },
  { name: "Heidenheim", short: "HEI", atk: 0.9, def: 0.6 },
];

const TEAMS_BY_LEAGUE: Record<LeagueCode, SeedTeam[]> = {
  EPL: EPL_TEAMS,
  LAL: LAL_TEAMS,
  BUN: BUN_TEAMS,
};

export interface SeedMatch {
  id: string;
  leagueCode: LeagueCode;
  season: string;
  date: Date;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface SeedFixture {
  id: string;
  leagueCode: LeagueCode;
  season: string;
  date: Date;
  homeTeamId: string;
  awayTeamId: string;
}

export interface SeedData {
  teams: { id: string; leagueCode: LeagueCode; name: string; shortName: string }[];
  matches: SeedMatch[];
  fixtures: SeedFixture[];
}

/**
 * Generate deterministic seed data: ~1.5 seasons of results + upcoming
 * fixtures for the next ~10 days. Scorelines are sampled from a Poisson model
 * using the latent strengths so the Dixon-Coles fit recovers sensible params.
 */
export function generateSeedData(now: Date = new Date()): SeedData {
  const rng = mulberry32(20240115);
  const teams: SeedData["teams"] = [];
  const matches: SeedMatch[] = [];
  const fixtures: SeedFixture[] = [];

  const season = "2024";
  const homeAdv = 0.35;
  const baseRate = 1.35;

  for (const leagueCode of ["EPL", "LAL", "BUN"] as LeagueCode[]) {
    const leagueTeams = TEAMS_BY_LEAGUE[leagueCode];
    const tid = (name: string) => makeTeamId(leagueCode, name);
    const slug = (name: string) => tid(name).split(":")[1];
    for (const t of leagueTeams) {
      teams.push({ id: tid(t.name), leagueCode, name: t.name, shortName: t.short });
    }

    // Generate two half-seasons of round-robin-ish results (~14 matchdays).
    // Each matchday pairs teams; we run 14 rounds.
    const n = leagueTeams.length;
    const rounds = 16;
    // Start ~240 days ago, matches every ~3.5 days.
    const startOffsetDays = 240;
    for (let round = 0; round < rounds; round++) {
      // simple rotate pairing
      const pairings: [number, number][] = [];
      const used = new Set<number>();
      for (let i = 0; i < n; i++) {
        if (used.has(i)) continue;
        for (let j = i + 1; j < n; j++) {
          if (used.has(j)) continue;
          // alternate home/away by round parity for variety
          const home = round % 2 === 0 ? i : j;
          const away = round % 2 === 0 ? j : i;
          pairings.push([home, away]);
          used.add(i);
          used.add(j);
          break;
        }
      }
      const dayOffset = startOffsetDays - round * 4;
      const matchDate = new Date(now.getTime() - dayOffset * 86400_000);
      let slot = 0;
      for (const [hi, ai] of pairings) {
        const home = leagueTeams[hi];
        const away = leagueTeams[ai];
        const lamH = Math.max(
          0.25,
          baseRate + home.atk - away.def + homeAdv + (rng() - 0.5) * 0.3,
        );
        const lamA = Math.max(
          0.2,
          baseRate + away.atk - home.def - homeAdv * 0.4 + (rng() - 0.5) * 0.3,
        );
        const hg = Math.min(6, poisson(rng, lamH));
        const ag = Math.min(6, poisson(rng, lamA));
        const id = `${leagueCode}:${season}:R${round}:${slug(home.name)}-${slug(away.name)}`;
        const date = new Date(matchDate.getTime() + slot * 3600_000);
        matches.push({
          id,
          leagueCode,
          season,
          date,
          homeTeamId: tid(home.name),
          awayTeamId: tid(away.name),
          homeGoals: hg,
          awayGoals: ag,
        });
        slot++;
      }
    }

    // Upcoming fixtures: next 10 days, one matchday per league.
    const upcomingDay = 3;
    const baseDate = new Date(now.getTime() + upcomingDay * 86400_000);
    const used = new Set<number>();
    let slot = 0;
    for (let i = 0; i < n; i++) {
      if (used.has(i)) continue;
      for (let j = i + 1; j < n; j++) {
        if (used.has(j)) continue;
        const home = leagueTeams[i];
        const away = leagueTeams[j];
        const id = `${leagueCode}:${season}:UP:${slug(home.name)}-${slug(away.name)}`;
        const date = new Date(baseDate.getTime() + slot * 6 * 3600_000);
        fixtures.push({
          id,
          leagueCode,
          season,
          date,
          homeTeamId: tid(home.name),
          awayTeamId: tid(away.name),
        });
        used.add(i);
        used.add(j);
        slot++;
        break;
      }
    }
    // a second matchday a few days later for a fuller dashboard
    const baseDate2 = new Date(now.getTime() + 8 * 86400_000);
    const used2 = new Set<number>();
    let slot2 = 0;
    for (let i = n - 1; i > 0; i--) {
      if (used2.has(i)) continue;
      for (let j = i - 1; j >= 0; j--) {
        if (used2.has(j)) continue;
        const home = leagueTeams[j];
        const away = leagueTeams[i];
        const id = `${leagueCode}:${season}:UP2:${slug(home.name)}-${slug(away.name)}`;
        const date = new Date(baseDate2.getTime() + slot2 * 6 * 3600_000);
        fixtures.push({
          id,
          leagueCode,
          season,
          date,
          homeTeamId: tid(home.name),
          awayTeamId: tid(away.name),
        });
        used2.add(i);
        used2.add(j);
        slot2++;
        break;
      }
    }
  }

  return { teams, matches, fixtures };
}
