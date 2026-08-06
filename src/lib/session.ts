import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "manager" | "technician" | "temp_technician";

export const PERMISSION_KEYS = [
  "can_create_tickets",
  "can_assign_tickets",
  "can_edit_tickets",
  "can_view_reports",
  "can_download_reports",
  "can_manage_technicians",
  "can_export_data",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  can_create_tickets: "Create Tickets",
  can_assign_tickets: "Assign Tickets",
  can_edit_tickets: "Edit Tickets",
  can_view_reports: "View Reports",
  can_download_reports: "Download Reports",
  can_manage_technicians: "Manage Technicians",
  can_export_data: "Export Data",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  technician: "Technician",
  temp_technician: "Temp Technician / Outsider",
};

export type SessionInfo = {
  userId: string;
  email: string;
  profile: {
    full_name: string;
    employee_id: string | null;
    zone: string | null;
    branch: string | null;
    city: string | null;
    state: string | null;
    mobile: string | null;
  } | null;
  roles: AppRole[];
  permissions: Record<PermissionKey, boolean>;
};

function emptyPerms(value: boolean): Record<PermissionKey, boolean> {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, value])) as Record<PermissionKey, boolean>;
}

export async function loadSession(): Promise<SessionInfo | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [profileRes, rolesRes, permsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, employee_id, zone, branch, city, state, mobile")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("manager_permissions").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const roles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
  const isAdmin = roles.includes("super_admin") || roles.includes("admin");
  const permissions = isAdmin ? emptyPerms(true) : emptyPerms(false);
  if (!isAdmin && permsRes.data) {
    for (const key of PERMISSION_KEYS) {
      permissions[key] = Boolean((permsRes.data as Record<string, unknown>)[key]);
    }
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    profile: profileRes.data ?? null,
    roles,
    permissions,
  };
}

export function useSession() {
  const query = useQuery({ queryKey: ["session"], queryFn: loadSession, staleTime: 60_000 });
  const session = query.data ?? null;
  const roles = session?.roles ?? [];
  return {
    ...query,
    session,
    roles,
    isSuperAdmin: roles.includes("super_admin"),
    isAdmin: roles.includes("super_admin") || roles.includes("admin"),
    isManager: roles.includes("manager"),
    isTechnician:
      (roles.includes("technician") || roles.includes("temp_technician")) && roles.length === 1,
    can: (key: PermissionKey) => Boolean(session?.permissions[key]),
  };
}