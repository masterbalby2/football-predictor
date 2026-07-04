import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: {
    default: "Soccer Match Predictor",
    template: "%s — Predictor",
  },
  description:
    "Dixon-Coles match predictions for the Premier League, La Liga, and Bundesliga.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased min-h-screen`}
      >
        <div className="relative flex min-h-screen flex-col">
          <Nav />
          <main className="container flex-1 py-8 md:py-10">{children}</main>
          <footer className="border-t border-border py-6">
            <div className="container flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground font-mono sm:flex-row">
              <span>Soccer Match Predictor · Dixon-Coles model</span>
              <span>Data refreshed daily · Not a betting tip</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
