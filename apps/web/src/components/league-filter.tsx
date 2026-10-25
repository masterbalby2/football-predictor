"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const leagues = [
  { code: "EPL", label: "Premier League" },
  { code: "LAL", label: "La Liga" },
  { code: "BUN", label: "Bundesliga" },
  { code: "FL1", label: "Ligue1" },
  { code: "CL", label: "UEFA" },
  { code: "DED", label: "Eridivisie" },
  { code: "PPL", label: "Primeira" },
  { code: "SA", label: "SerieA" },  
];

export function LeagueFilter({ current }: { current?: string }) {
  const router = useRouter();
  return (
    <Select
      value={current ?? "ALL"}
      onValueChange={(val) => {
        if (val === "ALL") router.push("/");
        else router.push(`/league/${val}`);
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="All leagues" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All leagues</SelectItem>
        {leagues.map((l) => (
          <SelectItem key={l.code} value={l.code}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
