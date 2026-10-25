import { ChartLine, CheckCircle, X, Target, Gauge } from "@phosphor-icons/react/ssr";
import { getAccuracy } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LineChart } from "@/components/ui/chart";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WarningCircle } from "@phosphor-icons/react/ssr";
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
    (acc, h) => ({
      correct: acc.correct + h.correct,
      total: acc.total + h.total,
      brierSum: acc.brierSum + (h.brierScore ?? 0) * h.total,
      logLossSum: acc.logLossSum + (h.logLoss ?? 0) * h.total,
    }),
    { correct: 0, total: 0, brierSum: 0, logLossSum: 0 },
  );
  const overallPct = overall.total > 0 ? (overall.correct / overall.total) * 100 : 0;
  const overallBrier = overall.total > 0 ? overall.brierSum / overall.total : 0;
  const overallLogLoss = overall.total > 0 ? overall.logLossSum / overall.total : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        icon={ChartLine}
        title="Model Accuracy"
        description="Out-of-sample prediction performance over time"
      />

      {error ? (
        <Alert variant="outline">
          <WarningCircle className="h-4 w-4" />
          <AlertDescription>Unable to load accuracy data right now.</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <CheckCircle className="h-3.5 w-3.5" />
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
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <Target className="h-3.5 w-3.5" />
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
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5" />
                  Brier Score
                </div>
                <div className="mt-2 font-mono text-3xl tabular-nums">
                  {overallBrier.toFixed(4)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground font-mono tabular-nums">
                  lower is better (0.222 = random)
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <ChartLine className="h-3.5 w-3.5" />
                  Log-Loss
                </div>
                <div className="mt-2 font-mono text-3xl tabular-nums">
                  {overallLogLoss.toFixed(4)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground font-mono tabular-nums">
                  lower is better
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
                    { key: "FL1", name: "Ligue1" },
                    { key: "CL", name: "UEFA" },
                    { key: "DED", name: "Eridivisie" },
                    { key: "PPL", name: "Primeira" },
                    { key: "SA", name: "SerieA" },                    
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
                <div className="grid grid-cols-6 gap-4 pb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <span>League</span>
                  <span className="text-right">Correct</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">Accuracy</span>
                  <span className="text-right">Brier</span>
                  <span className="text-right">Log-Loss</span>
                </div>
                <Separator />
                {leagues.map(([code, h]) => (
                  <div
                    key={code}
                    className="grid grid-cols-6 gap-4 py-2.5 items-center"
                  >
                    <span className="text-sm font-medium">{leagueLabel(code)}</span>
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
                    <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                      {(h.brierScore ?? 0).toFixed(4)}
                    </span>
                    <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                      {(h.logLoss ?? 0).toFixed(4)}
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
                Accuracy is measured out-of-sample using walk-forward
                (rolling-origin) validation: the model is repeatedly fit on
                past matches, then the next batch of fixtures is predicted
                before they occur. The pick (Home/Draw/Away) is the outcome
                with the highest probability.
              </p>
              <p>
                Brier score and log-loss complement raw accuracy by measuring
                probability calibration. Brier score is the mean squared error
                of predicted probabilities (0 = perfect, 0.222 = random
                guessing on 3-way). Log-loss heavily penalises confident wrong
                predictions (lower is better).
              </p>
              <p>
                This is a statistical baseline, not a betting tip. Football is
                inherently unpredictable — even a 60% accuracy is strong for
                this kind of model. See{" "}
                <a href="/about" className="underline hover:text-foreground">
                  /about
                </a>{" "}
                for model limitations.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
