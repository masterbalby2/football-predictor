import { Suspense } from "react";
import { SoccerBall, CalendarX } from "@phosphor-icons/react/ssr";
import { getFixtures } from "@/lib/api";
import { FixtureCard } from "@/components/fixture-card";
import { FixtureGridSkeleton } from "@/components/fixture-card-skeleton";
import { LeagueFilter } from "@/components/league-filter";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WarningCircle } from "@phosphor-icons/react/ssr";
import { leagueLabel } from "@/lib/utils";
import type { FixtureWithPrediction } from "@/lib/api";

export const dynamic = "force-dynamic";

function groupByLeague(items: FixtureWithPrediction[]) {
  const groups = new Map<string, FixtureWithPrediction[]>();
  for (const item of items) {
    const code = item.fixture.leagueCode;
    if (!groups.has(code)) groups.set(code, []);
    groups.get(code)!.push(item);
  }
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

export default async function HomePage() {
  let items: FixtureWithPrediction[] = [];
  let error: string | null = null;
  try {
    items = await getFixtures(undefined, 60);
  } catch {
    error = "Unable to load predictions right now. Please try again shortly.";
  }

  // Filter to today's fixtures; fall back to upcoming if none today.
  const todayStr = new Date().toDateString();
  const todays = items.filter(
    (i) => new Date(i.fixture.date).toDateString() === todayStr,
  );
  const display = todays.length > 0 ? todays : items.slice(0, 12);
  const showingToday = todays.length > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        icon={SoccerBall}
        title={showingToday ? "Today's Predictions" : "Upcoming Predictions"}
        description={
          showingToday
            ? "Dixon-Coles model · EPL · La Liga · Bundesliga · Ligue1"
            : "No matches today — showing upcoming fixtures"
        }
        actions={<LeagueFilter />}
      />

      {error ? (
        <Alert variant="outline">
          <WarningCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : display.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="No upcoming fixtures"
          description="Check back later for new predictions."
        />
      ) : (
        <Suspense fallback={<FixtureGridSkeleton count={6} />}>
          <div className="space-y-8">
            {groupByLeague(display).map(([code, leagueItems]) => (
              <section key={code} className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                    {leagueLabel(code)}
                  </h2>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {leagueItems.length} match{leagueItems.length !== 1 ? "es" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {leagueItems.map((item) => (
                    <FixtureCard key={item.fixture.id} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Suspense>
      )}
    </div>
  );
}
