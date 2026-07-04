import { cn } from "@/lib/utils";
import type { Prediction } from "@soccer/shared-types";
import { Home, Minus, Plane } from "lucide-react";

/**
 * Horizontal W/D/L probability bar with the model pick highlighted.
 */
export function PredictionBar({ prediction }: { prediction: Prediction }) {
  const { homeWinProb, drawProb, awayWinProb, pick } = prediction;
  const segments = [
    {
      key: "HOME" as const,
      label: "Home",
      value: homeWinProb,
      icon: Home,
      active: pick === "HOME",
    },
    {
      key: "DRAW" as const,
      label: "Draw",
      value: drawProb,
      icon: Minus,
      active: pick === "DRAW",
    },
    {
      key: "AWAY" as const,
      label: "Away",
      value: awayWinProb,
      icon: Plane,
      active: pick === "AWAY",
    },
  ];
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        {segments.map((s) => (
          <div
            key={s.key}
            className={cn(
              "h-full transition-all",
              s.key === "HOME" && "bg-primary",
              s.key === "DRAW" && "bg-muted-foreground",
              s.key === "AWAY" && "bg-accent",
            )}
            style={{ width: `${s.value * 100}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {segments.map((s) => (
          <div
            key={s.key}
            className={cn(
              "rounded-md border px-2 py-1.5",
              s.active
                ? "border-primary/50 bg-primary/10"
                : "border-transparent",
            )}
          >
            <div className="flex items-center justify-center gap-1 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              <s.icon className="h-3 w-3" />
              {s.label}
            </div>
            <div className="font-mono text-sm tabular-nums">
              {(s.value * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
