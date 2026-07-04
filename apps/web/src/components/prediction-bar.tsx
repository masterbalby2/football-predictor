import { cn } from "@/lib/utils";
import type { Prediction } from "@soccer/shared-types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Stacked horizontal probability bar showing W/D/L proportions.
 * The model's pick is highlighted with a brighter segment + ring.
 * Hovering each segment shows the exact percentage.
 */
export function PredictionBar({ prediction }: { prediction: Prediction }) {
  const { homeWinProb, drawProb, awayWinProb, pick } = prediction;
  const segments = [
    { key: "HOME" as const, label: "Home", value: homeWinProb, active: pick === "HOME" },
    { key: "DRAW" as const, label: "Draw", value: drawProb, active: pick === "DRAW" },
    { key: "AWAY" as const, label: "Away", value: awayWinProb, active: pick === "AWAY" },
  ];

  return (
    <div className="space-y-2.5">
      {/* Stacked bar */}
      <TooltipProvider delayDuration={200}>
        <div className="flex h-7 w-full overflow-hidden rounded-md border border-border bg-secondary">
          {segments.map((s) => (
            <Tooltip key={s.key}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center justify-center transition-all cursor-default",
                    s.active
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/70",
                  )}
                  style={{ width: `${Math.max(s.value * 100, 2)}%` }}
                >
                  {s.value >= 0.15 && (
                    <span className="font-mono text-[0.7rem] font-medium tabular-nums">
                      {(s.value * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-mono text-xs">
                <span className="font-medium">{s.label}</span>: {(s.value * 100).toFixed(1)}%
                {s.active && " (pick)"}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {/* Legend with exact values */}
      <div className="flex items-center justify-between text-xs">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-sm",
                s.active ? "bg-primary" : "bg-muted-foreground/40",
              )}
            />
            <span
              className={cn(
                "font-mono tabular-nums",
                s.active ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              {(s.value * 100).toFixed(1)}%
            </span>
            <span className="text-muted-foreground uppercase tracking-wide">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
