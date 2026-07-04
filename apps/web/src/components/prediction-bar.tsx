import { cn } from "@/lib/utils";
import type { Prediction } from "@soccer/shared-types";
import { Progress } from "@/components/ui/progress";

/**
 * Monochrome W/D/L probability display.
 * Each outcome is a labeled progress bar. The model pick gets a solid
 * border (border-2) to stand out; others get a thin border.
 */
export function PredictionBar({ prediction }: { prediction: Prediction }) {
  const { homeWinProb, drawProb, awayWinProb, pick } = prediction;
  const rows = [
    {
      key: "HOME" as const,
      label: "Home",
      value: homeWinProb,
      active: pick === "HOME",
    },
    {
      key: "DRAW" as const,
      label: "Draw",
      value: drawProb,
      active: pick === "DRAW",
    },
    {
      key: "AWAY" as const,
      label: "Away",
      value: awayWinProb,
      active: pick === "AWAY",
    },
  ];
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center gap-3">
          <span
            className={cn(
              "w-12 text-xs uppercase tracking-wide",
              r.active ? "text-foreground font-medium" : "text-muted-foreground",
            )}
          >
            {r.label}
          </span>
          <Progress
            value={r.value * 100}
            className={cn("flex-1", r.active && "ring-1 ring-primary")}
          />
          <span
            className={cn(
              "w-12 text-right font-mono text-sm tabular-nums",
              r.active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {(r.value * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}
