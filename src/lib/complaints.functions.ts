import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { notifyComplaintStatusChange } from "./email.server";
import type { ComplaintCategory, ComplaintPriority, ComplaintStatus } from "./constants";

const BUCKET = "complaint-images";

export type ComplaintRow = {
  id: string;
  residentId: string;
  residentName: string;
  flatNumber: string;
  category: ComplaintCategory;
  description: string;
  imagePath: string | null;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
};

export type ComplaintHistoryRow = {
  id: string;
  previousStatus: ComplaintStatus | null;
  newStatus: ComplaintStatus;
  priority: ComplaintPriority | null;
  adminName: string;
  note: string | null;
  createdAt: string;
};

async function isAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return data === true;
}

async function getThresholdDays(supabase: any) {
  const { data } = await supabase.from("app_settings").select("overdue_threshold_days").eq("id", 1).maybeSingle();
  return data?.overdue_threshold_days ?? 7;
}

function computeOverdue(status: ComplaintStatus, createdAt: string, thresholdDays: number) {
  if (status === "resolved") return false;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs > thresholdDays * 24 * 60 * 60 * 1000;
}

async function signImage(supabase: any, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

// ---- Resident: create complaint ----
export const createComplaint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        category: z.enum([
          "electrical",
          "plumbing",
          "cleaning",
          "water_supply",
          "security",
          "lift",
          "parking",
          "others",
        ]),
        description: z.string().trim().min(5, "Please describe the issue (min 5 chars)").max(2000),
        imagePath: z.string().trim().max(500).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const { data: complaint, error } = await supabase
      .from("complaints")
      .insert({
        resident_id: userId,
        category: data.category,
        description: data.description,
        image_url: data.imagePath || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Seed the timeline with a creation record (admin_name = the resident here).
    await supabase.from("complaint_history").insert({
      complaint_id: complaint.id,
      previous_status: null,
      new_status: "open",
      admin_name: profile?.full_name || "Resident",
      note: "Complaint submitted",
    });

    return { id: complaint.id };
  });

// ---- Resident: my complaints ----
export const getMyComplaints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ComplaintRow[]> => {
    const { supabase, userId } = context;
    const threshold = await getThresholdDays(supabase);
    const { data, error } = await supabase
      .from("complaints")
      .select("*")
      .eq("resident_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, flat_number")
      .eq("id", userId)
      .maybeSingle();

    return (data ?? []).map((c: any) => ({
      id: c.id,
      residentId: c.resident_id,
      residentName: profile?.full_name || "",
      flatNumber: profile?.flat_number || "",
      category: c.category,
      description: c.description,
      imagePath: c.image_url,
      status: c.status,
      priority: c.priority,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      isOverdue: computeOverdue(c.status, c.created_at, threshold),
    }));
  });

// ---- Shared: complaint detail + history ----
export const getComplaintDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const threshold = await getThresholdDays(supabase);

    const { data: c, error } = await supabase
      .from("complaints")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("Complaint not found");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, flat_number")
      .eq("id", c.resident_id)
      .maybeSingle();

    const { data: history } = await supabase
      .from("complaint_history")
      .select("*")
      .eq("complaint_id", data.id)
      .order("created_at", { ascending: true });

    const imageUrl = await signImage(supabase, c.image_url);

    const complaint: ComplaintRow = {
      id: c.id,
      residentId: c.resident_id,
      residentName: profile?.full_name || "",
      flatNumber: profile?.flat_number || "",
      category: c.category,
      description: c.description,
      imagePath: c.image_url,
      status: c.status,
      priority: c.priority,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      isOverdue: computeOverdue(c.status, c.created_at, threshold),
    };

    const timeline: ComplaintHistoryRow[] = (history ?? []).map((h: any) => ({
      id: h.id,
      previousStatus: h.previous_status,
      newStatus: h.new_status,
      priority: h.priority,
      adminName: h.admin_name,
      note: h.note,
      createdAt: h.created_at,
    }));

    return { complaint, imageUrl, timeline };
  });

// ---- Admin: list all with filters ----
export const getAllComplaints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        search: z.string().trim().max(200).optional(),
        category: z
          .enum([
            "electrical",
            "plumbing",
            "cleaning",
            "water_supply",
            "security",
            "lift",
            "parking",
            "others",
          ])
          .optional(),
        status: z.enum(["open", "in_progress", "resolved"]).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<ComplaintRow[]> => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");

    const threshold = await getThresholdDays(supabase);

    let query = supabase.from("complaints").select("*").order("created_at", { ascending: false });
    if (data.category) query = query.eq("category", data.category);
    if (data.status) query = query.eq("status", data.status);
    if (data.priority) query = query.eq("priority", data.priority);
    if (data.from) query = query.gte("created_at", new Date(data.from).toISOString());
    if (data.to) {
      const end = new Date(data.to);
      end.setHours(23, 59, 59, 999);
      query = query.lte("created_at", end.toISOString());
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.resident_id)));
    const profilesMap = new Map<string, { full_name: string; flat_number: string }>();
    if (ids.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, flat_number")
        .in("id", ids);
      (profiles ?? []).forEach((p: any) =>
        profilesMap.set(p.id, { full_name: p.full_name, flat_number: p.flat_number }),
      );
    }

    let result: ComplaintRow[] = (rows ?? []).map((c: any) => {
      const p = profilesMap.get(c.resident_id);
      return {
        id: c.id,
        residentId: c.resident_id,
        residentName: p?.full_name || "",
        flatNumber: p?.flat_number || "",
        category: c.category,
        description: c.description,
        imagePath: c.image_url,
        status: c.status,
        priority: c.priority,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        isOverdue: computeOverdue(c.status, c.created_at, threshold),
      };
    });

    if (data.search) {
      const q = data.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.description.toLowerCase().includes(q) ||
          c.residentName.toLowerCase().includes(q) ||
          c.flatNumber.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q),
      );
    }

    return result;
  });

// ---- Admin: update status / priority + note (+history +email) ----
export const updateComplaint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "in_progress", "resolved"]).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        note: z.string().trim().max(1000).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");

    const { data: current, error: curErr } = await supabase
      .from("complaints")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (curErr) throw new Error(curErr.message);
    if (!current) throw new Error("Complaint not found");
    if (current.status === "resolved") {
      throw new Error("This complaint is resolved and closed. It can no longer be modified.");
    }

    const newStatus = data.status ?? current.status;
    const newPriority = data.priority ?? current.priority;
    const statusChanged = newStatus !== current.status;

    const { error: updErr } = await supabase
      .from("complaints")
      .update({ status: newStatus, priority: newPriority })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const adminName = adminProfile?.full_name || "Administrator";

    // Record history whenever status changes OR a note/priority update is made.
    if (statusChanged || data.note || newPriority !== current.priority) {
      await supabase.from("complaint_history").insert({
        complaint_id: data.id,
        previous_status: current.status,
        new_status: newStatus,
        priority: newPriority,
        admin_name: adminName,
        note: data.note || null,
      });
    }

    if (statusChanged) {
      const { data: resident } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", current.resident_id)
        .maybeSingle();
      await notifyComplaintStatusChange({
        to: resident?.email || "",
        residentName: resident?.full_name || "Resident",
        complaintId: data.id,
        category: current.category,
        previousStatus: current.status,
        newStatus,
        note: data.note,
      });
    }

    return { ok: true };
  });
