import { getTeams, type Team } from "@/lib/api";
import { TeamsTabs } from "@/components/teams-tabs";

export const revalidate = 60;

export default async function TeamsPage() {
  let teams: Team[] = [];
  try {
    teams = await getTeams();
  } catch {
    // API unreachable
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Attack / defense strengths are estimated by the Dixon-Coles model.
        </p>
      </div>
      <TeamsTabs teams={teams} />
    </div>
  );
}
