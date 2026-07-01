import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { notifyImportantNotice } from "./email.server";

export type NoticeRow = {
  id: string;
  title: string;
  body: string;
  isImportant: boolean;
  createdAt: string;
  updatedAt: string;
};

async function isAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return data === true;
}

function mapNotice(n: any): NoticeRow {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    isImportant: n.is_important,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  };
}

export const getNotices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NoticeRow[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("notices")
      .select("*")
      .order("is_important", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapNotice);
  });

const noticeInput = z.object({
  title: z.string().trim().min(3, "Title is too short").max(150),
  body: z.string().trim().min(3, "Notice body is required").max(4000),
  isImportant: z.boolean().default(false),
});

export const createNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => noticeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");

    const { data: notice, error } = await supabase
      .from("notices")
      .insert({ title: data.title, body: data.body, is_important: data.isImportant, created_by: userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    if (data.isImportant) {
      const { data: residents } = await supabase.from("profiles").select("email");
      for (const r of residents ?? []) {
        await notifyImportantNotice({ to: (r as any).email || "", title: data.title, body: data.body });
      }
    }
    return mapNotice(notice);
  });

export const updateNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => noticeInput.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");
    const { error } = await supabase
      .from("notices")
      .update({ title: data.title, body: data.body, is_important: data.isImportant })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) throw new Error("Forbidden");
    const { error } = await supabase.from("notices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
