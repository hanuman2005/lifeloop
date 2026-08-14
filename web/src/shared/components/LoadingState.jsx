import { cn } from "@/shared/lib/utils";
import { Loader2 } from "lucide-react";

export function LoadingState({ label, className }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-12 text-muted-foreground", className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-[13px] font-mono uppercase tracking-wider">{label ?? "Loading"}</span>
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
