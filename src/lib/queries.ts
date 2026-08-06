import { supabase } from "@/integrations/supabase/client";

export type Ticket = {
  id: string;
  ticket_number: string;
  customer_name: string;
  company_name: string | null;
  site_name: string | null;
  site_address: string | null;
  state: string | null;
  city: string | null;
  zone: string | null;
  contact_person: string | null;
  contact_number: string | null;
  complaint: string;
  ups_make: string | null;
  ups_model: string | null;
  ups_capacity: string | null;
  ups_serial: string | null;
  battery_details: string | null;
  priority: string;
  assigned_to: string | null;
  visit_date: string | null;
  status: string;
  is_recall: boolean;
  created_at: string;
  closed_at: string | null;
};

export type Profile = {
  id: string;
  employee_id: string | null;
  full_name: string;
  email: string;
  mobile: string | null;
  zone: string | null;
  state: string | null;
  city: string | null;
  branch: string | null;
  reporting_manager_id: string | null;
  status: string;
};

export async function fetchTickets() {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as Ticket[];
}

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function fetchRoles() {
  const { data, error } = await supabase.from("user_roles").select("user_id, role");
  if (error) throw error;
  return data ?? [];
}

export async function fetchReports() {
  const { data, error } = await supabase
    .from("service_reports")
    .select(
      "id, report_number, report_date, technician_id, ticket_id, customer_name, site_name, company_name, work_done, pdf_url, submitted_at, created_at",
    )
    .order("report_date", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data ?? [];
}

export const TICKET_STATUSES = ["Open", "Assigned", "In Progress", "Completed", "Closed"] as const;
export const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export const ZONES = ["North", "South", "East", "West", "Central"] as const;

export const STATUS_STYLES: Record<string, string> = {
  Open: "bg-warning/15 text-warning-foreground border-warning/40",
  Assigned: "bg-info/15 text-info border-info/40",
  "In Progress": "bg-primary/15 text-primary border-primary/40",
  Completed: "bg-success/15 text-success border-success/40",
  Closed: "bg-muted text-muted-foreground border-border",
};

export const PRIORITY_STYLES: Record<string, string> = {
  Low: "bg-muted text-muted-foreground border-border",
  Medium: "bg-info/15 text-info border-info/40",
  High: "bg-warning/20 text-warning-foreground border-warning/50",
  Critical: "bg-destructive/15 text-destructive border-destructive/40",
};