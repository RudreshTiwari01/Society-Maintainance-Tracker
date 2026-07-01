import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PlusCircle, ClipboardList, ShieldCheck } from "lucide-react";
import { getMyComplaints } from "@/lib/complaints.functions";
import { adminExists, claimAdmin } from "@/lib/roles.functions";
import { useMembership } from "@/hooks/useMembership";
import { PageHeader, Stat, Card, EmptyState, Spinner } from "@/components/app/ui";
import { StatusBadge, PriorityBadge, OverdueBadge } from "@/components/app/badges";
import { categoryLabel } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: ResidentDashboard,
});

function ResidentDashboard() {
  const { data: membership } = useMembership();
  const listFn = useServerFn(getMyComplaints);
  const adminExistsFn = useServerFn(adminExists);
  const claimFn = useServerFn(claimAdmin);
  const queryClient = useQueryClient();

  const { data: complaints, isLoading } = useQuery({
    queryKey: ["my-complaints"],
    queryFn: () => listFn(),
    enabled: membership?.role === "resident",
  });

  const { data: adminCheck } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: () => adminExistsFn(),
    enabled: membership?.role === "resident",
  });

  const claim = useMutation({
    mutationFn: () => claimFn(),
    onSuccess: async () => {
      toast.success("You are now an administrator.");
      await queryClient.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (membership?.role === "admin") return <Navigate to="/admin" replace />;

  const total = complaints?.length ?? 0;
  const open = complaints?.filter((c) => c.status === "open").length ?? 0;
  const inProgress = complaints?.filter((c) => c.status === "in_progress").length ?? 0;
  const resolved = complaints?.filter((c) => c.status === "resolved").length ?? 0;
  const recent = complaints?.slice(0, 5) ?? [];

  return (
    <div>
      <PageHeader
        title={`Hello, ${membership?.fullName?.split(" ")[0] || "there"}`}
        description="Your maintenance complaints at a glance."
        action={
          <Link to="/complaints/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <PlusCircle className="h-4 w-4" /> Raise Complaint
          </Link>
        }
      />

      {adminCheck && !adminCheck.exists && (
        <Card className="mb-6 border-primary/40 bg-accent/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">No administrator yet</p>
                <p className="text-sm text-muted-foreground">Set up your society by claiming the admin role.</p>
              </div>
            </div>
            <button onClick={() => claim.mutate()} disabled={claim.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {claim.isPending ? "Claiming…" : "Become admin"}
            </button>
          </div>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total" value={total} />
        <Stat label="Open" value={open} />
        <Stat label="In Progress" value={inProgress} tone="warning" />
        <Stat label="Resolved" value={resolved} tone="success" />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Recent complaints</h2>
      {isLoading ? (
        <Spinner />
      ) : recent.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No complaints yet"
          description="When you raise a maintenance complaint it will show up here."
          action={
            <Link to="/complaints/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <PlusCircle className="h-4 w-4" /> Raise your first complaint
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {recent.map((c) => (
            <Link key={c.id} to="/complaints/$id" params={{ id: c.id }}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{categoryLabel(c.category)}</p>
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{c.description}</p>
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
