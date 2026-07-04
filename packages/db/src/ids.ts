import type { LeagueCode } from "@soccer/shared-types";

/**
 * Deterministic team id derived from league code + team name slug.
 * Used by both the seed generator and the football-data.org scraper so a
 * given team always maps to the same id within a dataset.
 *
 *   makeTeamId("EPL", "Arsenal")          -> "EPL:arsenal"
 *   makeTeamId("BUN", "FC Bayern München") -> "BUN:fc-bayern-munchen"
 */
export function makeTeamId(leagueCode: LeagueCode, name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${leagueCode}:${slug}`;
}

/** Short display slug (uppercased) for a team name, e.g. "Arsenal" -> "ARS". */
export function shortSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
  // take first 3 chars for a TLA-like short name
  return slug.slice(0, 3).toUpperCase();
}
