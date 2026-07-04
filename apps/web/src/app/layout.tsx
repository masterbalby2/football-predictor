import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Soccer Match Predictor",
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
          <main className="container flex-1 py-8">{children}</main>
          <footer className="border-t py-6 text-center text-xs text-muted-foreground font-mono">
            Soccer Match Predictor · Dixon-Coles model · data refreshed daily
          </footer>
        </div>
      </body>
    </html>
  );
}
