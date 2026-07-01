import { useState, useEffect } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Clock } from "lucide-react";
import { getSettings, updateSettings } from "@/lib/settings.functions";
import { useMembership } from "@/hooks/useMembership";
import { PageHeader, Card, Spinner } from "@/components/app/ui";
import { Field } from "@/routes/login";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const { data: membership } = useMembership();
  const queryClient = useQueryClient();
  const getFn = useServerFn(getSettings);
  const updateFn = useServerFn(updateSettings);
  const [days, setDays] = useState(7);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => getFn(),
    enabled: membership?.role === "admin",
  });

  useEffect(() => {
    if (settings) setDays(settings.overdueThresholdDays);
  }, [settings]);

  const save = useMutation({
    mutationFn: () => updateFn({ data: { overdueThresholdDays: days } }),
    onSuccess: async () => {
      toast.success("Settings saved.");
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      await queryClient.invalidateQueries({ queryKey: ["all-complaints"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (membership && membership.role !== "admin") return <Navigate to="/dashboard" replace />;

  return (
    <div>
      <PageHeader title="Settings" description="Configure society-wide preferences." />
      {isLoading ? (
        <Spinner />
      ) : (
        <Card className="max-w-xl">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Overdue threshold</h3>
              <p className="text-sm text-muted-foreground">Unresolved complaints older than this are flagged as overdue.</p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (days < 1 || days > 365) return toast.error("Enter a value between 1 and 365 days.");
              save.mutate();
            }}
            className="space-y-4"
          >
            <Field label="Days">
              <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className="auth-input" />
            </Field>
            <button type="submit" disabled={save.isPending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save settings
            </button>
          </form>
        </Card>
      )}
    </div>
  );
}
