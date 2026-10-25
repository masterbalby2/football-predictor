"use client";

import { useState } from "react";
import Link from "next/link";
import type { Team } from "@soccer/shared-types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { leagueLabel } from "@/lib/utils";

const LEAGUES = ["ALL", "EPL", "LAL", "BUN", "FL1", "CL", "DED", "PPL", "SA"] as const;

export function TeamsTabs({ teams }: { teams: Team[] }) {
  const [tab, setTab] = useState<string>("ALL");
  const filtered =
    tab === "ALL" ? teams : teams.filter((t) => t.leagueCode === tab);
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        {LEAGUES.map((l) => (
          <TabsTrigger key={l} value={l}>
            {l === "ALL" ? "All" : l}
          </TabsTrigger>
        ))}
      </TabsList>
      {LEAGUES.map((l) => (
        <TabsContent key={l} value={l}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <Link key={t.id} href={`/teams/${t.id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {leagueLabel(t.leagueCode)}
                      </div>
                    </div>
                    {t.shortName && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {t.shortName}
                      </span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
