import { getAccuracy } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Database } from "lucide-react";
import { leagueLabel } from "@/lib/utils";

export const revalidate = 60;

export default async function AccuracyPage() {
  let data = { latestRun: null as null | { createdAt: string; matchCount: number; id: string }, history: [] as { date: string; leagueCode: string; total: number; correct: number; accuracy: number }[] };
  try {
    data = await getAccuracy();
  } catch {
    // API unreachable
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Model accuracy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Out-of-sample accuracy: the model is fit on a training split and
          evaluated on a held-out 20% of recent matches per league.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" /> Latest run
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.latestRun ? (
              <div className="space-y-1 font-mono text-sm">
                <div>
                  <span className="text-muted-foreground">Run ID:</span>{" "}
                  <span className="tabular-nums">{data.latestRun.id.slice(0, 8)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  <span className="tabular-nums">
                    {new Date(data.latestRun.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Matches:</span>{" "}
                  <span className="tabular-nums">{data.latestRun.matchCount}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No runs yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4" /> Per-league (latest)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.history.length === 0 && (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              )}
              {Object.entries(
                data.history.reduce<Record<string, (typeof data.history)[number]>>(
                  (acc, h) => {
                    if (!acc[h.leagueCode]) acc[h.leagueCode] = h;
                    return acc;
                  },
                  {},
                ),
              ).map(([code, h]) => (
                <Badge key={code} variant="outline" className="font-mono">
                  {leagueLabel(code)}: {(h.accuracy * 100).toFixed(1)}%
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Accuracy history</CardTitle>
        </CardHeader>
        <CardContent>
          {data.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No accuracy data yet. Run the cron job to populate.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>League</TableHead>
                  <TableHead className="text-right">Correct</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.history.map((h) => (
                  <TableRow key={`${h.date}-${h.leagueCode}`}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {h.date}
                    </TableCell>
                    <TableCell>{leagueLabel(h.leagueCode)}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {h.correct}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {h.total}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {(h.accuracy * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
