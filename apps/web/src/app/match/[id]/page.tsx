import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarBlank,
  Shield,
  Sword,
  TrendUp,
  TrendDown,
  Minus,
  ChartBar,
  Target,
  Trophy,
} from "@phosphor-icons/react/ssr";
import { getFixture, getTeamDetail } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PredictionBar } from "@/components/prediction-bar";
import { ScorelineList } from "@/components/scoreline-list";
import { TeamAvatar } from "@/components/team-avatar";
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
import { formatKickoff, leagueLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Match — Predictor` };
}

function FormBadge({ result }: { result: "W" | "D" | "L" }) {
  const styles: Record<string, string> = {
    W: "border-transparent bg-primary text-primary-foreground",
    D: "border-border bg-secondary text-secondary-foreground",
    L: "border-border bg-transparent text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded text-[0.65rem] font-mono font-bold ${styles[result]}`}
    >
      {result}
    </span>
  );
}

export default async function MatchPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);

  let fixture, prediction;
  try {
    const data = await getFixture(id);
    fixture = data.fixture;
    prediction = data.prediction;
  } catch {
    notFound();
  }

  // Fetch both teams' details (strength + form) in parallel.
  const [homeDetail, awayDetail] = await Promise.all([
    getTeamDetail(fixture.homeTeamId).catch(() => null),
    getTeamDetail(fixture.awayTeamId).catch(() => null),
  ]);

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
              <Link href={`/league/${fixture.leagueCode}`}>
                {leagueLabel(fixture.leagueCode)}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {fixture.homeTeam.name} vs {fixture.awayTeam.name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Match header with team avatars */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="uppercase tracking-wide">{leagueLabel(fixture.leagueCode)}</span>
          <span>·</span>
          <span className="flex items-center gap-1 font-mono tabular-nums">
            <CalendarBlank className="h-3 w-3" />
            {formatKickoff(fixture.date)}
          </span>
        </div>

        {/* Teams face-off */}
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col items-center gap-2 text-center flex-1">
            <TeamAvatar
              name={fixture.homeTeam.name}
              shortName={fixture.homeTeam.shortName}
              size="lg"
            />
            <Link
              href={`/teams/${encodeURIComponent(fixture.homeTeamId)}`}
              className="font-semibold hover:underline"
            >
              {fixture.homeTeam.name}
            </Link>
            {prediction?.pick === "HOME" && (
              <Badge variant="solid" className="text-xs">
                <Trophy className="h-3 w-3 mr-1" />
                Pick
              </Badge>
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">vs</span>
            {prediction && (
              <span className="font-mono text-2xl tabular-nums text-muted-foreground">
                {prediction.expectedHomeGoals.toFixed(1)}
                <span className="mx-1 text-foreground">:</span>
                {prediction.expectedAwayGoals.toFixed(1)}
              </span>
            )}
            <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              xG
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 text-center flex-1">
            <TeamAvatar
              name={fixture.awayTeam.name}
              shortName={fixture.awayTeam.shortName}
              size="lg"
            />
            <Link
              href={`/teams/${encodeURIComponent(fixture.awayTeamId)}`}
              className="font-semibold hover:underline"
            >
              {fixture.awayTeam.name}
            </Link>
            {prediction?.pick === "AWAY" && (
              <Badge variant="solid" className="text-xs">
                <Trophy className="h-3 w-3 mr-1" />
                Pick
              </Badge>
            )}
          </div>
        </div>

        {prediction?.pick === "DRAW" && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Pick:</span>
            <Badge variant="solid">Draw</Badge>
          </div>
        )}
      </div>

      <Tabs defaultValue="prediction" className="w-full">
        <TabsList>
          <TabsTrigger value="prediction">Prediction</TabsTrigger>
          <TabsTrigger value="strengths">Strengths</TabsTrigger>
          <TabsTrigger value="form">Form</TabsTrigger>
        </TabsList>

        {/* Prediction Tab */}
        <TabsContent value="prediction" className="space-y-6">
          {prediction ? (
            <>
              {/* Tip + confidence banner */}
              {prediction.tip && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      Suggestion: {prediction.tip}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    confidence {(prediction.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* W/D/L probabilities */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                    Win Probability
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PredictionBar prediction={prediction} />
                </CardContent>
              </Card>

              {/* Expected goals + top scorelines */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                    Scoreline Forecast
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Expected goals */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                      <Target className="h-3 w-3" />
                      Expected Goals
                    </h3>
                    <div className="flex items-center justify-between font-mono text-lg tabular-nums">
                      <span>{prediction.expectedHomeGoals.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">xG</span>
                      <span>{prediction.expectedAwayGoals.toFixed(2)}</span>
                    </div>
                  </div>
                  <Separator />
                  {/* Top scorelines */}
                  <div>
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                      <ChartBar className="h-3 w-3" />
                      Top 3 Scorelines
                    </h3>
                    <ScorelineList scorelines={prediction.topScorelines} limit={3} />
                  </div>
                </CardContent>
              </Card>
            </div>
            </>
          ) : (
            <EmptyState
              icon={ChartBar}
              title="No prediction available"
              description="The model hasn't generated a prediction for this fixture yet."
            />
          )}
        </TabsContent>

        {/* Strengths Tab */}
        <TabsContent value="strengths">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Home team */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TeamAvatar
                    name={fixture.homeTeam.name}
                    shortName={fixture.homeTeam.shortName}
                    size="sm"
                  />
                  <Link
                    href={`/teams/${encodeURIComponent(fixture.homeTeamId)}`}
                    className="hover:underline"
                  >
                    {fixture.homeTeam.name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {homeDetail?.strength ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border bg-secondary/30 p-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                        <Sword className="h-4 w-4" />
                        Attack
                      </div>
                      <div className="mt-2 font-mono text-xl tabular-nums">
                        {homeDetail.strength.attack > 0 ? "+" : ""}
                        {homeDetail.strength.attack.toFixed(3)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/30 p-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                        <Shield className="h-4 w-4" />
                        Defense
                      </div>
                      <div className="mt-2 font-mono text-xl tabular-nums">
                        {homeDetail.strength.defense > 0 ? "+" : ""}
                        {homeDetail.strength.defense.toFixed(3)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data</p>
                )}
              </CardContent>
            </Card>

            {/* Away team */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TeamAvatar
                    name={fixture.awayTeam.name}
                    shortName={fixture.awayTeam.shortName}
                    size="sm"
                  />
                  <Link
                    href={`/teams/${encodeURIComponent(fixture.awayTeamId)}`}
                    className="hover:underline"
                  >
                    {fixture.awayTeam.name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {awayDetail?.strength ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border bg-secondary/30 p-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                        <Sword className="h-4 w-4" />
                        Attack
                      </div>
                      <div className="mt-2 font-mono text-xl tabular-nums">
                        {awayDetail.strength.attack > 0 ? "+" : ""}
                        {awayDetail.strength.attack.toFixed(3)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/30 p-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                        <Shield className="h-4 w-4" />
                        Defense
                      </div>
                      <div className="mt-2 font-mono text-xl tabular-nums">
                        {awayDetail.strength.defense > 0 ? "+" : ""}
                        {awayDetail.strength.defense.toFixed(3)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Form Tab */}
        <TabsContent value="form">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {homeDetail?.recentForm && homeDetail.recentForm.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <TeamAvatar
                      name={fixture.homeTeam.name}
                      shortName={fixture.homeTeam.shortName}
                      size="sm"
                    />
                    {fixture.homeTeam.name} — Recent Form
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex gap-1.5">
                    {homeDetail.recentForm.slice(0, 5).map((f, i) => (
                      <FormBadge key={i} result={f.result} />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {homeDetail.recentForm.slice(0, 5).map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0"
                      >
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">
                          {new Date(f.date).toLocaleDateString()}
                        </span>
                        <span className="text-muted-foreground">
                          {f.home ? "H" : "A"} vs {f.opponentName}
                        </span>
                        <span className="font-mono tabular-nums">
                          {f.goalsFor}-{f.goalsAgainst}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {awayDetail?.recentForm && awayDetail.recentForm.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <TeamAvatar
                      name={fixture.awayTeam.name}
                      shortName={fixture.awayTeam.shortName}
                      size="sm"
                    />
                    {fixture.awayTeam.name} — Recent Form
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex gap-1.5">
                    {awayDetail.recentForm.slice(0, 5).map((f, i) => (
                      <FormBadge key={i} result={f.result} />
                    ))}
                  </div>
                  <div className="space-y-2">
                    {awayDetail.recentForm.slice(0, 5).map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0 last:pb-0"
                      >
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">
                          {new Date(f.date).toLocaleDateString()}
                        </span>
                        <span className="text-muted-foreground">
                          {f.home ? "H" : "A"} vs {f.opponentName}
                        </span>
                        <span className="font-mono tabular-nums">
                          {f.goalsFor}-{f.goalsAgainst}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
