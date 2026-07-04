import type { Scoreline } from "@soccer/shared-types";
import { Badge } from "@/components/ui/badge";

export function ScorelineList({
  scorelines,
  limit = 3,
}: {
  scorelines: Scoreline[];
  limit?: number;
}) {
  const top = scorelines.slice(0, limit);
  if (top.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {top.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Badge variant={i === 0 ? "solid" : "outline"} className="font-mono">
            {s.home}-{s.away}
          </Badge>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {(s.probability * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}
