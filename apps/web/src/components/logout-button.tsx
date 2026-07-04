"use client";

import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="text-muted-foreground hover:text-foreground focus-ring"
    >
      <SignOut className="h-4 w-4 mr-1.5" />
      Sign out
    </Button>
  );
}
