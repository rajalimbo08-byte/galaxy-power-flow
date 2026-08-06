import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Database, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchProfiles, fetchReports, fetchTickets } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/backup")({
  head: () => ({
    meta: [
      { title: "Backup Center · Galaxy Service Portal" },
      { name: "description", content: "Export Galaxy ticket, report and technician data as CSV, Excel or SQL." },
      { property: "og:title", content: "Backup Center · Galaxy Service Portal" },
      { property: "og:description", content: "Export Galaxy ticket, report and technician data as CSV, Excel or SQL." },
    ],
  }),
  component: BackupPage,
});

type Row = Record<string, unknown>;

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Row[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0] as Row);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function toSql(table: string, rows: Row[]) {
  if (rows.length === 0) return `-- no rows in ${table}\n`;
  const headers = Object.keys(rows[0] as Row);
  const lit = (v: unknown) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
  return rows
    .map((r) => `INSERT INTO public.${table} (${headers.join(", ")}) VALUES (${headers.map((h) => lit(r[h])).join(", ")});`)
    .join("\n");
}

function BackupPage() {
  const tickets = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });
  const reports = useQuery({ queryKey: ["reports"], queryFn: fetchReports });
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  const datasets: { key: string; label: string; rows: Row[] }[] = [
    { key: "tickets", label: "Tickets", rows: (tickets.data ?? []) as Row[] },
    { key: "service_reports", label: "Service Reports", rows: (reports.data ?? []) as Row[] },
    { key: "profiles", label: "Users & Technicians", rows: (profiles.data ?? []) as Row[] },
  ];

  const stamp = new Date().toISOString().slice(0, 10);

  function exportCsv(key: string, rows: Row[]) {
    if (!rows.length) return toast.error("Nothing to export yet");
    download(`galaxy-${key}-${stamp}.csv`, toCsv(rows), "text/csv;charset=utf-8");
    toast.success("CSV downloaded");
  }

  function exportExcel(key: string, rows: Row[]) {
    if (!rows.length) return toast.error("Nothing to export yet");
    // Excel opens UTF-8 CSV with BOM natively as a spreadsheet.
    download(`galaxy-${key}-${stamp}.xls.csv`, "\uFEFF" + toCsv(rows), "application/vnd.ms-excel");
    toast.success("Excel file downloaded");
  }

  function exportSql() {
    const all = datasets.map((d) => `-- ${d.label}\n${toSql(d.key, d.rows)}`).join("\n\n");
    download(`galaxy-backup-${stamp}.sql`, all, "application/sql");
    toast.success("SQL backup downloaded");
  }

  return (
    <div>
      <PageHeader
        title="Backup Center"
        description="Export portal data for offline archival. Restore support is planned for a future release."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {datasets.map((d) => (
          <Card key={d.key} className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{d.label}</CardTitle>
              <CardDescription>{d.rows.length} records</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => exportCsv(d.key, d.rows)}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportExcel(d.key, d.rows)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Full SQL Backup</CardTitle>
          <CardDescription>
            Standard PostgreSQL INSERT statements — restorable into any Postgres, Neon, RDS or self-hosted database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportSql}>
            <Database className="mr-2 h-4 w-4" /> Export SQL Backup
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}