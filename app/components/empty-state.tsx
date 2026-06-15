import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "success" | "warning";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
}: EmptyStateProps) {
  const variantClasses = {
    default: "text-muted-foreground",
    success: "text-green-600",
    warning: "text-amber-600",
  };

  const iconClasses = {
    default: "text-muted-foreground/60",
    success: "text-green-500",
    warning: "text-amber-500",
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      {Icon && (
        <div className={`mb-3 ${iconClasses[variant]}`}>
          <Icon className="h-10 w-10" />
        </div>
      )}
      <p className={`text-sm font-medium ${variantClasses[variant]}`}>{title}</p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground max-w-[260px]">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm" className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
