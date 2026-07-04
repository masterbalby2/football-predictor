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
} from "@phosphor-icons/react/ssr";
import { getTeamDetail, getFixtures } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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

  return (
    <div className="space-y-6">
      <Link
        href="/teams"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All teams
      </Link>

      {/* Team header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
          <Badge variant="outline" className="font-mono">
            {team.shortName}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {leagueLabel(team.leagueCode)}
        </p>
      </div>

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
                <div className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sword className="h-4 w-4" />
                    Attack
                  </span>
                  <span className="font-mono text-lg tabular-nums">
                    {strength.attack > 0 ? "+" : ""}
                    {strength.attack.toFixed(3)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    Defense
                  </span>
                  <span className="font-mono text-lg tabular-nums">
                    {strength.defense > 0 ? "+" : ""}
                    {strength.defense.toFixed(3)}
                  </span>
                </div>
                <p className="pt-2 text-xs text-muted-foreground">
                  Positive attack = scores more than average. Negative defense =
                  concedes less than average.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No model fit available yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming fixtures */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Upcoming Fixtures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming fixtures.
              </p>
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
                          variant={item.prediction.pick === (isHome ? "HOME" : "AWAY") ? "solid" : "outline"}
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

      {/* Recent form */}
      {recentForm && recentForm.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Recent Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentForm.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0 text-sm"
                >
                  <span className="flex items-center gap-3">
                    <FormIcon result={f.result} />
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
                    <Badge variant="outline" className="font-mono">
                      {f.result}
                    </Badge>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
