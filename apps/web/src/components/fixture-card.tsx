import Link from "next/link";
import type { FixtureWithPrediction } from "@soccer/shared-types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PredictionBar } from "@/components/prediction-bar";
import { ScorelineList } from "@/components/scoreline-list";
import { formatKickoff, leagueLabel } from "@/lib/utils";
import { CalendarClock, Goal } from "lucide-react";

export function FixtureCard({ item }: { item: FixtureWithPrediction }) {
  const { fixture, prediction } = item;
  return (
    <Link href={`/fixtures/${fixture.id}`} className="block">
      <Card className="transition-colors hover:border-primary/40">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <Badge variant="outline" className="font-mono">
              {leagueLabel(fixture.leagueCode)}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
              <CalendarClock className="h-3.5 w-3.5" />
              {formatKickoff(fixture.date)}
            </span>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <div className="flex-1 text-sm font-medium">
              {fixture.homeTeam.name}
              <span className="ml-1 text-xs text-muted-foreground">(H)</span>
            </div>
            <div className="px-2 font-mono text-xs text-muted-foreground">vs</div>
            <div className="flex-1 text-right text-sm font-medium">
              {fixture.awayTeam.name}
              <span className="mr-1 text-xs text-muted-foreground">(A)</span>
            </div>
          </div>

          {prediction ? (
            <div className="space-y-3">
              <PredictionBar prediction={prediction} />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Goal className="h-3.5 w-3.5" />
                  <span className="font-mono">
                    xG {prediction.expectedHomeGoals.toFixed(2)} -{" "}
                    {prediction.expectedAwayGoals.toFixed(2)}
                  </span>
                </div>
                <ScorelineList scorelines={prediction.topScorelines} />
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
              No prediction yet
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
