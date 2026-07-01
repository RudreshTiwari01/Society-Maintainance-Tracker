import { cn } from "@/lib/utils";
import { statusLabel, priorityLabel } from "@/lib/constants";
import type { ComplaintStatus, ComplaintPriority } from "@/lib/constants";
import { AlertTriangle } from "lucide-react";

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  const styles: Record<ComplaintStatus, string> = {
    open: "bg-accent text-accent-foreground",
    in_progress: "bg-warning/15 text-warning-foreground",
    resolved: "bg-success/15 text-success",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[status])}>
      {statusLabel(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: ComplaintPriority }) {
  const styles: Record<ComplaintPriority, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-warning/15 text-warning-foreground",
    high: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[priority])}>
      {priorityLabel(priority)} priority
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
      <AlertTriangle className="h-3 w-3" />
      Overdue
    </span>
  );
}
