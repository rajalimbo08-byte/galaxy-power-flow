import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Plus, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { createPortalUser, deletePortalUser, resetUserPassword, setUserRole } from "@/lib/admin.functions";
import { fetchProfiles, fetchRoles, ZONES } from "@/lib/queries";
import { PERMISSION_KEYS, PERMISSION_LABELS, ROLE_LABELS, useSession, type AppRole, type PermissionKey } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "User Management · Galaxy Service Portal" },
      { name: "description", content: "Create staff accounts, assign roles and tune manager permissions." },
      { property: "og:title", content: "User Management · Galaxy Service Portal" },
      { property: "og:description", content: "Create staff accounts, assign roles and tune manager permissions." },
    ],
  }),
  component: UsersPage,
});

const ROLES: AppRole[] = ["super_admin", "admin", "manager", "technician", "temp_technician"];

const EMPTY = {
  full_name: "",
  email: "",
  password: "",
  role: "technician" as AppRole,
  employee_id: "",
  mobile: "",
  zone: "",
  state: "",
  city: "",
  branch: "",
};

function UsersPage() {
  const { isSuperAdmin } = useSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [resetting, setResetting] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const createFn = useServerFn(createPortalUser);
  const roleFn = useServerFn(setUserRole);
  const resetFn = useServerFn(resetUserPassword);
  const deleteFn = useServerFn(deletePortalUser);

  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const roles = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });
  const permissions = useQuery({
    queryKey: ["manager_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("manager_permissions").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const roleOf = useMemo(() => {
    const map = new Map<string, AppRole>();
    for (const r of roles.data ?? []) map.set(r.user_id as string, r.role as AppRole);
    return map;
  }, [roles.data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
    queryClient.invalidateQueries({ queryKey: ["roles"] });
    queryClient.invalidateQueries({ queryKey: ["manager_permissions"] });
  };

  const create = useMutation({
    mutationFn: async () =>
      createFn({
        data: {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: form.role,
          employee_id: form.employee_id || null,
          mobile: form.mobile || null,
          zone: (form.zone || null) as never,
          state: form.state || null,
          city: form.city || null,
          branch: form.branch || null,
        },
      }),
    onSuccess: () => {
      toast.success("User created");
      setOpen(false);
      setForm({ ...EMPTY });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: (vars: { user_id: string; role: AppRole }) => roleFn({ data: vars }),
    onSuccess: () => {
      toast.success("Role updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeUser = useMutation({
    mutationFn: (user_id: string) => deleteFn({ data: { user_id } }),
    onSuccess: () => {
      toast.success("User deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doReset = useMutation({
    mutationFn: () => resetFn({ data: { user_id: resetting!.id, password: newPassword } }),
    onSuccess: () => {
      toast.success("Password reset");
      setResetting(null);
      setNewPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePermission = useMutation({
    mutationFn: async (vars: { user_id: string; key: PermissionKey; value: boolean }) => {
      const { error } = await supabase
        .from("manager_permissions")
        .upsert({ user_id: vars.user_id, [vars.key]: vars.value } as never, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manager_permissions"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isSuperAdmin) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Only a Super Admin can manage users.
        </CardContent>
      </Card>
    );
  }

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <PageHeader
        title="User Management"
        description="Create accounts, assign roles and configure manager permissions."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create User</DialogTitle>
                <DialogDescription>The account is active immediately — share the password securely.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Full Name *" value={form.full_name} onChange={(v) => set("full_name", v)} />
                <TextField label="Employee ID" value={form.employee_id} onChange={(v) => set("employee_id", v)} />
                <TextField label="Email *" value={form.email} onChange={(v) => set("email", v)} type="email" />
                <TextField label="Temporary Password *" value={form.password} onChange={(v) => set("password", v)} type="password" />
                <TextField label="Mobile Number" value={form.mobile} onChange={(v) => set("mobile", v)} />
                <div>
                  <Label className="mb-2 block">Role *</Label>
                  <Select value={form.role} onValueChange={(v) => set("role", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Zone</Label>
                  <Select value={form.zone} onValueChange={(v) => set("zone", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONES.map((z) => (
                        <SelectItem key={z} value={z}>
                          {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <TextField label="Branch" value={form.branch} onChange={(v) => set("branch", v)} />
                <TextField label="City" value={form.city} onChange={(v) => set("city", v)} />
                <TextField label="State" value={form.state} onChange={(v) => set("state", v)} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => create.mutate()} disabled={create.isPending}>
                  {create.isPending ? "Creating…" : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {profiles.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(profiles.data ?? []).map((p) => {
            const role = roleOf.get(p.id);
            const perms = (permissions.data ?? []).find((x) => (x as Record<string, unknown>)["user_id"] === p.id) as
              | Record<string, boolean>
              | undefined;
            return (
              <Card key={p.id} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="min-w-52 flex-1">
                      <p className="font-semibold">{p.full_name || "(no name)"}</p>
                      <p className="text-sm text-muted-foreground">{p.email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[p.employee_id, p.branch, p.zone].filter(Boolean).join(" · ") || "Profile incomplete"}
                      </p>
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      {role ? ROLE_LABELS[role] : "No role"}
                    </Badge>
                    <Select value={role ?? ""} onValueChange={(v) => changeRole.mutate({ user_id: p.id, role: v as AppRole })}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Set role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => setResetting({ id: p.id, name: p.full_name })}>
                      <KeyRound className="mr-2 h-4 w-4" /> Reset
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Delete ${p.full_name || p.email}? This cannot be undone.`)) removeUser.mutate(p.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {role === "manager" && (
                    <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
                      {PERMISSION_KEYS.map((key) => (
                        <label key={key} className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={Boolean(perms?.[key])}
                            onCheckedChange={(value) => togglePermission.mutate({ user_id: p.id, key, value })}
                          />
                          {PERMISSION_LABELS[key]}
                        </label>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!resetting} onOpenChange={(o) => !o && setResetting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Set a new password for {resetting?.name}.</DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            placeholder="New password (min 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetting(null)}>
              Cancel
            </Button>
            <Button onClick={() => doReset.mutate()} disabled={newPassword.length < 8 || doReset.isPending}>
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}