import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ComplaintCategory, ComplaintStatus } from "./constants";

export type DashboardStats = {
  total: number;
  byStatus: Record<ComplaintStatus, number>;
  byCategory: { category: ComplaintCategory; count: number }[];
  overdue: number;
  resolvedRate: number;
};

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardStats> => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (isAdmin !== true) throw new Error("Forbidden");

    const { data: settings } = await supabase
      .from("app_settings")
      .select("overdue_threshold_days")
      .eq("id", 1)
      .maybeSingle();
    const threshold = settings?.overdue_threshold_days ?? 7;

    const { data: rows, error } = await supabase
      .from("complaints")
      .select("status, category, created_at");
    if (error) throw new Error(error.message);

    const byStatus: Record<ComplaintStatus, number> = { open: 0, in_progress: 0, resolved: 0 };
    const catMap = new Map<ComplaintCategory, number>();
    let overdue = 0;
    const cutoff = Date.now() - threshold * 24 * 60 * 60 * 1000;

    for (const r of rows ?? []) {
      const row = r as any;
      byStatus[row.status as ComplaintStatus] += 1;
      catMap.set(row.category, (catMap.get(row.category) ?? 0) + 1);
      if (row.status !== "resolved" && new Date(row.created_at).getTime() < cutoff) overdue += 1;
    }

    const total = rows?.length ?? 0;
    const byCategory = Array.from(catMap.entries()).map(([category, count]) => ({ category, count }));
    const resolvedRate = total ? Math.round((byStatus.resolved / total) * 100) : 0;

    return { total, byStatus, byCategory, overdue, resolvedRate };
  });
