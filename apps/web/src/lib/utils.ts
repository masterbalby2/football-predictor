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
    case "FL1":
      return "Ligue1"; 
    case "CL":
      return "UEFA";
    case "DED":
      return "Eridivisie";
    case "PPL":
      return "Primeira";
    case "SA":
      return "SerieA";         
    default:
      return code;
  }
}

export function leagueShort(code: string): string {
  switch (code) {
    case "EPL":
      return "EPL";
    case "LAL":
      return "LAL";
    case "BUN":
      return "BUN";
    case "FL1":
      return "FL1";      
    case "CL":
      return "CL";
    case "DED":
      return "DED";
    case "PPL":
      return "PPL";
    case "SA":
      return "SA";        
    default:
      return code;
  }
}

/** Resolve a URL-friendly league slug to a canonical code. */
export function resolveLeagueCode(input: string): string | null {
  const norm = input.trim().toLowerCase().replace(/[\s_-]+/g, "");
  switch (norm) {
    case "epl":
    case "pl":
    case "premierleague":
      return "EPL";
    case "lal":
    case "laliga":
    case "spain":
      return "LAL";
    case "bun":
    case "bundesliga":
    case "germany":
      return "BUN";
    case "cl":
    case "uefa":
      return "CL";
    case "ded":
    case "eridivisie":
      return "DED";
    case "ppl":
    case "primeira":
    case "portugal":
      return "PPL";      
    default:
      return null;
  }
}
