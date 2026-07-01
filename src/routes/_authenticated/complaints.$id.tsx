import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Lock, Home, User } from "lucide-react";
import { getComplaintDetail, updateComplaint } from "@/lib/complaints.functions";
import { useMembership } from "@/hooks/useMembership";
import { PageHeader, Card, Spinner } from "@/components/app/ui";
import { StatusBadge, PriorityBadge, OverdueBadge } from "@/components/app/badges";
import { categoryLabel, statusLabel, STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/lib/constants";
import type { ComplaintStatus, ComplaintPriority } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/complaints/$id")({
  component: ComplaintDetail,
});

function ComplaintDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const detailFn = useServerFn(getComplaintDetail);
  const updateFn = useServerFn(updateComplaint);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["complaint", id],
    queryFn: () => detailFn({ data: { id } }),
  });

  const [status, setStatus] = useState<ComplaintStatus>("open");
  const [priority, setPriority] = useState<ComplaintPriority>("low");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (data?.complaint) {
      setStatus(data.complaint.status);
      setPriority(data.complaint.priority);
    }
  }, [data?.complaint]);

  const update = useMutation({
    mutationFn: () => updateFn({ data: { id, status, priority, note: note.trim() || null } }),
    onSuccess: async () => {
      toast.success("Complaint updated.");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["complaint", id] });
      await queryClient.invalidateQueries({ queryKey: ["all-complaints"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Spinner />;
  if (isError || !data) return <p className="text-sm text-muted-foreground">Complaint not found.</p>;

  const { complaint, imageUrl, timeline } = data;
  const isAdmin = membership?.role === "admin";
  const isResolved = complaint.status === "resolved";

  return (
    <div>
      <button onClick={() => navigate({ to: isAdmin ? "/admin/complaints" : "/complaints" })} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <PageHeader
        title={categoryLabel(complaint.category)}
        description={`Raised ${new Date(complaint.createdAt).toLocaleString()}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {complaint.isOverdue && <OverdueBadge />}
            <PriorityBadge priority={complaint.priority} />
            <StatusBadge status={complaint.status} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h3 className="mb-2 font-semibold text-foreground">Description</h3>
            <p className="whitespace-pre-wrap text-sm text-foreground/90">{complaint.description}</p>
            {imageUrl && (
              <img src={imageUrl} alt="Complaint attachment" className="mt-4 max-h-96 rounded-lg border object-contain" />
            )}
          </Card>

          <Card>
            <h3 className="mb-4 font-semibold text-foreground">Resolution timeline</h3>
            <ol className="relative space-y-5 border-l pl-5">
              {timeline.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[1.42rem] top-1 h-3 w-3 rounded-full border-2 border-card bg-primary" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {h.previousStatus ? `${statusLabel(h.previousStatus)} → ${statusLabel(h.newStatus)}` : statusLabel(h.newStatus)}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span>
                  </div>
                  {h.note && <p className="mt-1 text-sm text-muted-foreground">{h.note}</p>}
                  <p className="mt-0.5 text-xs text-muted-foreground">by {h.adminName}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 font-semibold text-foreground">Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" /> <span className="text-foreground">{complaint.residentName || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Home className="h-4 w-4" /> <span className="text-foreground">Flat {complaint.flatNumber || "—"}</span>
              </div>
            </dl>
          </Card>

          {isAdmin && (
            <Card>
              <h3 className="mb-3 font-semibold text-foreground">Manage complaint</h3>
              {isResolved ? (
                <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  <Lock className="mt-0.5 h-4 w-4" />
                  This complaint is resolved and closed. It can no longer be modified.
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-foreground">Status</span>
                    <select value={status} onChange={(e) => setStatus(e.target.value as ComplaintStatus)} className="auth-input">
                      {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-foreground">Priority</span>
                    <select value={priority} onChange={(e) => setPriority(e.target.value as ComplaintPriority)} className="auth-input">
                      {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-foreground">Note (optional)</span>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="auth-input resize-y" placeholder="Add a note to the timeline / resident email." />
                  </label>
                  <button onClick={() => update.mutate()} disabled={update.isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                    {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
                  </button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
