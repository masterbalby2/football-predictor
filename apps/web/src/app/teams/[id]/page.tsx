import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeamDetail } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ArrowLeft, Shield, Swords, Activity } from "lucide-react";
import { leagueLabel } from "@/lib/utils";

export const revalidate = 60;

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let detail;
  try {
    detail = await getTeamDetail(id);
  } catch {
    notFound();
  }
  if (!detail) notFound();
  const { team, strength, recentForm } = detail;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/teams">
          <ArrowLeft className="h-4 w-4" /> Back to teams
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <Badge variant="outline" className="mb-2 font-mono">
            {leagueLabel(team.leagueCode)}
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
        </div>
        {team.shortName && (
          <span className="font-mono text-lg text-muted-foreground">
            {team.shortName}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Swords className="h-4 w-4 text-primary" /> Attack strength
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strength ? (
              <StrengthBar value={strength.attack} positive />
            ) : (
              <p className="text-sm text-muted-foreground">No model fit yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-accent" /> Defense strength
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strength ? (
              <StrengthBar value={strength.defense} positive />
            ) : (
              <p className="text-sm text-muted-foreground">No model fit yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" /> Recent form
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentForm.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent matches.</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {recentForm.map((f, i) => (
                  <Badge
                    key={i}
                    variant={
                      f.result === "W"
                        ? "success"
                        : f.result === "L"
                          ? "destructive"
                          : "secondary"
                    }
                    className="font-mono"
                  >
                    {f.result}
                  </Badge>
                ))}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vs</TableHead>
                    <TableHead className="text-center">Venue</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentForm.map((f, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(f.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{f.opponentName}</TableCell>
                      <TableCell className="text-center text-xs">
                        {f.home ? "H" : "A"}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {f.goalsFor}-{f.goalsAgainst}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Strength bar: maps a signed strength (roughly -1..1) to a centered bar.
 * Higher = better (green, right); lower = worse (red, left).
 */
function StrengthBar({ value, positive }: { value: number; positive: boolean }) {
  const pct = Math.min(100, Math.max(0, 50 + value * 50));
  return (
    <div className="space-y-1.5">
      <div className="font-mono text-2xl tabular-nums">
        {value > 0 ? "+" : ""}
        {value.toFixed(3)}
      </div>
      <div className="relative h-2 w-full rounded-full bg-secondary">
        <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
        <div
          className={`absolute top-0 h-full rounded-full ${
            positive ? "bg-primary" : "bg-accent"
          }`}
          style={{
            left: value >= 0 ? "50%" : `${pct}%`,
            width: `${Math.abs(value) * 50}%`,
          }}
        />
      </div>
    </div>
  );
}
