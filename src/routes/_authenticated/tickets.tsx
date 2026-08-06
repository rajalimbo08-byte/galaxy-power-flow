import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import {
  PRIORITIES,
  PRIORITY_STYLES,
  STATUS_STYLES,
  TICKET_STATUSES,
  ZONES,
  fetchProfiles,
  fetchRoles,
  fetchTickets,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({
    meta: [
      { title: "Tickets · Galaxy Service Portal" },
      { name: "description", content: "Create, assign and track UPS service tickets across all Galaxy branches." },
      { property: "og:title", content: "Tickets · Galaxy Service Portal" },
      { property: "og:description", content: "Create, assign and track UPS service tickets across all Galaxy branches." },
    ],
  }),
  component: TicketsPage,
});

const ticketSchema = z.object({
  customer_name: z.string().trim().min(1, "Customer name is required").max(150),
  company_name: z.string().trim().max(150).optional(),
  site_name: z.string().trim().max(150).optional(),
  site_address: z.string().trim().max(500).optional(),
  state: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  zone: z.enum(ZONES).optional(),
  contact_person: z.string().trim().max(120).optional(),
  contact_number: z.string().trim().max(20).optional(),
  complaint: z.string().trim().min(1, "Complaint is required").max(2000),
  ups_make: z.string().trim().max(80).optional(),
  ups_model: z.string().trim().max(80).optional(),
  ups_capacity: z.string().trim().max(80).optional(),
  ups_serial: z.string().trim().max(80).optional(),
  battery_details: z.string().trim().max(500).optional(),
  priority: z.enum(PRIORITIES),
  assigned_to: z.string().uuid().optional(),
  visit_date: z.string().optional(),
});

const EMPTY = {
  customer_name: "",
  company_name: "",
  site_name: "",
  site_address: "",
  state: "",
  city: "",
  zone: "",
  contact_person: "",
  contact_number: "",
  complaint: "",
  ups_make: "",
  ups_model: "",
  ups_capacity: "",
  ups_serial: "",
  battery_details: "",
  priority: "Medium",
  assigned_to: "",
  visit_date: "",
};

function TicketsPage() {
  const { isAdmin, isTechnician, can } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ ...EMPTY });

  const tickets = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const roles = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });

  const technicians = useMemo(() => {
    const techIds = new Set((roles.data ?? []).filter((r) => r.role === "technician").map((r) => r.user_id));
    return (profiles.data ?? []).filter((p) => techIds.has(p.id));
  }, [profiles.data, roles.data]);

  const createTicket = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const cleaned = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v !== "" && v !== undefined),
      );
      const parsed = ticketSchema.parse(cleaned);
      const { data: userData } = await supabase.auth.getUser();
      const payload = {
        ...parsed,
        status: parsed.assigned_to ? "Assigned" : "Open",
        created_by: userData.user?.id ?? null,
      };
      const { error } = await supabase.from("tickets").insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket created");
      setOpen(false);
      setForm({ ...EMPTY });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTicket = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("tickets").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket updated");
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (tickets.data ?? []).filter((t) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      t.ticket_number.toLowerCase().includes(q) ||
      t.customer_name.toLowerCase().includes(q) ||
      (t.site_name ?? "").toLowerCase().includes(q) ||
      (t.company_name ?? "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canCreate = isAdmin || can("can_create_tickets");
  const canAssign = isAdmin || can("can_assign_tickets");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <PageHeader
        title={isTechnician ? "My Assigned Tickets" : "Tickets"}
        description={
          isTechnician
            ? "Tickets currently assigned to you."
            : "Create, assign and track service tickets across PAN India."
        }
        action={
          canCreate ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> New Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Ticket</DialogTitle>
                  <DialogDescription>
                    Ticket number is generated automatically. Repeat complaints for the same site within 7 days are
                    flagged as recall visits.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Customer Name *" value={form["customer_name"]!} onChange={(v) => set("customer_name", v)} />
                  <Field label="Company Name" value={form["company_name"]!} onChange={(v) => set("company_name", v)} />
                  <Field label="Site Name" value={form["site_name"]!} onChange={(v) => set("site_name", v)} />
                  <Field label="Contact Person" value={form["contact_person"]!} onChange={(v) => set("contact_person", v)} />
                  <Field label="Contact Number" value={form["contact_number"]!} onChange={(v) => set("contact_number", v)} />
                  <Field label="City" value={form["city"]!} onChange={(v) => set("city", v)} />
                  <Field label="State" value={form["state"]!} onChange={(v) => set("state", v)} />
                  <SelectField
                    label="Zone"
                    value={form["zone"]!}
                    onChange={(v) => set("zone", v)}
                    options={[...ZONES]}
                  />
                  <div className="sm:col-span-2">
                    <Label className="mb-2 block">Site Address</Label>
                    <Textarea value={form["site_address"]} onChange={(e) => set("site_address", e.target.value)} rows={2} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="mb-2 block">Complaint *</Label>
                    <Textarea value={form["complaint"]} onChange={(e) => set("complaint", e.target.value)} rows={3} />
                  </div>
                  <Field label="UPS Make" value={form["ups_make"]!} onChange={(v) => set("ups_make", v)} />
                  <Field label="UPS Model" value={form["ups_model"]!} onChange={(v) => set("ups_model", v)} />
                  <Field label="UPS Capacity" value={form["ups_capacity"]!} onChange={(v) => set("ups_capacity", v)} />
                  <Field label="UPS Serial Number" value={form["ups_serial"]!} onChange={(v) => set("ups_serial", v)} />
                  <div className="sm:col-span-2">
                    <Label className="mb-2 block">Battery Details</Label>
                    <Textarea value={form["battery_details"]} onChange={(e) => set("battery_details", e.target.value)} rows={2} />
                  </div>
                  <SelectField
                    label="Priority"
                    value={form["priority"]!}
                    onChange={(v) => set("priority", v)}
                    options={[...PRIORITIES]}
                  />
                  <div>
                    <Label className="mb-2 block">Visit Date</Label>
                    <Input type="date" value={form["visit_date"]} onChange={(e) => set("visit_date", e.target.value)} />
                  </div>
                  {canAssign && (
                    <div className="sm:col-span-2">
                      <Label className="mb-2 block">Assign Technician</Label>
                      <Select value={form["assigned_to"] ?? ""} onValueChange={(v) => set("assigned_to", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          {technicians.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.full_name} {t.zone ? `· ${t.zone}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => createTicket.mutate(form)} disabled={createTicket.isPending}>
                    {createTicket.isPending ? "Creating…" : "Create Ticket"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search ticket number, customer or site…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {TICKET_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tickets.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No tickets yet. {canCreate ? "Create the first ticket to get started." : ""}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((t) => (
            <Card key={t.id} className="shadow-card">
              <CardContent className="flex flex-wrap items-start gap-4 p-4">
                <div className="min-w-56 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{t.ticket_number}</span>
                    <Badge variant="outline" className={STATUS_STYLES[t.status]}>
                      {t.status}
                    </Badge>
                    <Badge variant="outline" className={PRIORITY_STYLES[t.priority]}>
                      {t.priority}
                    </Badge>
                    {t.is_recall && (
                      <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
                        <RotateCcw className="mr-1 h-3 w-3" /> Recall
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 font-medium">
                    {t.customer_name}
                    {t.site_name ? ` · ${t.site_name}` : ""}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.complaint}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {[t.city, t.state, t.zone].filter(Boolean).join(", ")}
                    {t.visit_date ? ` · Visit ${t.visit_date}` : ""}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-56">
                  {canAssign && (
                    <Select
                      value={t.assigned_to ?? ""}
                      onValueChange={(v) =>
                        updateTicket.mutate({
                          id: t.id,
                          patch: { assigned_to: v, status: t.status === "Open" ? "Assigned" : t.status },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Assign technician" />
                      </SelectTrigger>
                      <SelectContent>
                        {technicians.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {(isAdmin || can("can_edit_tickets") || isTechnician) && (
                    <Select
                      value={t.status}
                      onValueChange={(v) =>
                        updateTicket.mutate({
                          id: t.id,
                          patch: { status: v, closed_at: v === "Closed" ? new Date().toISOString() : null },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TICKET_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}