import type { LeagueCode } from "@soccer/shared-types";

export function leagueLabel(code: string): string {
  switch (code) {
    case "EPL":
      return "Premier League";
    case "LAL":
      return "La Liga";
    case "BUN":
      return "Bundesliga";
    case "FL1":
      return "Ligue1";      
    case "CL":
      return "UEFA";
    case "DED":
      return "eridivisie";
    case "PPL":
      return "primeira";
    case "SA":
      return "seriea";      
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
    case "fl1":
    case "ligue1":
    case "france":
    case "fl1":
      return "FL1";  
    case "fl1":
    case "ligue1":
    case "france":
    case "fl1":
      return "FL1";  
    case "cl":
    case "UEFA":
    case "UEFA":
    case "cl":
      return "CL";  
    case "ded":
    case "eridivisie":
    case "pays-bas":
    case "ded":
      return "DED";  
    case "ppl":
    case "primeira":
    case "portugal":
    case "ppl":
      return "PPL";        
    default:
      return null;
  }
}
