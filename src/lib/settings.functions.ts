import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("app_settings")
      .select("overdue_threshold_days")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { overdueThresholdDays: data?.overdue_threshold_days ?? 7 };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ overdueThresholdDays: z.number().int().min(1).max(365) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (isAdmin !== true) throw new Error("Forbidden");
    const { error } = await supabase
      .from("app_settings")
      .update({ overdue_threshold_days: data.overdueThresholdDays, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
