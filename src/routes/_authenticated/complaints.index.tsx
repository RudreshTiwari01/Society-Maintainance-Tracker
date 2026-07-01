import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PlusCircle, ClipboardList } from "lucide-react";
import { getMyComplaints } from "@/lib/complaints.functions";
import { PageHeader, Card, EmptyState, Spinner } from "@/components/app/ui";
import { StatusBadge, PriorityBadge, OverdueBadge } from "@/components/app/badges";
import { categoryLabel, STATUS_OPTIONS } from "@/lib/constants";
import type { ComplaintStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/complaints/")({
  component: MyComplaints,
});

function MyComplaints() {
  const listFn = useServerFn(getMyComplaints);
  const [filter, setFilter] = useState<ComplaintStatus | "all">("all");
  const { data: complaints, isLoading } = useQuery({
    queryKey: ["my-complaints"],
    queryFn: () => listFn(),
  });

  const filtered = (complaints ?? []).filter((c) => filter === "all" || c.status === filter);

  return (
    <div>
      <PageHeader
        title="My Complaints"
        description="Track the status of every complaint you've raised."
        action={
          <Link to="/complaints/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <PlusCircle className="h-4 w-4" /> Raise Complaint
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[{ value: "all", label: "All" }, ...STATUS_OPTIONS].map((o) => (
          <button
            key={o.value}
            onClick={() => setFilter(o.value as ComplaintStatus | "all")}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              filter === o.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nothing here yet" description="No complaints match this filter." />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Link key={c.id} to="/complaints/$id" params={{ id: c.id }}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{categoryLabel(c.category)}</p>
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{c.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Raised {new Date(c.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {c.isOverdue && <OverdueBadge />}
                    <PriorityBadge priority={c.priority} />
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
