import type { Database } from "@/integrations/supabase/types";

export type ComplaintCategory = Database["public"]["Enums"]["complaint_category"];
export type ComplaintStatus = Database["public"]["Enums"]["complaint_status"];
export type ComplaintPriority = Database["public"]["Enums"]["complaint_priority"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const CATEGORY_OPTIONS: { value: ComplaintCategory; label: string }[] = [
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "cleaning", label: "Cleaning" },
  { value: "water_supply", label: "Water Supply" },
  { value: "security", label: "Security" },
  { value: "lift", label: "Lift" },
  { value: "parking", label: "Parking" },
  { value: "others", label: "Others" },
];

export const STATUS_OPTIONS: { value: ComplaintStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

export const PRIORITY_OPTIONS: { value: ComplaintPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const categoryLabel = (v: ComplaintCategory) =>
  CATEGORY_OPTIONS.find((o) => o.value === v)?.label ?? v;
export const statusLabel = (v: ComplaintStatus) =>
  STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
export const priorityLabel = (v: ComplaintPriority) =>
  PRIORITY_OPTIONS.find((o) => o.value === v)?.label ?? v;
