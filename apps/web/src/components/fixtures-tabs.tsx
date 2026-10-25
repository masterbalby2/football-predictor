"use client";

import { useState } from "react";
import type { FixtureWithPrediction } from "@soccer/shared-types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FixtureCard } from "@/components/fixture-card";

const LEAGUES = ["ALL", "EPL", "LAL", "BUN", "FL1", "CL", "DED", "PPL", "SA"] as const;

export function FixturesTabs({
  fixtures,
}: {
  fixtures: FixtureWithPrediction[];
}) {
  const [tab, setTab] = useState<string>("ALL");
  const filtered =
    tab === "ALL" ? fixtures : fixtures.filter((f) => f.fixture.leagueCode === tab);

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
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No upcoming fixtures.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((f) => (
                <FixtureCard key={f.fixture.id} item={f} />
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
