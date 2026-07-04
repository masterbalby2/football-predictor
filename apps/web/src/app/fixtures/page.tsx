import { getFixtures, type FixtureWithPrediction } from "@/lib/api";
import { FixturesTabs } from "@/components/fixtures-tabs";

export const revalidate = 60;

export default async function FixturesPage() {
  let fixtures: FixtureWithPrediction[] = [];
  try {
    fixtures = await getFixtures(undefined, 100);
  } catch {
    // API unreachable
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fixtures</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upcoming matches with Dixon-Coles win/draw/loss probabilities.
        </p>
      </div>
      <FixturesTabs fixtures={fixtures} />
    </div>
  );
}
