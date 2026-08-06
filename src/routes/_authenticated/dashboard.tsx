import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProfiles, fetchReports, fetchTickets, type Ticket } from "@/lib/queries";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Galaxy Service Portal" },
      { name: "description", content: "Live ticket, report and technician metrics across all Galaxy zones." },
      { property: "og:title", content: "Dashboard · Galaxy Service Portal" },
      { property: "og:description", content: "Live ticket, report and technician metrics across all Galaxy zones." },
    ],
  }),
  component: Dashboard,
});

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function isToday(iso: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.toDateString() === n.toDateString();
}

function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-2 text-3xl font-bold ${tone ?? "text-foreground"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function countBy<T>(items: T[], key: (t: T) => string | null | undefined) {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item) || "Unspecified";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

function Dashboard() {
  const { session, isAdmin, can } = useSession();
  const tickets = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });
  const reports = useQuery({ queryKey: ["reports"], queryFn: fetchReports });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  if (tickets.isLoading || reports.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const all: Ticket[] = tickets.data ?? [];
  const reportRows = reports.data ?? [];
  const people = profiles.data ?? [];

  const byStatus = (s: string) => all.filter((t) => t.status === s).length;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const nameOf = (id: string | null) => people.find((p) => p.id === id)?.full_name ?? "Unassigned";

  const monthly = (() => {
    const map = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      map.set(d.toLocaleString("en-IN", { month: "short", year: "2-digit" }), 0);
    }
    for (const r of reportRows) {
      const key = new Date(r.report_date as string).toLocaleString("en-IN", { month: "short", year: "2-digit" });
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  })();

  return (
    <div>
      <PageHeader
        title={`Welcome, ${session?.profile?.full_name?.split(" ")[0] || "there"}`}
        description="Live overview of service operations across PAN India."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Tickets" value={all.length} />
        <StatCard label="Open" value={byStatus("Open")} tone="text-warning" />
        <StatCard label="Assigned" value={byStatus("Assigned")} tone="text-info" />
        <StatCard label="In Progress" value={byStatus("In Progress")} tone="text-primary" />
        <StatCard label="Completed" value={byStatus("Completed")} tone="text-success" />
        <StatCard label="Closed" value={byStatus("Closed")} />
        <StatCard label="Total Reports" value={reportRows.length} />
        <StatCard label="Today's Reports" value={reportRows.filter((r) => isToday(r.created_at as string)).length} />
        <StatCard label="Technicians" value={people.length} />
        <StatCard label="Today's Visits" value={all.filter((t) => t.visit_date === new Date().toISOString().slice(0, 10)).length} />
        <StatCard
          label="Monthly Visits"
          value={all.filter((t) => t.visit_date && new Date(t.visit_date) >= monthStart).length}
        />
        <StatCard label="Recall Visits" value={all.filter((t) => t.is_recall).length} tone="text-destructive" />
      </div>

      {(isAdmin || can("can_view_reports")) && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <ChartCard title="Tickets by Zone">
            <BarChart data={countBy(all, (t) => t.zone)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartCard>

          <ChartCard title="Ticket Status">
            <PieChart>
              <Pie data={countBy(all, (t) => t.status)} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>
                {countBy(all, (t) => t.status).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ChartCard>

          <ChartCard title="Tickets by State">
            <BarChart data={countBy(all, (t) => t.state).slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartCard>

          <ChartCard title="Tickets by Technician">
            <BarChart data={countBy(all, (t) => nameOf(t.assigned_to)).slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" allowDecimals={false} fontSize={12} />
              <YAxis type="category" dataKey="name" width={120} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="var(--color-chart-3)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartCard>

          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Reports</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="var(--color-chart-1)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}