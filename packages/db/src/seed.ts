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

    // Generate a full round-robin schedule using the circle method, then
    // run it twice (home/away reversed on the second pass) for a double
    // round-robin — mirroring real league structure.
    const n = leagueTeams.length;
    const singleRound = n - 1; // rounds needed for one RR pass
    const rounds = singleRound * 2; // double round-robin
    // Start ~260 days ago, matches every ~3.5 days.
    const startOffsetDays = 260;

    // Circle-method rotation: fix team 0, rotate the rest.
    // Returns pairings for a single round.
    function circlePairings(round: number): [number, number][] {
      const order = Array.from({ length: n }, (_, i) => i);
      // Rotate: fix index 0, shift the rest left by `round` positions.
      const fixed = order[0];
      const rest = order.slice(1);
      const rotated = [fixed, ...rest.slice(round % (n - 1)), ...rest.slice(0, round % (n - 1))];
      const pairs: [number, number][] = [];
      for (let i = 0; i < n / 2; i++) {
        const a = rotated[i];
        const b = rotated[n - 1 - i];
        // On the second half (reverse fixtures), swap home/away.
        if (round >= singleRound) {
          pairs.push([b, a]);
        } else {
          pairs.push([a, b]);
        }
      }
      return pairs;
    }

    for (let round = 0; round < rounds; round++) {
      const pairings = circlePairings(round);
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

    // Upcoming fixtures: next 10 days, two matchdays using the next
    // round-robin rounds (continuing from where the finished matches left off).
    const upcomingDay = 3;
    const baseDate = new Date(now.getTime() + upcomingDay * 86400_000);
    const upRound1 = rounds; // next round after finished matches
    const upRound2 = rounds + 1;
    let slot = 0;
    for (const [hi, ai] of circlePairings(upRound1)) {
      const home = leagueTeams[hi];
      const away = leagueTeams[ai];
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
      slot++;
    }
    // a second matchday a few days later for a fuller dashboard
    const baseDate2 = new Date(now.getTime() + 8 * 86400_000);
    let slot2 = 0;
    for (const [hi, ai] of circlePairings(upRound2)) {
      const home = leagueTeams[hi];
      const away = leagueTeams[ai];
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
      slot2++;
    }
  }

  return { teams, matches, fixtures };
}
