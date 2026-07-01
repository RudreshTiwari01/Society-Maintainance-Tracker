import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { updateMyProfile } from "@/lib/roles.functions";
import { useMembership } from "@/hooks/useMembership";
import { PageHeader, Card } from "@/components/app/ui";
import { Field } from "@/routes/login";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: membership } = useMembership();
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateMyProfile);
  const [fullName, setFullName] = useState("");
  const [flatNumber, setFlatNumber] = useState("");

  useEffect(() => {
    if (membership) {
      setFullName(membership.fullName);
      setFlatNumber(membership.flatNumber);
    }
  }, [membership]);

  const save = useMutation({
    mutationFn: () => updateFn({ data: { fullName, flatNumber } }),
    onSuccess: async () => {
      toast.success("Profile updated.");
      await queryClient.invalidateQueries({ queryKey: ["membership"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Profile" description="Manage your account details." />
      <Card className="max-w-xl">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground">{membership?.email}</div>
          <div className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium capitalize text-accent-foreground">
            {membership?.role === "admin" && <ShieldCheck className="h-4 w-4" />}
            {membership?.role}
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!fullName.trim() || !flatNumber.trim()) return toast.error("Name and flat number are required.");
            save.mutate();
          }}
          className="space-y-4"
        >
          <Field label="Full name">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="auth-input" />
          </Field>
          <Field label="Flat / Unit number">
            <input value={flatNumber} onChange={(e) => setFlatNumber(e.target.value)} className="auth-input" />
          </Field>
          <button type="submit" disabled={save.isPending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </button>
        </form>
      </Card>
    </div>
  );
}
