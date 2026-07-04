import Link from "next/link";
import { Info, Shield, Sword, ChartLine } from "@phosphor-icons/react/ssr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "About — Predictor" };

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Info className="h-6 w-6" />
          About the Model
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          How the Soccer Match Predictor works, and where it falls short.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            The model is a <strong>Dixon-Coles Poisson regression</strong> — the
            standard statistical baseline for football match prediction. Each
            team is assigned two parameters:
          </p>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="flex items-start gap-2">
              <Sword className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Attack strength</div>
                <div className="text-xs text-muted-foreground">
                  How many goals a team scores relative to the league average.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Defense strength</div>
                <div className="text-xs text-muted-foreground">
                  How many goals a team concedes relative to the league average.
                </div>
              </div>
            </div>
          </div>
          <p>
            These parameters are estimated from historical match results using{" "}
            <strong>maximum likelihood optimization</strong> (Adam optimizer with
            gradient ascent). A <strong>time-decay weighting</strong> is applied
            so that recent matches carry more influence than old ones — the
            half-life is set to ~180 days.
          </p>
          <p>
            For each fixture, the model computes the expected goals for both
            teams using their attack/defense parameters and a home advantage
            term. It then generates a full{" "}
            <strong>scoreline probability matrix</strong> using independent
            Poisson distributions for home and away goals.
          </p>
          <p>
            A <strong>low-score correction</strong> (the Dixon-Coles tau
            function) adjusts the probabilities for 0-0, 1-0, 0-1, and 1-1
            scorelines, which pure Poisson models systematically under-predict.
            This corrects the well-known tendency of independent Poisson models
            to under-represent draws.
          </p>
          <p>
            Win/Draw/Loss probabilities are derived by summing the relevant
            scoreline cells. The model&apos;s <strong>pick</strong> is simply
            the outcome with the highest probability.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Limitations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="space-y-3 list-none">
            <li>
              <strong className="text-foreground">
                No contextual factors.
              </strong>{" "}
              The model does not account for injuries, suspensions, weather,
              motivation (e.g. a cup final vs. a dead rubber), managerial
              changes, or transfer window activity. It only sees goals scored
              and conceded.
            </li>
            <li>
              <strong className="text-foreground">
                Static within a season.
              </strong>{" "}
              Team strengths are re-estimated periodically (daily via the cron
              job), not match-by-match. A sudden form swing will not be
              reflected until enough new data accumulates.
            </li>
            <li>
              <strong className="text-foreground">
                Home advantage is league-average.
              </strong>{" "}
              The model uses a single home advantage parameter per league. It
              does not capture team-specific home/away splits (some teams are
              notably stronger or weaker at home).
            </li>
            <li>
              <strong className="text-foreground">
                Poisson assumption.
              </strong>{" "}
              Goals are assumed to follow independent Poisson distributions.
              Real football has scoreline dependencies, red cards, and tactical
              adjustments that this model cannot capture.
            </li>
            <li>
              <strong className="text-foreground">
                Not a betting tip.
              </strong>{" "}
              This is a statistical baseline for educational purposes. A 50-60%
              accuracy on match outcome (1X2) is a strong result for this type
              of model, but it does not guarantee profit. Bookmaker odds
              incorporate far more information.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
            Data Source
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Match data is sourced from{" "}
            <a
              href="https://www.football-data.org"
              className="underline hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              football-data.org
            </a>
            . When no API key is configured, the app runs on a deterministic
            seed dataset for development and demonstration.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ChartLine className="h-4 w-4" />
        <span>
          See{" "}
          <Link href="/accuracy" className="underline hover:text-foreground">
            /accuracy
          </Link>{" "}
          for current model performance.
        </span>
      </div>
    </div>
  );
}
