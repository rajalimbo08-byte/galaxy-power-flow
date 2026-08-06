import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleEnum = z.enum(["super_admin", "admin", "manager", "technician"]);

const createUserSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(1).max(120),
  role: roleEnum,
  employee_id: z.string().trim().max(40).optional().nullable(),
  mobile: z.string().trim().max(20).optional().nullable(),
  zone: z.enum(["North", "South", "East", "West", "Central"]).optional().nullable(),
  state: z.string().trim().max(80).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  branch: z.string().trim().max(80).optional().nullable(),
  reporting_manager_id: z.string().uuid().optional().nullable(),
});

async function assertSuperAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (error || !data) throw new Error("Forbidden: Super Admin access required");
}

export const createPortalUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create user");

    const userId = created.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: data.full_name,
      email: data.email,
      employee_id: data.employee_id || null,
      mobile: data.mobile || null,
      zone: data.zone || null,
      state: data.state || null,
      city: data.city || null,
      branch: data.branch || null,
      reporting_manager_id: data.reporting_manager_id || null,
      status: "Active",
    });
    if (profileError) throw new Error(profileError.message);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (roleError) throw new Error(roleError.message);

    if (data.role === "manager") {
      await supabaseAdmin.from("manager_permissions").upsert({ user_id: userId }, { onConflict: "user_id" });
    }

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "user.create",
      entity: "profiles",
      entity_id: userId,
      details: { email: data.email, role: data.role },
    });

    return { id: userId };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string().uuid(), role: roleEnum }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    if (data.role === "manager") {
      await supabaseAdmin.from("manager_permissions").upsert({ user_id: data.user_id }, { onConflict: "user_id" });
    }
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "user.role_change",
      entity: "user_roles",
      entity_id: data.user_id,
      details: { role: data.role },
    });
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ user_id: z.string().uuid(), password: z.string().min(8).max(72) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.password });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "user.password_reset",
      entity: "profiles",
      entity_id: data.user_id,
    });
    return { ok: true };
  });

export const deletePortalUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context as never);
    if (data.user_id === context.userId) throw new Error("You cannot delete your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").delete().eq("id", data.user_id);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      action: "user.delete",
      entity: "profiles",
      entity_id: data.user_id,
    });
    return { ok: true };
  });