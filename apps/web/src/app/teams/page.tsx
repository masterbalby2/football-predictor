import { Suspense } from "react";
import Link from "next/link";
import { Users, UsersThree, WarningCircle } from "@phosphor-icons/react/ssr";
import { getTeams } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LeagueFilter } from "@/components/league-filter";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TeamAvatar } from "@/components/team-avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { leagueLabel } from "@/lib/utils";
import type { Team } from "@/lib/api";

export const dynamic = "force-dynamic";

function TeamsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </div>
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
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        icon={Users}
        title="Teams"
        description="All teams across EPL, La Liga, and Bundesliga"
        actions={<LeagueFilter />}
      />

      {error ? (
        <Alert variant="outline">
          <WarningCircle className="h-4 w-4" />
          <AlertDescription>Unable to load teams right now.</AlertDescription>
        </Alert>
      ) : teams.length === 0 ? (
        <EmptyState
          icon={UsersThree}
          title="No teams found"
          description="Team data will appear here once the model has been run."
        />
      ) : (
        <Suspense fallback={<TeamsSkeleton />}>
          <div className="space-y-8">
            {sorted.map(([code, leagueTeams]) => (
              <section key={code} className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                    {leagueLabel(code)}
                  </h2>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {leagueTeams.length} teams
                  </span>
                </div>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead className="text-right">Code</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leagueTeams.map((team, i) => (
                          <TableRow key={team.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                              {i + 1}
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/teams/${encodeURIComponent(team.id)}`}
                                className="flex items-center gap-3 transition-colors hover:text-muted-foreground"
                              >
                                <TeamAvatar
                                  name={team.name}
                                  shortName={team.shortName}
                                  size="sm"
                                />
                                <span className="font-medium">{team.name}</span>
                              </Link>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className="font-mono">
                                {team.shortName}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </section>
            ))}
          </div>
        </Suspense>
      )}
    </div>
  );
}
