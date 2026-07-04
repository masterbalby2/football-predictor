import { getFixtures, getAccuracy, getLeagues, type FixtureWithPrediction } from "@/lib/api";
import { FixturesTabs } from "@/components/fixtures-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, CalendarDays, TrendingUp } from "lucide-react";

export const revalidate = 60;

export default async function HomePage() {
  let fixtures: FixtureWithPrediction[] = [];
  let accuracy = { latestRun: null as null | { createdAt: string; matchCount: number }, history: [] as { leagueCode: string; accuracy: number; total: number; correct: number; date: string }[] };
  let leagues: { code: string; name: string }[] = [];
  try {
    [fixtures, accuracy, leagues] = await Promise.all([
      getFixtures(undefined, 60),
      getAccuracy(),
      getLeagues(),
    ]);
  } catch {
    // API not reachable — render empty state.
  }

  const withPred = fixtures.filter((f) => f.prediction);
  const recentAcc = accuracy.history.slice(0, 6);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dixon-Coles predictions across {leagues.length || 3} leagues. Data
          refreshed once daily.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" /> Upcoming fixtures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl tabular-nums">{fixtures.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" /> With predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl tabular-nums">{withPred.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" /> Model accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl tabular-nums">
              {recentAcc[0] ? `${(recentAcc[0].accuracy * 100).toFixed(1)}%` : "—"}
            </div>
            {recentAcc[0] && (
              <div className="text-xs text-muted-foreground">
                {recentAcc[0].leagueCode} · {recentAcc[0].correct}/{recentAcc[0].total}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {recentAcc.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recentAcc.map((a) => (
                <Badge key={`${a.date}-${a.leagueCode}`} variant="outline" className="font-mono">
                  {a.leagueCode} {(a.accuracy * 100).toFixed(1)}%
                  <span className="ml-1 text-muted-foreground">({a.correct}/{a.total})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Upcoming fixtures</h2>
        <FixturesTabs fixtures={fixtures} />
      </div>
    </div>
  );
}
