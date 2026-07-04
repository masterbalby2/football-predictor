import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon?: PhosphorIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Consistent page header with icon, title, description, and optional actions.
 */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
          {Icon && <Icon className="h-6 w-6" weight="fill" />}
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
