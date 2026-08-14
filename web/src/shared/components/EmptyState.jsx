import { cn } from "@/shared/lib/utils";
import { Inbox } from "lucide-react";

export function EmptyState({ title, description, icon, action, className }) {
  return (
    <div className={cn("flex flex-col items-center text-center py-14 px-6", className)}>
      <div className="h-12 w-12 rounded-md bg-muted border border-border flex items-center justify-center mb-3 text-muted-foreground">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <div className="text-[14.5px] font-medium text-foreground tracking-tight">{title}</div>
      {description && <div className="text-[13px] text-muted-foreground mt-1 max-w-[360px]">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
