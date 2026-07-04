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
} from "@phosphor-icons/react/ssr";
import { getFixture, getTeamDetail } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PredictionBar } from "@/components/prediction-bar";
import { ScorelineList } from "@/components/scoreline-list";
import { formatKickoff, leagueLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `Match — Predictor` };
}

function FormIcon({ result }: { result: "W" | "D" | "L" }) {
  if (result === "W")
    return <TrendUp className="h-4 w-4" />;
  if (result === "L")
    return <TrendDown className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
}

function StrengthRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const sign = value > 0 ? "+" : "";
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="font-mono text-sm tabular-nums">
        {sign}
        {value.toFixed(3)}
      </span>
    </div>
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
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Match header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{leagueLabel(fixture.leagueCode)}</span>
          <span>·</span>
          <span className="flex items-center gap-1 font-mono tabular-nums">
            <CalendarBlank className="h-3 w-3" />
            {formatKickoff(fixture.date)}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {fixture.homeTeam.name} vs {fixture.awayTeam.name}
        </h1>
        {prediction && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Pick:</span>
            <Badge variant="solid">
              {prediction.pick === "HOME"
                ? fixture.homeTeam.name
                : prediction.pick === "AWAY"
                  ? fixture.awayTeam.name
                  : "Draw"}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Probabilities + scorelines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Prediction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prediction ? (
              <>
                <PredictionBar prediction={prediction} />
                <Separator />
                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Expected Goals
                  </h3>
                  <div className="flex items-center justify-between font-mono text-lg tabular-nums">
                    <span>{prediction.expectedHomeGoals.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">xG</span>
                    <span>{prediction.expectedAwayGoals.toFixed(2)}</span>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Top 3 Scorelines
                  </h3>
                  <ScorelineList scorelines={prediction.topScorelines} limit={3} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No prediction available yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Team strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Team Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* Home team */}
              <div className="space-y-3">
                <Link
                  href={`/teams/${encodeURIComponent(fixture.homeTeamId)}`}
                  className="font-medium hover:underline"
                >
                  {fixture.homeTeam.name}
                </Link>
                {homeDetail?.strength ? (
                  <div>
                    <StrengthRow
                      label="Attack"
                      value={homeDetail.strength.attack}
                      icon={Sword}
                    />
                    <StrengthRow
                      label="Defense"
                      value={homeDetail.strength.defense}
                      icon={Shield}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No data</p>
                )}
                {homeDetail?.recentForm && (
                  <div className="flex gap-1 pt-1">
                    {homeDetail.recentForm.slice(0, 5).map((f, i) => (
                      <FormIcon key={i} result={f.result} />
                    ))}
                  </div>
                )}
              </div>

              {/* Away team */}
              <div className="space-y-3">
                <Link
                  href={`/teams/${encodeURIComponent(fixture.awayTeamId)}`}
                  className="font-medium hover:underline"
                >
                  {fixture.awayTeam.name}
                </Link>
                {awayDetail?.strength ? (
                  <div>
                    <StrengthRow
                      label="Attack"
                      value={awayDetail.strength.attack}
                      icon={Sword}
                    />
                    <StrengthRow
                      label="Defense"
                      value={awayDetail.strength.defense}
                      icon={Shield}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No data</p>
                )}
                {awayDetail?.recentForm && (
                  <div className="flex gap-1 pt-1">
                    {awayDetail.recentForm.slice(0, 5).map((f, i) => (
                      <FormIcon key={i} result={f.result} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent form tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {homeDetail?.recentForm && homeDetail.recentForm.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                {fixture.homeTeam.name} — Recent Form
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {homeDetail.recentForm.slice(0, 5).map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
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
                    <FormIcon result={f.result} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {awayDetail?.recentForm && awayDetail.recentForm.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                {fixture.awayTeam.name} — Recent Form
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {awayDetail.recentForm.slice(0, 5).map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
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
                    <FormIcon result={f.result} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
