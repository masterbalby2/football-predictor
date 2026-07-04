import Link from "next/link";
import { Activity, CalendarDays, BarChart3, Users, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/fixtures", label: "Fixtures", icon: CalendarDays },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/accuracy", label: "Accuracy", icon: BarChart3 },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Trophy className="h-5 w-5 text-primary" />
          <span className="tracking-tight">Soccer Predictor</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              )}
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
