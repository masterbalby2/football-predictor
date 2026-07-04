import Link from "next/link";
import { CalendarBlank, ArrowRight } from "@phosphor-icons/react/ssr";
import type { FixtureWithPrediction } from "@soccer/shared-types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PredictionBar } from "@/components/prediction-bar";
import { ScorelineList } from "@/components/scoreline-list";
import { formatKickoff, leagueLabel } from "@/lib/utils";

/**
 * Compact fixture card: teams, kickoff, W/D/L probability bars,
 * top scoreline, and a "view details" link to /match/[id].
 */
export function FixtureCard({ item }: { item: FixtureWithPrediction }) {
  const { fixture, prediction } = item;
  const matchId = encodeURIComponent(fixture.id);
  return (
    <Link href={`/match/${matchId}`} className="block group">
      <Card className="transition-colors hover:bg-secondary/30 h-full">
        <CardContent className="p-4 space-y-3">
          {/* Header: league + kickoff */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{leagueLabel(fixture.leagueCode)}</span>
            <span className="flex items-center gap-1 font-mono tabular-nums">
              <CalendarBlank className="h-3 w-3" />
              {formatKickoff(fixture.date)}
            </span>
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between">
            <span className="font-medium truncate pr-2">
              {fixture.homeTeam.name}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              vs
            </span>
            <span className="font-medium truncate pl-2 text-right">
              {fixture.awayTeam.name}
            </span>
          </div>

          {/* Probabilities */}
          {prediction ? (
            <>
              <PredictionBar prediction={prediction} />
              <div className="flex items-center justify-between pt-1">
                <ScorelineList
                  scorelines={prediction.topScorelines}
                  limit={1}
                />
                <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  Details
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between pt-1">
              <Badge variant="outline">No prediction</Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Details
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
