import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  Sword,
  TrendUp,
  TrendDown,
  Minus,
  CalendarBlank,
  ChartBar,
  Users,
} from "@phosphor-icons/react/ssr";
import { getTeamDetail, getFixtures } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TeamAvatar } from "@/components/team-avatar";
import { PredictionBar } from "@/components/prediction-bar";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { leagueLabel, formatKickoff } from "@/lib/utils";
import type { TeamDetail, FixtureWithPrediction } from "@/lib/api";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function FormIcon({ result }: { result: "W" | "D" | "L" }) {
  if (result === "W") return <TrendUp className="h-4 w-4" />;
  if (result === "L") return <TrendDown className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
}

function FormBadge({ result }: { result: "W" | "D" | "L" }) {
  const styles: Record<string, string> = {
    W: "border-transparent bg-primary text-primary-foreground",
    D: "border-border bg-secondary text-secondary-foreground",
    L: "border-border bg-transparent text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-mono font-bold ${styles[result]}`}
    >
      {result}
    </span>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const detail = await getTeamDetail(decodeURIComponent(id)).catch(() => null);
  if (!detail) return { title: "Team — Predictor" };
  return { title: `${detail.team.name} — Predictor` };
}

export default async function TeamPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);

  let detail: TeamDetail;
  try {
    detail = await getTeamDetail(id);
  } catch {
    notFound();
  }

  // Fetch upcoming fixtures for this team.
  let upcoming: FixtureWithPrediction[] = [];
  try {
    const all = await getFixtures(detail.team.leagueCode, 100);
    upcoming = all
      .filter(
        (f) =>
          f.fixture.homeTeamId === id || f.fixture.awayTeamId === id,
      )
      .slice(0, 5);
  } catch {
    // ignore
  }

  const { team, strength, recentForm } = detail;
  const formSummary = recentForm.slice(0, 5).map((f) => f.result);
  const wins = formSummary.filter((r) => r === "W").length;
  const draws = formSummary.filter((r) => r === "D").length;
  const losses = formSummary.filter((r) => r === "L").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Today</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/teams">Teams</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{team.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Team header with avatar */}
      <PageHeader
        title={team.name}
        description={leagueLabel(team.leagueCode)}
        actions={
          <Badge variant="outline" className="font-mono text-sm">
            {team.shortName}
          </Badge>
        }
      />

      {/* Form summary bar */}
      {formSummary.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Last {formSummary.length}
          </span>
          <div className="flex gap-1.5">
            {formSummary.map((r, i) => (
              <FormBadge key={i} result={r} />
            ))}
          </div>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {wins}W {draws}D {losses}L
          </span>
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
          <TabsTrigger value="form">Recent Form</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Strengths */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Model Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {strength ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Attack */}
                      <div className="rounded-lg border border-border bg-secondary/30 p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                          <Sword className="h-4 w-4" />
                          Attack
                        </div>
                        <div className="mt-2 font-mono text-2xl tabular-nums">
                          {strength.attack > 0 ? "+" : ""}
                          {strength.attack.toFixed(3)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {strength.attack > 0.1
                            ? "Above average"
                            : strength.attack < -0.1
                              ? "Below average"
                              : "Near average"}
                        </div>
                      </div>
                      {/* Defense */}
                      <div className="rounded-lg border border-border bg-secondary/30 p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                          <Shield className="h-4 w-4" />
                          Defense
                        </div>
                        <div className="mt-2 font-mono text-2xl tabular-nums">
                          {strength.defense > 0 ? "+" : ""}
                          {strength.defense.toFixed(3)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {strength.defense > 0.1
                            ? "Concedes more"
                            : strength.defense < -0.1
                              ? "Concedes less"
                              : "Near average"}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Positive attack = scores more than league average.
                      Negative defense = concedes less than average.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No model fit available yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Upcoming fixtures preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Next Fixtures
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No upcoming fixtures.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcoming.slice(0, 3).map((item) => {
                      const isHome = item.fixture.homeTeamId === id;
                      const opponent = isHome
                        ? item.fixture.awayTeam.name
                        : item.fixture.homeTeam.name;
                      return (
                        <Link
                          key={item.fixture.id}
                          href={`/match/${encodeURIComponent(item.fixture.id)}`}
                          className="flex items-center justify-between text-sm transition-colors hover:text-muted-foreground"
                        >
                          <span className="flex items-center gap-2">
                            <CalendarBlank className="h-3 w-3 text-muted-foreground" />
                            <span className="font-mono text-xs tabular-nums">
                              {formatKickoff(item.fixture.date)}
                            </span>
                          </span>
                          <span>
                            {isHome ? "vs" : "@"} {opponent}
                          </span>
                          {item.prediction && (
                            <Badge
                              variant={
                                item.prediction.pick === (isHome ? "HOME" : "AWAY")
                                  ? "solid"
                                  : "outline"
                              }
                              className="font-mono"
                            >
                              {(isHome
                                ? item.prediction.homeWinProb
                                : item.prediction.awayWinProb
                              ).toFixed(1)}
                              %
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fixtures Tab */}
        <TabsContent value="fixtures">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                Upcoming Fixtures
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={CalendarBlank}
                  title="No upcoming fixtures"
                  description="Check back later for new matches."
                />
              ) : (
                <div className="space-y-3">
                  {upcoming.map((item) => {
                    const isHome = item.fixture.homeTeamId === id;
                    const opponent = isHome
                      ? item.fixture.awayTeam.name
                      : item.fixture.homeTeam.name;
                    return (
                      <Link
                        key={item.fixture.id}
                        href={`/match/${encodeURIComponent(item.fixture.id)}`}
                        className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0 text-sm transition-colors hover:text-muted-foreground"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-muted-foreground tabular-nums">
                            {formatKickoff(item.fixture.date)}
                          </span>
                          <span className="text-muted-foreground">
                            {isHome ? "vs" : "@"}
                          </span>
                          <span className="font-medium">{opponent}</span>
                        </div>
                        {item.prediction && (
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-muted-foreground tabular-nums">
                              {(isHome
                                ? item.prediction.homeWinProb
                                : item.prediction.awayWinProb
                              ).toFixed(1)}
                              %
                            </span>
                            <Badge
                              variant={
                                item.prediction.pick === (isHome ? "HOME" : "AWAY")
                                  ? "solid"
                                  : "outline"
                              }
                              className="font-mono"
                            >
                              {item.prediction.pick === "HOME"
                                ? "H"
                                : item.prediction.pick === "AWAY"
                                  ? "A"
                                  : "D"}
                            </Badge>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Form Tab */}
        <TabsContent value="form">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                Recent Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentForm && recentForm.length > 0 ? (
                <div className="space-y-2">
                  {recentForm.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0 text-sm"
                    >
                      <span className="flex items-center gap-3">
                        <FormBadge result={f.result} />
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">
                          {new Date(f.date).toLocaleDateString()}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        {f.home ? "H" : "A"} vs {f.opponentName}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono tabular-nums">
                          {f.goalsFor}-{f.goalsAgainst}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={ChartBar}
                  title="No recent results"
                  description="Recent match results will appear here."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
