import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKickoff(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatProb(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

export function leagueLabel(code: string): string {
  switch (code) {
    case "EPL":
      return "Premier League";
    case "LAL":
      return "La Liga";
    case "BUN":
      return "Bundesliga";
    default:
      return code;
  }
}
