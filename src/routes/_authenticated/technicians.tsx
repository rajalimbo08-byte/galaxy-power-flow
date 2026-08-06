import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Mail } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchProfiles, fetchReports, fetchRoles, fetchTickets, type Profile } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/technicians")({
  head: () => ({
    meta: [
      { title: "Technicians · Galaxy Service Portal" },
      { name: "description", content: "Technician directory and performance analytics for Galaxy Online Power Systems." },
      { property: "og:title", content: "Technicians · Galaxy Service Portal" },
      { property: "og:description", content: "Technician directory and performance analytics for Galaxy Online Power Systems." },
    ],
  }),
  component: TechniciansPage,
});

function TechniciansPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);

  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const roles = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });
  const tickets = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });
  const reports = useQuery({ queryKey: ["reports"], queryFn: fetchReports });

  const technicians = useMemo(() => {
    const ids = new Set((roles.data ?? []).filter((r) => r.role === "technician").map((r) => r.user_id));
    return (profiles.data ?? []).filter((p) => ids.has(p.id));
  }, [profiles.data, roles.data]);

  const q = search.trim().toLowerCase();
  const rows = technicians.filter(
    (t) =>
      !q ||
      t.full_name.toLowerCase().includes(q) ||
      (t.employee_id ?? "").toLowerCase().includes(q) ||
      (t.city ?? "").toLowerCase().includes(q) ||
      (t.zone ?? "").toLowerCase().includes(q),
  );

  const statsFor = (id: string) => {
    const mine = (tickets.data ?? []).filter((t) => t.assigned_to === id);
    const closed = mine.filter((t) => t.status === "Closed");
    const durations = closed
      .filter((t) => t.closed_at)
      .map((t) => (new Date(t.closed_at as string).getTime() - new Date(t.created_at).getTime()) / 86_400_000);
    const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    return {
      visits: mine.filter((t) => t.visit_date).length,
      reports: (reports.data ?? []).filter((r) => r.technician_id === id).length,
      open: mine.filter((t) => t.status === "Open" || t.status === "Assigned").length,
      pending: mine.filter((t) => t.status === "In Progress").length,
      completed: mine.filter((t) => t.status === "Completed").length,
      closed: closed.length,
      recalls: mine.filter((t) => t.is_recall).length,
      avgDays: avg ? avg.toFixed(1) : "—",
    };
  };

  return (
    <div>
      <PageHeader title="Technicians" description="Directory and performance analytics. Click a technician for details." />

      <Input
        className="mb-4 max-w-md"
        placeholder="Search by name, employee ID, city or zone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {profiles.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No technicians yet. Add them from User Management.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((t) => {
            const s = statsFor(t.id);
            return (
              <Card
                key={t.id}
                className="cursor-pointer shadow-card transition-shadow hover:shadow-lg"
                onClick={() => setSelected(t)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{t.full_name}</p>
                      <p className="text-xs text-muted-foreground">{t.employee_id ?? "No employee ID"}</p>
                    </div>
                    <Badge variant="outline" className={t.status === "Active" ? "border-success/40 bg-success/10 text-success" : ""}>
                      {t.status}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {[t.city, t.state, t.zone].filter(Boolean).join(", ") || "Location not set"}
                    </p>
                    {t.mobile && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {t.mobile}
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5" />
                      {t.email}
                    </p>
                  </div>
                  <div className="mt-3 flex gap-4 border-t pt-3 text-xs">
                    <span>
                      <strong className="text-foreground">{s.visits}</strong> visits
                    </span>
                    <span>
                      <strong className="text-foreground">{s.reports}</strong> reports
                    </span>
                    <span>
                      <strong className="text-destructive">{s.recalls}</strong> recalls
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.full_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {[selected.employee_id, selected.branch, selected.zone].filter(Boolean).join(" · ")}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(statsFor(selected.id)).map(([k, v]) => (
                  <div key={k} className="rounded-md border bg-card p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {k === "avgDays" ? "Avg days" : k}
                    </p>
                    <p className="mt-1 text-xl font-bold">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}