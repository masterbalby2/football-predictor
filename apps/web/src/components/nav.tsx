"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SoccerBall,
  CalendarBlank,
  Users,
  ChartLine,
  Info,
  List,
  X,
} from "@phosphor-icons/react/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";

const links = [
  { href: "/", label: "Today", icon: SoccerBall, short: "Today" },
  { href: "/league/EPL", label: "Leagues", icon: List, short: "Leagues" },
  { href: "/teams", label: "Teams", icon: Users, short: "Teams" },
  { href: "/accuracy", label: "Accuracy", icon: ChartLine, short: "Accuracy" },
  { href: "/about", label: "About", icon: Info, short: "About" },
];

function NavLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: PhosphorIcon;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active =
    href === "/"
      ? pathname === "/"
      : pathname.startsWith(href.split("/").slice(0, 2).join("/"));
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-ring",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" weight={active ? "fill" : "regular"} />
      {label}
    </Link>
  );
}

export function Nav() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between gap-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight focus-ring rounded-md"
        >
          <SoccerBall className="h-5 w-5" weight="fill" />
          <span>Predictor</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.href} {...l} />
          ))}
        </nav>

        {/* Right side: logout (desktop) */}
        <div className="hidden md:block">
          <LogoutButton />
        </div>

        {/* Mobile nav trigger */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="focus-ring">
                <List className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader className="flex flex-row items-center justify-between">
                <SheetTitle className="flex items-center gap-2">
                  <SoccerBall className="h-5 w-5" weight="fill" />
                  Predictor
                </SheetTitle>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="focus-ring">
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4 mt-4">
                {links.map((l) => (
                  <SheetClose asChild key={l.href}>
                    <div>
                      <NavLink {...l} onClick={() => setOpen(false)} />
                    </div>
                  </SheetClose>
                ))}
              </nav>
              <div className="px-4 mt-6 border-t border-border pt-4">
                <SheetClose asChild>
                  <div>
                    <LogoutButton />
                  </div>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
