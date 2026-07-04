import { Suspense } from "react";
import { SoccerBall } from "@phosphor-icons/react/ssr";
import { getFixtures } from "@/lib/api";
import { FixtureCard } from "@/components/fixture-card";
import { FixtureGridSkeleton } from "@/components/fixture-card-skeleton";
import { LeagueFilter } from "@/components/league-filter";
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

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <SoccerBall className="h-6 w-6" weight="fill" />
            Today&apos;s Predictions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dixon-Coles model · EPL · La Liga · Bundesliga
          </p>
        </div>
        <LeagueFilter />
      </div>

      {error ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : display.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          No upcoming fixtures. Check back later.
        </div>
      ) : (
        <Suspense fallback={<FixtureGridSkeleton count={6} />}>
          <div className="space-y-8">
            {groupByLeague(display).map(([code, leagueItems]) => (
              <section key={code} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
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
