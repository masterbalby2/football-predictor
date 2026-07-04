import type { LeagueCode } from "@soccer/shared-types";

export function leagueLabel(code: string): string {
  switch (code) {
    case "EPL":
      return "Premier League";
    case "LAL":
      return "La Liga";
    case "BUN":
      return "Bundesliga";
    default:
      return code;
  }
}

/**
 * Resolve a user-provided league argument to a canonical LeagueCode.
 * Accepts: epl, laliga, la liga, bundesliga, PL, PD, BL1, and the codes
 * themselves (case-insensitive). Returns null if no match.
 */
export function resolveLeagueCode(input: string): LeagueCode | null {
  const norm = input.trim().toLowerCase().replace(/[\s_-]+/g, "");
  switch (norm) {
    case "epl":
    case "pl":
    case "premierleague":
    case "england":
      return "EPL";
    case "lal":
    case "laliga":
    case "spain":
    case "pd":
      return "LAL";
    case "bun":
    case "bundesliga":
    case "germany":
    case "bl1":
      return "BUN";
    default:
      return null;
  }
}
