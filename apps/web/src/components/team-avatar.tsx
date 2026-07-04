import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface TeamAvatarProps {
  name: string;
  shortName?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-8 w-8 text-[0.65rem]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-sm",
};

/**
 * Monochrome team avatar — shows the team's short name (3-letter code)
 * in a circle. Used in fixture cards, team lists, and match detail.
 */
export function TeamAvatar({ name, shortName, size = "md", className }: TeamAvatarProps) {
  const initials = (shortName ?? name).slice(0, 3).toUpperCase();
  return (
    <Avatar className={cn(sizeMap[size], className)}>
      <AvatarFallback className={cn(sizeMap[size], "font-mono font-semibold")}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
