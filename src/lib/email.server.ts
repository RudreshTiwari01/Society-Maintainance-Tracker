// Server-only email helpers for the Society Maintenance Tracker.
// Delivery is wired through the platform transactional email queue. Until a
// sender domain is configured these calls are safe no-ops so the app keeps working.
// All functions swallow errors: a failed notification must never break the
// underlying complaint/notice operation.

type StatusChangePayload = {
  to: string;
  residentName: string;
  complaintId: string;
  category: string;
  previousStatus: string;
  newStatus: string;
  note?: string | null;
};

type ImportantNoticePayload = {
  to: string;
  title: string;
  body: string;
};

async function enqueue(templateName: string, recipient: string, data: Record<string, unknown>) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // enqueue_email exists only after the email infrastructure is provisioned.
    await supabaseAdmin.rpc("enqueue_email" as never, {
      p_template_name: templateName,
      p_recipient_email: recipient,
      p_template_data: data,
    } as never);
  } catch (err) {
    console.warn(`[email] '${templateName}' to ${recipient} not sent (email not configured yet).`);
  }
}

export async function notifyComplaintStatusChange(p: StatusChangePayload) {
  if (!p.to) return;
  await enqueue("complaint-status-change", p.to, {
    residentName: p.residentName,
    complaintId: p.complaintId,
    category: p.category,
    previousStatus: p.previousStatus,
    newStatus: p.newStatus,
    note: p.note ?? "",
  });
}

export async function notifyImportantNotice(p: ImportantNoticePayload) {
  if (!p.to) return;
  await enqueue("important-notice", p.to, { title: p.title, body: p.body });
}
