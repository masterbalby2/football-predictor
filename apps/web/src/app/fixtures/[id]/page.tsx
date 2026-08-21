import Link from "next/link";
import { notFound } from "next/navigation";
import { getFixture } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PredictionBar } from "@/components/prediction-bar";
import { ScorelineList } from "@/components/scoreline-list";
import { formatKickoff, leagueLabel } from "@/lib/utils";
import {
  ArrowLeft,
  CalendarBlank,
  SoccerBall,
  House as HomeIcon,
  Airplane,
  Minus,
} from "@phosphor-icons/react/ssr";

export const revalidate = 60;

export default async function FixtureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let data;
  try {
    data = await getFixture(id);
  } catch {
    notFound();
  }
  if (!data) notFound();
  const { fixture, prediction } = data;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/fixtures">
          <ArrowLeft className="h-4 w-4" /> Back to fixtures
        </Link>
      </Button>

      <div>
        <Badge variant="outline" className="mb-2 font-mono">
          {leagueLabel(fixture.leagueCode)}
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight">
          {fixture.homeTeam.name} vs {fixture.awayTeam.name}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground font-mono">
          <CalendarBlank className="h-4 w-4" />
          {formatKickoff(fixture.date)}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Prediction</CardTitle>
          </CardHeader>
          <CardContent>
            {prediction ? (
              <div className="space-y-4">
                <PredictionBar prediction={prediction} />
                <div className="grid grid-cols-2 gap-3">
                  <Stat
                    icon={SoccerBall}
                    label="Expected goals"
                    value={`${prediction.expectedHomeGoals.toFixed(2)} - ${prediction.expectedAwayGoals.toFixed(2)}`}
                  />
                  <Stat
                    icon={prediction.pick === "HOME" ? HomeIcon : prediction.pick === "AWAY" ? Airplane : Minus}
                    label="Model pick"
                    value={
                      prediction.pick === "HOME"
                        ? `${fixture.homeTeam.name}`
                        : prediction.pick === "AWAY"
                          ? `${fixture.awayTeam.name}`
                          : "Draw"
                    }
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No prediction available for this fixture yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Most likely scorelines</CardTitle>
          </CardHeader>
          <CardContent>
            {prediction ? (
              <div className="space-y-2">
                {prediction.topScorelines.map((s, i) => (
                  <div
                    key={`${s.home}-${s.away}-${i}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <span className="font-mono text-lg tabular-nums">
                      {s.home}
                      <span className="mx-1.5 text-muted-foreground">-</span>
                      {s.away}
                    </span>
                    <Badge variant="outline" className="font-mono">
                      {(s.probability * 100).toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TeamLinkCard id={fixture.homeTeam.id} name={fixture.homeTeam.name} tag="Home" />
        <TeamLinkCard id={fixture.awayTeam.id} name={fixture.awayTeam.name} tag="Away" />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-1.5 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 font-mono text-sm tabular-nums">{value}</div>
    </div>
  );
}

function TeamLinkCard({ id, name, tag }: { id: string; name: string; tag: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{tag}</div>
          <div className="font-medium">{name}</div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/teams/${id}`}>View team</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
