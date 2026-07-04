import { Suspense } from "react";
import Link from "next/link";
import { Users } from "@phosphor-icons/react/ssr";
import { getTeams } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LeagueFilter } from "@/components/league-filter";
import { leagueLabel } from "@/lib/utils";
import type { Team } from "@/lib/api";

export const dynamic = "force-dynamic";

function TeamsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function TeamsPage() {
  let teams: Team[] = [];
  let error = false;
  try {
    teams = await getTeams();
  } catch {
    error = true;
  }

  // Group by league
  const groups = new Map<string, Team[]>();
  for (const t of teams) {
    if (!groups.has(t.leagueCode)) groups.set(t.leagueCode, []);
    groups.get(t.leagueCode)!.push(t);
  }
  const sorted = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Users className="h-6 w-6" />
            Teams
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All teams across EPL, La Liga, and Bundesliga
          </p>
        </div>
        <LeagueFilter />
      </div>

      {error ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          Unable to load teams right now.
        </div>
      ) : (
        <Suspense fallback={<TeamsSkeleton />}>
          <div className="space-y-8">
            {sorted.map(([code, leagueTeams]) => (
              <section key={code} className="space-y-3">
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  {leagueLabel(code)}
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {leagueTeams.map((team) => (
                    <Link
                      key={team.id}
                      href={`/teams/${encodeURIComponent(team.id)}`}
                    >
                      <Card className="transition-colors hover:bg-secondary/30">
                        <CardContent className="flex items-center justify-between p-4">
                          <div>
                            <div className="font-medium">{team.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {leagueLabel(team.leagueCode)}
                            </div>
                          </div>
                          <Badge variant="outline" className="font-mono">
                            {team.shortName}
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
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
