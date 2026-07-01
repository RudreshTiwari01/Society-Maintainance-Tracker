import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
import { createComplaint } from "@/lib/complaints.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card } from "@/components/app/ui";
import { Field } from "@/routes/login";
import { CATEGORY_OPTIONS } from "@/lib/constants";
import type { ComplaintCategory } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/complaints/new")({
  component: NewComplaint,
});

const MAX_MB = 5;

function NewComplaint() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createComplaint);
  const [category, setCategory] = useState<ComplaintCategory>("electrical");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const create = useMutation({
    mutationFn: async () => {
      let imagePath: string | null = null;
      if (file) {
        setUploading(true);
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) throw new Error("Not authenticated");
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${uid}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("complaint-images").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        setUploading(false);
        if (upErr) throw new Error("Image upload failed: " + upErr.message);
        imagePath = path;
      }
      return createFn({ data: { category, description, imagePath } });
    },
    onSuccess: async (res) => {
      toast.success("Complaint submitted.");
      await queryClient.invalidateQueries({ queryKey: ["my-complaints"] });
      navigate({ to: "/complaints/$id", params: { id: res.id } });
    },
    onError: (e: Error) => {
      setUploading(false);
      toast.error(e.message);
    },
  });

  function onFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image file.");
    if (f.size > MAX_MB * 1024 * 1024) return toast.error(`Image must be under ${MAX_MB}MB.`);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 5) return toast.error("Please describe the issue (min 5 characters).");
    create.mutate();
  }

  const busy = create.isPending || uploading;

  return (
    <div>
      <button onClick={() => navigate({ to: "/complaints" })} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <PageHeader title="Raise a Complaint" description="Describe the maintenance issue you're facing." />

      <Card className="max-w-2xl">
        <form onSubmit={submit} className="space-y-5">
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value as ComplaintCategory)} className="auth-input">
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="auth-input resize-y" placeholder="e.g. The corridor light on the 4th floor has stopped working." />
          </Field>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-foreground">Photo (optional)</span>
            {preview ? (
              <div className="relative w-fit">
                <img src={preview} alt="Preview" className="h-40 rounded-lg border object-cover" />
                <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 px-6 py-8 text-center hover:bg-muted">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload an image (max {MAX_MB}MB)</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>

          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {uploading ? "Uploading image…" : create.isPending ? "Submitting…" : "Submit complaint"}
          </button>
        </form>
      </Card>
    </div>
  );
}
