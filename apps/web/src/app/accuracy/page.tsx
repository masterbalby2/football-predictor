import { ChartLine, CheckCircle, X } from "@phosphor-icons/react/ssr";
import { getAccuracy } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LineChart } from "@/components/ui/chart";
import { leagueLabel } from "@/lib/utils";
import type { AccuracyPoint } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata = { title: "Accuracy — Predictor" };

export default async function AccuracyPage() {
  let history: AccuracyPoint[] = [];
  let latestRun: { id: string; matchCount: number; leagues: string[] } | null = null;
  let error = false;
  try {
    const data = await getAccuracy();
    history = data.history;
    latestRun = data.latestRun
      ? {
          id: data.latestRun.id,
          matchCount: data.latestRun.matchCount,
          leagues: data.latestRun.leagues,
        }
      : null;
  } catch {
    error = true;
  }

  // Group by league for the summary table.
  const byLeague = new Map<string, AccuracyPoint>();
  for (const h of history) {
    if (!byLeague.has(h.leagueCode)) byLeague.set(h.leagueCode, h);
  }
  const leagues = Array.from(byLeague.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  // Build chart data: one point per (date, league) with accuracy %.
  // For the trend chart, we plot accuracy over time per league.
  const dates = Array.from(new Set(history.map((h) => h.date))).sort();
  const chartData = dates.map((date) => {
    const row: Record<string, number | string> = { date: date.slice(5) };
    for (const h of history) {
      if (h.date === date) {
        row[h.leagueCode] = +(h.accuracy * 100).toFixed(1);
      }
    }
    return row;
  });

  const overall = history.reduce(
    (acc, h) => ({ correct: acc.correct + h.correct, total: acc.total + h.total }),
    { correct: 0, total: 0 },
  );
  const overallPct = overall.total > 0 ? (overall.correct / overall.total) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ChartLine className="h-6 w-6" />
          Model Accuracy
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Out-of-sample prediction performance over time
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          Unable to load accuracy data right now.
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Overall Accuracy
                </div>
                <div className="mt-2 font-mono text-3xl tabular-nums">
                  {overallPct.toFixed(1)}%
                </div>
                <div className="mt-1 text-xs text-muted-foreground font-mono tabular-nums">
                  {overall.correct}/{overall.total} correct
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Matches Sampled
                </div>
                <div className="mt-2 font-mono text-3xl tabular-nums">
                  {latestRun?.matchCount ?? overall.total}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  across {latestRun?.leagues.length ?? 3} leagues
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Model Version
                </div>
                <div className="mt-2 font-mono text-3xl tabular-nums">
                  DC-1
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Dixon-Coles Poisson
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trend chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Accuracy Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart
                  data={chartData}
                  xKey="date"
                  series={[
                    { key: "EPL", name: "Premier League" },
                    { key: "LAL", name: "La Liga" },
                    { key: "BUN", name: "Bundesliga" },
                  ]}
                  height={250}
                />
              </CardContent>
            </Card>
          )}

          {/* Per-league breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                Per-League Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="grid grid-cols-4 gap-4 pb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <span>League</span>
                  <span className="text-right">Correct</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">Accuracy</span>
                </div>
                <Separator />
                {leagues.map(([code, h]) => (
                  <div
                    key={code}
                    className="grid grid-cols-4 gap-4 py-2.5 items-center"
                  >
                    <span className="text-sm">{leagueLabel(code)}</span>
                    <span className="text-right font-mono text-sm tabular-nums">
                      {h.correct}
                    </span>
                    <span className="text-right font-mono text-sm tabular-nums">
                      {h.total}
                    </span>
                    <span className="flex items-center justify-end gap-2">
                      <span className="font-mono text-sm tabular-nums">
                        {(h.accuracy * 100).toFixed(1)}%
                      </span>
                      {h.accuracy >= 0.5 ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Methodology note */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                Methodology
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Accuracy is measured out-of-sample: the model is fit on past
                matches, then each fixture is predicted before it occurs. The
                pick (Home/Draw/Away) is the outcome with the highest
                probability.
              </p>
              <p>
                The Dixon-Coles model estimates team attack and defense
                parameters via maximum likelihood, with time-decay weighting so
                recent matches matter more. Low-score correction adjusts the
                Poisson probabilities for the well-known under-representation of
                draws in pure Poisson models.
              </p>
              <p>
                This is a statistical baseline, not a betting tip. Football is
                inherently unpredictable — even a 60% accuracy is strong for
                this kind of model. See{" "}
                <a href="/about" className="underline hover:text-foreground">
                  /about
                </a>{" "}
                for limitations.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
