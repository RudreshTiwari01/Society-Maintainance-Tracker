import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard, Field } from "./login";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — SocietyCare" },
      { name: "description", content: "Register as a resident to track apartment maintenance complaints." },
    ],
  }),
  component: RegisterPage,
});

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  flatNumber: z.string().trim().min(1, "Enter your flat / unit number").max(30),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", flatNumber: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: parsed.data.fullName, flat_number: parsed.data.flatNumber },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message.includes("already registered") ? "This email is already registered." : error.message);
      return;
    }
    if (data.session) {
      toast.success("Account created!");
      navigate({ to: "/dashboard" });
    } else {
      toast.success("Check your email to confirm your account.");
      navigate({ to: "/login" });
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Join your society's maintenance portal">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name">
          <input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className="auth-input" placeholder="Jane Resident" />
        </Field>
        <Field label="Flat / Unit number">
          <input value={form.flatNumber} onChange={(e) => set("flatNumber", e.target.value)} className="auth-input" placeholder="A-402" />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" className="auth-input" placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" className="auth-input" placeholder="At least 6 characters" />
        </Field>
        <button type="submit" disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create account
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
      </p>
    </AuthCard>
  );
}
