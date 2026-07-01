import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, ListChecks } from "lucide-react";
import { getAllComplaints } from "@/lib/complaints.functions";
import { useMembership } from "@/hooks/useMembership";
import { PageHeader, Card, EmptyState, Spinner } from "@/components/app/ui";
import { StatusBadge, PriorityBadge, OverdueBadge } from "@/components/app/badges";
import { categoryLabel, CATEGORY_OPTIONS, STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/admin/complaints")({
  component: AdminComplaints,
});

function AdminComplaints() {
  const { data: membership } = useMembership();
  const listFn = useServerFn(getAllComplaints);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filters = {
    search: search || undefined,
    category: (category || undefined) as any,
    status: (status || undefined) as any,
    priority: (priority || undefined) as any,
    from: from || undefined,
    to: to || undefined,
  };

  const { data: complaints, isLoading } = useQuery({
    queryKey: ["all-complaints", filters],
    queryFn: () => listFn({ data: filters }),
    enabled: membership?.role === "admin",
  });

  if (membership && membership.role !== "admin") return <Navigate to="/dashboard" replace />;

  return (
    <div>
      <PageHeader title="All Complaints" description="Filter, review and update resident complaints." />

      <Card className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative sm:col-span-2 lg:col-span-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description, resident, flat…" className="auth-input pl-9" />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="auth-input">
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="auth-input">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="auth-input">
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="block text-sm text-muted-foreground">
            From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="auth-input mt-1" />
          </label>
          <label className="block text-sm text-muted-foreground">
            To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="auth-input mt-1" />
          </label>
          <button
            onClick={() => { setSearch(""); setCategory(""); setStatus(""); setPriority(""); setFrom(""); setTo(""); }}
            className="self-end rounded-lg border border-input bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Clear filters
          </button>
        </div>
      </Card>

      {isLoading ? (
        <Spinner />
      ) : (complaints?.length ?? 0) === 0 ? (
        <EmptyState icon={ListChecks} title="No complaints found" description="Try adjusting your filters." />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{complaints!.length} complaint(s)</p>
          {complaints!.map((c) => (
            <Link key={c.id} to="/complaints/$id" params={{ id: c.id }}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{categoryLabel(c.category)}</p>
                      <span className="text-xs text-muted-foreground">· {c.residentName || "Unknown"} · Flat {c.flatNumber || "—"}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{c.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</p>
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
