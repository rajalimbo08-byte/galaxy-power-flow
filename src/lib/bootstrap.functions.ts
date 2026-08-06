import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** True only while the portal has no users at all — used for first-run setup. */
export const needsBootstrap = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true });
  if (error) return { needed: false };
  return { needed: (count ?? 0) === 0 };
});

const schema = z.object({
  full_name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});

/** Creates the very first Super Admin. Refuses once any role exists. */
export const createFirstSuperAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) throw new Error("Setup already completed. Ask your Super Admin for an account.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create account");

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: created.user.id, full_name: data.full_name, email: data.email, status: "Active" });
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: created.user.id, role: "super_admin" }, { onConflict: "user_id,role" });

    return { ok: true };
  });