import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { fetchProfiles, fetchReports, fetchTickets } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Service Reports · Galaxy Service Portal" },
      { name: "description", content: "Search and review Galaxy UPS service reports by number, ticket or customer." },
      { property: "og:title", content: "Service Reports · Galaxy Service Portal" },
      { property: "og:description", content: "Search and review Galaxy UPS service reports by number, ticket or customer." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const [search, setSearch] = useState("");
  const reports = useQuery({ queryKey: ["reports"], queryFn: fetchReports });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const tickets = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });

  const q = search.trim().toLowerCase();
  const ticketNumber = (id: string | null) =>
    (tickets.data ?? []).find((t) => t.id === id)?.ticket_number ?? "—";
  const techName = (id: string) => (profiles.data ?? []).find((p) => p.id === id)?.full_name ?? "Unknown";

  const rows = (reports.data ?? []).filter((r) => {
    if (!q) return true;
    return (
      String(r.report_number).toLowerCase().includes(q) ||
      String(r.customer_name ?? "").toLowerCase().includes(q) ||
      ticketNumber(r.ticket_id as string | null).toLowerCase().includes(q) ||
      techName(r.technician_id as string).toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Service Reports"
        description="Search by report number, ticket number, customer or technician."
      />

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search reports…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {reports.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No service reports yet. Technician report submission is the next module.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id as string} className="shadow-card">
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <FileText className="h-5 w-5 text-primary" />
                <div className="min-w-52 flex-1">
                  <p className="font-semibold">{String(r.report_number)}</p>
                  <p className="text-sm text-muted-foreground">
                    {String(r.customer_name ?? "—")} · {techName(r.technician_id as string)}
                  </p>
                </div>
                <Badge variant="outline">{ticketNumber(r.ticket_id as string | null)}</Badge>
                <span className="text-sm text-muted-foreground">{String(r.report_date)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}