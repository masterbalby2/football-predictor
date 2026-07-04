import * as cheerio from "cheerio";
import type { ProviderMatch } from "./types.js";

/**
 * HTML table parser utility (cheerio). Used to parse results tables from
 * HTML sources (e.g. FBref) into match rows. Provided so an FBref provider
 * can be added without changing the model/API layers. The football-data.org
 * provider returns JSON, so this is kept as a ready-to-use helper.
 *
 * Expected table structure (FBref-style scores & fixtures):
 *   <table>
 *     <tbody>
 *       <tr>
 *         <td data-stat="date">2024-08-16</td>
 *         <td data-stat="home_team">Arsenal</td>
 *         <td data-stat="score">2-1</td>
 *         <td data-stat="away_team">Wolves</td>
 *       </tr>
 *     </tbody>
 *   </table>
 */
export function parseResultsHtml(
  html: string,
  leagueCode: ProviderMatch["leagueCode"],
  season: string,
  idPrefix: string,
  teamIdResolver: (name: string) => string | undefined,
): ProviderMatch[] {
  const $ = cheerio.load(html);
  const out: ProviderMatch[] = [];
  $("table tbody tr").each((_, el) => {
    const row = $(el);
    const dateText = row.find('td[data-stat="date"]').text().trim();
    const home = row.find('td[data-stat="home_team"]').text().trim();
    const away = row.find('td[data-stat="away_team"]').text().trim();
    const score = row.find('td[data-stat="score"]').text().trim();
    if (!dateText || !home || !away) return;
    const homeId = teamIdResolver(home);
    const awayId = teamIdResolver(away);
    if (!homeId || !awayId) return;
    const date = new Date(dateText);
    if (Number.isNaN(date.getTime())) return;
    let hg: number | null = null;
    let ag: number | null = null;
    const m = score.match(/^(\d+)-(\d+)$/);
    if (m) {
      hg = Number(m[1]);
      ag = Number(m[2]);
    }
    out.push({
      id: `${idPrefix}:${season}:${homeId}-${awayId}:${dateText}`,
      leagueCode,
      season,
      date,
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeGoals: hg,
      awayGoals: ag,
      status: hg == null ? "SCHEDULED" : "FINISHED",
    });
  });
  return out;
}
