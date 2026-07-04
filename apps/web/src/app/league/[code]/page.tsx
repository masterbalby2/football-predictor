import { Suspense } from "react";
import { notFound } from "next/navigation";
import { List, CalendarX } from "@phosphor-icons/react/ssr";
import { getFixtures } from "@/lib/api";
import { FixtureCard } from "@/components/fixture-card";
import { FixtureGridSkeleton } from "@/components/fixture-card-skeleton";
import { LeagueFilter } from "@/components/league-filter";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WarningCircle } from "@phosphor-icons/react/ssr";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { leagueLabel, resolveLeagueCode } from "@/lib/utils";
import type { FixtureWithPrediction } from "@/lib/api";
import Link from "next/link";

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
  const resolved = resolveLeagueCode(code);
  if (!resolved) notFound();

  let items: FixtureWithPrediction[] = [];
  let error: string | null = null;
  try {
    items = await getFixtures(resolved, 60);
  } catch {
    error = "Unable to load fixtures right now.";
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <Breadcrumb className="mb-2">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Today</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{leagueLabel(resolved)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        icon={List}
        title={leagueLabel(resolved)}
        description="Upcoming fixtures and predictions"
        actions={<LeagueFilter current={resolved} />}
      />

      {error ? (
        <Alert variant="outline">
          <WarningCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="No upcoming fixtures"
          description={`No scheduled matches for ${leagueLabel(resolved)} right now.`}
        />
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
