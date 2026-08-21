import Link from "next/link";
import { CalendarBlank, ArrowRight, ChartBar } from "@phosphor-icons/react/ssr";
import type { FixtureWithPrediction } from "@soccer/shared-types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PredictionBar } from "@/components/prediction-bar";
import { ScorelineList } from "@/components/scoreline-list";
import { TeamAvatar } from "@/components/team-avatar";
import { formatKickoff, leagueLabel } from "@/lib/utils";

/**
 * Fixture card with team avatars, stacked probability bar, and top scoreline.
 * Links to /match/[id] for the full breakdown.
 */
export function FixtureCard({ item }: { item: FixtureWithPrediction }) {
  const { fixture, prediction } = item;
  const matchId = encodeURIComponent(fixture.id);
  return (
    <Link href={`/match/${matchId}`} className="block group focus-ring rounded-lg">
      <Card className="transition-all hover:border-foreground/20 hover:bg-secondary/20 h-full">
        <CardContent className="p-4 space-y-3.5">
          {/* Header: league + kickoff */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="uppercase tracking-wide">{leagueLabel(fixture.leagueCode)}</span>
            <span className="flex items-center gap-1 font-mono tabular-nums">
              <CalendarBlank className="h-3 w-3" />
              {formatKickoff(fixture.date)}
            </span>
          </div>

          {/* Teams with avatars */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <TeamAvatar
                name={fixture.homeTeam.name}
                shortName={fixture.homeTeam.shortName}
                size="sm"
              />
              <span className="font-medium truncate text-sm">
                {fixture.homeTeam.name}
              </span>
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide shrink-0">
              vs
            </span>
            <div className="flex items-center gap-2.5 min-w-0 justify-end">
              <span className="font-medium truncate text-sm text-right">
                {fixture.awayTeam.name}
              </span>
              <TeamAvatar
                name={fixture.awayTeam.name}
                shortName={fixture.awayTeam.shortName}
                size="sm"
              />
            </div>
          </div>

          {/* Probabilities */}
          {prediction ? (
            <>
              <PredictionBar prediction={prediction} />
              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ChartBar className="h-3 w-3 text-muted-foreground shrink-0" />
                  <ScorelineList
                    scorelines={prediction.topScorelines}
                    limit={1}
                  />
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                  Details
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
              {prediction.tip && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {prediction.tip}
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {(prediction.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between pt-0.5">
              <Badge variant="outline">No prediction</Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Details
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
