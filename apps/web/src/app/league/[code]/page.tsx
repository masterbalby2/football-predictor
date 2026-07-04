import { Suspense } from "react";
import { notFound } from "next/navigation";
import { List } from "@phosphor-icons/react/ssr";
import { getFixtures } from "@/lib/api";
import { FixtureCard } from "@/components/fixture-card";
import { FixtureGridSkeleton } from "@/components/fixture-card-skeleton";
import { LeagueFilter } from "@/components/league-filter";
import { leagueLabel, resolveLeagueCode } from "@/lib/utils";
import type { FixtureWithPrediction } from "@/lib/api";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params;
  const resolved = resolveLeagueCode(code);
  if (!resolved) return { title: "League — Predictor" };
  return { title: `${leagueLabel(resolved)} — Predictor` };
}

export default async function LeaguePage({ params }: PageProps) {
  const { code } = await params;
  const resolved = resolveCodeOr404(code);
  if (!resolved) notFound();

  let items: FixtureWithPrediction[] = [];
  let error: string | null = null;
  try {
    items = await getFixtures(resolved, 60);
  } catch {
    error = "Unable to load fixtures right now.";
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <List className="h-6 w-6" />
            {leagueLabel(resolved)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upcoming fixtures and predictions
          </p>
        </div>
        <LeagueFilter current={resolved} />
      </div>

      {error ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          No upcoming fixtures for {leagueLabel(resolved)}.
        </div>
      ) : (
        <Suspense fallback={<FixtureGridSkeleton count={6} />}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <FixtureCard key={item.fixture.id} item={item} />
            ))}
          </div>
        </Suspense>
      )}
    </div>
  );
}

function resolveCodeOr404(code: string): string | null {
  return resolveLeagueCode(code);
}
