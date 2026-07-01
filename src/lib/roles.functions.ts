import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole } from "./constants";

export type Membership = {
  userId: string;
  email: string;
  fullName: string;
  flatNumber: string;
  role: AppRole;
};

// Returns the signed-in user's profile + role. Auto-heals missing profile rows.
export const getMyMembership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Membership> => {
    const { supabase, userId, claims } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, flat_number, email")
      .eq("id", userId)
      .maybeSingle();

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const role: AppRole = roles?.some((r) => r.role === "admin") ? "admin" : "resident";

    return {
      userId,
      email: profile?.email || (claims.email as string) || "",
      fullName: profile?.full_name || "",
      flatNumber: profile?.flat_number || "",
      role,
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(1, "Name is required").max(100),
        flatNumber: z.string().trim().min(1, "Flat number is required").max(30),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: data.fullName, flat_number: data.flatNumber })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Bootstrap: the first user may claim the Admin role while no admin exists yet.
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: existingAdmins, error: checkErr } = await supabase
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);
    if (checkErr) throw new Error(checkErr.message);
    if (existingAdmins && existingAdmins.length > 0) {
      throw new Error("An administrator already exists for this society.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminExists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);
    if (error) throw new Error(error.message);
    return { exists: (data?.length ?? 0) > 0 };
  });
