import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Megaphone, Pin, Trash2, Pencil, Loader2, Plus, X } from "lucide-react";
import { getNotices, createNotice, updateNotice, deleteNotice } from "@/lib/notices.functions";
import type { NoticeRow } from "@/lib/notices.functions";
import { useMembership } from "@/hooks/useMembership";
import { PageHeader, Card, EmptyState, Spinner } from "@/components/app/ui";
import { Field } from "@/routes/login";

export const Route = createFileRoute("/_authenticated/admin/notices")({
  component: AdminNotices,
});

function AdminNotices() {
  const { data: membership } = useMembership();
  const queryClient = useQueryClient();
  const listFn = useServerFn(getNotices);
  const createFn = useServerFn(createNotice);
  const updateFn = useServerFn(updateNotice);
  const deleteFn = useServerFn(deleteNotice);

  const [editing, setEditing] = useState<NoticeRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isImportant, setIsImportant] = useState(false);

  const { data: notices, isLoading } = useQuery({
    queryKey: ["notices"],
    queryFn: () => listFn(),
    enabled: membership?.role === "admin",
  });

  function resetForm() {
    setEditing(null); setShowForm(false); setTitle(""); setBody(""); setIsImportant(false);
  }

  function startEdit(n: NoticeRow) {
    setEditing(n); setShowForm(true); setTitle(n.title); setBody(n.body); setIsImportant(n.isImportant);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        await updateFn({ data: { id: editing.id, title, body, isImportant } });
      } else {
        await createFn({ data: { title, body, isImportant } });
      }
    },
    onSuccess: async () => {
      toast.success(editing ? "Notice updated." : "Notice published.");
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: async () => {
      toast.success("Notice deleted.");
      await queryClient.invalidateQueries({ queryKey: ["notices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (membership && membership.role !== "admin") return <Navigate to="/dashboard" replace />;

  return (
    <div>
      <PageHeader
        title="Manage Notices"
        description="Publish announcements. Important notices email all residents."
        action={
          !showForm && (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> New notice
            </button>
          )
        }
      />

      {showForm && (
        <Card className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">{editing ? "Edit notice" : "New notice"}</h3>
            <button onClick={resetForm} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim().length < 3) return toast.error("Title is too short.");
              if (body.trim().length < 3) return toast.error("Notice body is required.");
              save.mutate();
            }}
            className="space-y-4"
          >
            <Field label="Title">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="auth-input" placeholder="e.g. Water supply maintenance" />
            </Field>
            <Field label="Body">
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="auth-input resize-y" placeholder="Write the announcement…" />
            </Field>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={isImportant} onChange={(e) => setIsImportant(e.target.checked)} className="h-4 w-4 rounded border-input" />
              Mark as important (emails all residents)
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={save.isPending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? "Update" : "Publish"}
              </button>
              <button type="button" onClick={resetForm} className="rounded-lg border border-input bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <Spinner />
      ) : (notices?.length ?? 0) === 0 ? (
        <EmptyState icon={Megaphone} title="No notices yet" description="Publish your first announcement." />
      ) : (
        <div className="space-y-4">
          {notices!.map((n) => (
            <Card key={n.id} className={n.isImportant ? "border-primary/40 bg-accent/30" : ""}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{n.title}</h3>
                    {n.isImportant && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        <Pin className="h-3 w-3" /> Important
                      </span>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{n.body}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => startEdit(n)} className="rounded-md p-2 text-muted-foreground hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                  <button
                    onClick={() => { if (confirm("Delete this notice?")) remove.mutate(n.id); }}
                    className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
