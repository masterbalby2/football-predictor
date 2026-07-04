import type { Scoreline } from "@soccer/shared-types";
import { ListOrdered } from "lucide-react";

export function ScorelineList({ scorelines }: { scorelines: Scoreline[] }) {
  if (scorelines.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
        <ListOrdered className="h-3.5 w-3.5" />
        Top scorelines
      </div>
      <div className="space-y-1">
        {scorelines.map((s, i) => (
          <div
            key={`${s.home}-${s.away}-${i}`}
            className="flex items-center justify-between rounded-md bg-secondary/50 px-2.5 py-1.5"
          >
            <span className="font-mono text-sm tabular-nums">
              {s.home}
              <span className="mx-1 text-muted-foreground">-</span>
              {s.away}
            </span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {(s.probability * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
