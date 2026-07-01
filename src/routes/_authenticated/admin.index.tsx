import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ListChecks, ArrowRight } from "lucide-react";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { useMembership } from "@/hooks/useMembership";
import { PageHeader, Stat, Card, Spinner } from "@/components/app/ui";
import { categoryLabel, statusLabel } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: membership } = useMembership();
  const statsFn = useServerFn(getDashboardStats);
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => statsFn(),
    enabled: membership?.role === "admin",
  });

  if (membership && membership.role !== "admin") return <Navigate to="/dashboard" replace />;

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        description="Society-wide maintenance overview."
        action={
          <Link to="/admin/complaints" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <ListChecks className="h-4 w-4" /> Manage complaints
          </Link>
        }
      />

      {isLoading || !stats ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Total complaints" value={stats.total} />
            <Stat label="Overdue" value={stats.overdue} tone={stats.overdue > 0 ? "destructive" : "default"} />
            <Stat label="Resolved rate" value={`${stats.resolvedRate}%`} tone="success" />
            <Stat label="In progress" value={stats.byStatus.in_progress} tone="warning" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h3 className="mb-4 font-semibold text-foreground">By status</h3>
              <div className="space-y-3">
                {(["open", "in_progress", "resolved"] as const).map((s) => {
                  const count = stats.byStatus[s];
                  const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={s}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-foreground">{statusLabel(s)}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 font-semibold text-foreground">By category</h3>
              {stats.byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No complaints yet.</p>
              ) : (
                <div className="space-y-2">
                  {stats.byCategory.sort((a, b) => b.count - a.count).map((c) => (
                    <div key={c.category} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{categoryLabel(c.category)}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Link to="/admin/complaints" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View all complaints <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
