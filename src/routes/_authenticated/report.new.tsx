import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { SignaturePad } from "@/components/SignaturePad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { ensureReportFolder, uploadToDrive } from "@/lib/drive.functions";
import { fetchTickets } from "@/lib/queries";
import { compressImage, formatBytes } from "@/lib/report-media";
import { buildReportPdf } from "@/lib/report-pdf";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/report/new")({
  head: () => ({
    meta: [
      { title: "New Service Report · Galaxy Service Portal" },
      {
        name: "description",
        content: "Capture UPS service details, site photos and signatures, then publish a signed PDF report.",
      },
      { property: "og:title", content: "New Service Report · Galaxy Service Portal" },
      {
        property: "og:description",
        content: "Capture UPS service details, site photos and signatures, then publish a signed PDF report.",
      },
    ],
  }),
  component: NewReportPage,
});

const PHOTO_SLOTS = [
  "UPS front view",
  "UPS rear / cabling",
  "Battery bank",
  "Battery terminals",
  "Earthing point",
  "Input panel / MCB",
  "Output load panel",
  "Display readings",
  "Site overview",
  "Additional evidence",
];

const CHECKS = [
  ["chk_ups_installed", "UPS installed & positioned correctly"],
  ["chk_battery_installed", "Battery bank installed and connected"],
  ["chk_earthing", "Earthing verified (< 1V N-E)"],
  ["chk_charging", "Battery charging confirmed"],
  ["chk_output_checked", "Output voltage & load checked"],
] as const;

type Photo = { caption: string; dataUrl: string; base64: string; size: number };

const INITIAL = {
  ticket_id: "",
  report_date: new Date().toISOString().slice(0, 10),
  customer_name: "",
  company_name: "",
  site_name: "",
  site_address: "",
  contact_number: "",
  ups_make: "",
  ups_model: "",
  ups_capacity: "",
  ups_serial: "",
  battery_make: "",
  battery_model: "",
  battery_qty: "",
  battery_serials: "",
  input_voltage: "",
  output_voltage: "",
  battery_voltage: "",
  frequency: "",
  load_pct: "",
  complaint: "",
  fault_found: "",
  root_cause: "",
  work_done: "",
  spare_parts: "",
  recommendations: "",
  remarks: "",
};

function NewReportPage() {
  const navigate = useNavigate();
  const { session } = useSession();
  const profile = session?.profile ?? null;
  const userId = session?.userId ?? null;
  const [form, setForm] = useState({ ...INITIAL });
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<Record<string, Photo>>({});
  const [customerSig, setCustomerSig] = useState<string | null>(null);
  const [engineerSig, setEngineerSig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");

  const folderFn = useServerFn(ensureReportFolder);
  const uploadFn = useServerFn(uploadToDrive);

  const tickets = useQuery({ queryKey: ["tickets"], queryFn: fetchTickets });
  const myTickets = useMemo(
    () => (tickets.data ?? []).filter((t) => !userId || t.assigned_to === userId || t.status !== "Closed"),
    [tickets.data, userId],
  );

  const set = (k: keyof typeof INITIAL, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function applyTicket(id: string) {
    set("ticket_id", id);
    const t = (tickets.data ?? []).find((x) => x.id === id);
    if (!t) return;
    setForm((f) => ({
      ...f,
      ticket_id: id,
      customer_name: t.customer_name ?? "",
      company_name: t.company_name ?? "",
      site_name: t.site_name ?? "",
      site_address: t.site_address ?? "",
      contact_number: t.contact_number ?? "",
      ups_make: t.ups_make ?? "",
      ups_model: t.ups_model ?? "",
      ups_capacity: t.ups_capacity ?? "",
      ups_serial: t.ups_serial ?? "",
      complaint: t.complaint ?? "",
    }));
  }

  async function onPhoto(caption: string, file: File | undefined) {
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setPhotos((p) => ({ ...p, [caption]: { caption, ...compressed } }));
    } catch {
      toast.error("Could not read that image");
    }
  }

  const photoList = PHOTO_SLOTS.map((c) => photos[c]).filter(Boolean) as Photo[];

  async function submit() {
    if (!form.customer_name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!form.work_done.trim()) {
      toast.error("Describe the work carried out");
      return;
    }
    if (!userId) {
      toast.error("Session expired — please sign in again");
      return;
    }

    setBusy(true);
    setProgress(4);
    setStage("Saving report…");

    try {
      const payload = {
        ticket_id: form.ticket_id || null,
        technician_id: userId,
        report_date: form.report_date,
        engineer_name: profile?.full_name ?? "",
        customer_name: form.customer_name,
        company_name: form.company_name || null,
        site_name: form.site_name || null,
        site_address: form.site_address || null,
        contact_number: form.contact_number || null,
        ups_make: form.ups_make || null,
        ups_model: form.ups_model || null,
        ups_capacity: form.ups_capacity || null,
        ups_serial: form.ups_serial || null,
        battery_make: form.battery_make || null,
        battery_model: form.battery_model || null,
        battery_qty: form.battery_qty ? Number(form.battery_qty) : null,
        battery_serials: form.battery_serials || null,
        input_voltage: form.input_voltage || null,
        output_voltage: form.output_voltage || null,
        battery_voltage: form.battery_voltage || null,
        frequency: form.frequency || null,
        load_pct: form.load_pct || null,
        complaint: form.complaint || null,
        fault_found: form.fault_found || null,
        root_cause: form.root_cause || null,
        work_done: form.work_done,
        spare_parts: form.spare_parts || null,
        recommendations: form.recommendations || null,
        remarks: form.remarks || null,
        chk_ups_installed: !!checks["chk_ups_installed"],
        chk_battery_installed: !!checks["chk_battery_installed"],
        chk_earthing: !!checks["chk_earthing"],
        chk_charging: !!checks["chk_charging"],
        chk_output_checked: !!checks["chk_output_checked"],
        submitted_at: new Date().toISOString(),
      };

      const { data: report, error } = await supabase
        .from("service_reports")
        .insert(payload as never)
        .select("id, report_number")
        .single();
      if (error) throw error;
      const reportRow = report as { id: string; report_number: string };

      setProgress(12);
      setStage("Preparing Google Drive folder…");
      const { folderId } = await folderFn({ data: { reportNumber: reportRow.report_number } });

      const attachments: {
        report_id: string;
        kind: string;
        file_name: string;
        drive_file_id: string;
        drive_folder_id: string;
        drive_link: string;
        mime_type: string;
        size_bytes: number | null;
      }[] = [];

      // Photos and signatures are embedded in the PDF — nothing else is filed to Drive.
      setStage("Generating PDF…");
      setProgress(45);
      const { base64: pdfBase64 } = await buildReportPdf({
        reportNumber: reportRow.report_number,
        reportDate: form.report_date,
        visitType: checks["chk_ups_installed"] ? "installation" : "breakdown",
        siteAddress: [form.company_name, form.site_name, form.site_address].filter(Boolean).join(", "),
        contactPerson: form.customer_name,
        contactNumber: form.contact_number,
        email: "",
        item: form.ups_make || "UPS",
        model: form.ups_model,
        rating: form.ups_capacity,
        serialNo: form.ups_serial,
        systemDcVolt: form.battery_voltage,
        batteryMake: form.battery_make,
        batteryAh: form.battery_model,
        batteryQty: form.battery_qty,
        siteParams: [
          ["ADEQUATE SPACE", ""],
          ["PROPER VENTILATION", ""],
          ["INPUT WIRE SIZE", ""],
          ["OUTPUT WIRE SIZE", ""],
          ["INPUT MCB RATING", ""],
          ["OUTPUT MCB RATING", ""],
          ["EARTHING : INPUT / OUTPUT", checks["chk_earthing"] ? "OK" : ""],
          ["ROOM TEMPERATURE", ""],
          ["ANY OTHER REMARK", ""],
        ],
        physicalChecks: [
          ["TRANSPORT DAMAGE", ""],
          ["SYSTEM PACKED/UNPACKED", ""],
          ["SCRATCHES ON CABINET", ""],
          ["WHEEL/BASE DAMAGE", ""],
          ["ANY SHORT ITEM", ""],
          ["DATE OF DELIVERY", ""],
          ["ON/OFF SWITCH OPERATIONS", checks["chk_output_checked"] ? "OK" : ""],
          ["DISPLAY PROPER WORKING", checks["chk_output_checked"] ? "OK" : ""],
          ["OPERATIONAL TRAINING GIVEN TO", ""],
        ],
        actionTaken: [form.complaint, form.fault_found, form.root_cause, form.work_done]
          .filter((t) => t && t.trim())
          .join(" | "),
        spares: form.spare_parts,
        batteryVolts: form.battery_serials
          ? []
          : [],
        unit: {
          inputR: form.input_voltage,
          inputY: "",
          inputB: "",
          inputNE: "",
          outputR: form.output_voltage,
          outputY: "",
          outputB: "",
          outputNE: "",
          charging: checks["chk_charging"] ? "YES" : "",
          discharging: "",
          readingDiff: "",
          dg: "",
        },
        connectedLoads: form.load_pct ? `${form.load_pct} %` : "",
        customerRemarks: [form.remarks, form.recommendations].filter((t) => t && t.trim()).join(" | "),
        engineerName: profile?.full_name ?? "",
        engineerMobile: profile?.mobile ?? "",
        timeIn: "",
        timeOut: "",
        customerName: form.customer_name,
        customerMobile: form.contact_number,
        customerDesignation: "",
        customerSignature: customerSig,
        engineerSignature: engineerSig,
        photos: photoList.map((p) => ({ caption: p.caption, dataUrl: p.dataUrl })),
      });

      setStage("Uploading PDF to Google Drive…");
      setProgress(75);
      const pdfName = `${reportRow.report_number}-service-report.pdf`;
      const pdf = await uploadFn({
        data: { folderId, fileName: pdfName, mimeType: "application/pdf", base64: pdfBase64 },
      });
      attachments.push({
        report_id: reportRow.id,
        kind: "pdf",
        file_name: pdfName,
        drive_file_id: pdf.id,
        drive_folder_id: folderId,
        drive_link: pdf.link,
        mime_type: "application/pdf",
        size_bytes: pdf.size,
      });
      setProgress(90);

      setStage("Finalising…");
      await supabase
        .from("service_reports")
        .update({
          drive_folder_id: folderId,
          pdf_drive_id: pdf.id,
          pdf_url: pdf.link,
          customer_signature_drive_id: null,
          customer_signature_url: null,
          engineer_signature_drive_id: null,
          engineer_signature_url: null,
        } as never)
        .eq("id", reportRow.id);

      if (attachments.length) {
        await supabase.from("report_attachments").insert(attachments as never);
      }

      if (form.ticket_id) {
        await supabase
          .from("tickets")
          .update({ status: "Completed", closed_at: new Date().toISOString() } as never)
          .eq("id", form.ticket_id);
      }

      setProgress(100);
      // Drop in-memory photo/signature data once the PDF is filed.
      setPhotos({});
      setCustomerSig(null);
      setEngineerSig(null);
      toast.success(`${reportRow.report_number} submitted and saved to Google Drive`);
      navigate({ to: "/reports" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit the report");
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="New Service Report"
        description="Fill the visit details, attach site photos and capture signatures. The PDF is filed to Google Drive automatically."
      />

      <div className="space-y-5">
        <Section title="Visit">
          <div>
            <Label className="mb-2 block">Linked Ticket</Label>
            <Select value={form.ticket_id} onValueChange={applyTicket}>
              <SelectTrigger>
                <SelectValue placeholder="Select ticket (optional)" />
              </SelectTrigger>
              <SelectContent>
                {myTickets.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.ticket_number} · {t.customer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label="Report Date" value={form.report_date} onChange={(v) => set("report_date", v)} type="date" />
          <Field label="Customer Name *" value={form.customer_name} onChange={(v) => set("customer_name", v)} />
          <Field label="Company" value={form.company_name} onChange={(v) => set("company_name", v)} />
          <Field label="Site Name" value={form.site_name} onChange={(v) => set("site_name", v)} />
          <Field label="Contact Number" value={form.contact_number} onChange={(v) => set("contact_number", v)} />
          <div className="sm:col-span-2">
            <Label className="mb-2 block">Site Address</Label>
            <Textarea
              rows={2}
              value={form.site_address}
              onChange={(e) => set("site_address", e.target.value)}
            />
          </div>
        </Section>

        <Section title="UPS & Battery">
          <Field label="UPS Make" value={form.ups_make} onChange={(v) => set("ups_make", v)} />
          <Field label="UPS Model" value={form.ups_model} onChange={(v) => set("ups_model", v)} />
          <Field label="Capacity (kVA)" value={form.ups_capacity} onChange={(v) => set("ups_capacity", v)} />
          <Field label="UPS Serial" value={form.ups_serial} onChange={(v) => set("ups_serial", v)} />
          <Field label="Battery Make" value={form.battery_make} onChange={(v) => set("battery_make", v)} />
          <Field label="Battery Model" value={form.battery_model} onChange={(v) => set("battery_model", v)} />
          <Field label="Battery Qty" value={form.battery_qty} onChange={(v) => set("battery_qty", v)} type="number" />
          <Field label="Battery Serials" value={form.battery_serials} onChange={(v) => set("battery_serials", v)} />
        </Section>

        <Section title="Electrical Readings">
          <Field label="Input Voltage (V)" value={form.input_voltage} onChange={(v) => set("input_voltage", v)} />
          <Field label="Output Voltage (V)" value={form.output_voltage} onChange={(v) => set("output_voltage", v)} />
          <Field label="Battery Voltage (V)" value={form.battery_voltage} onChange={(v) => set("battery_voltage", v)} />
          <Field label="Frequency (Hz)" value={form.frequency} onChange={(v) => set("frequency", v)} />
          <Field label="Load %" value={form.load_pct} onChange={(v) => set("load_pct", v)} />
        </Section>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Checklist</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {CHECKS.map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={!!checks[key]}
                  onCheckedChange={(v) => setChecks((c) => ({ ...c, [key]: v === true }))}
                />
                {label}
              </label>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Service Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {(
              [
                ["complaint", "Complaint reported"],
                ["fault_found", "Fault found"],
                ["root_cause", "Root cause"],
                ["work_done", "Work carried out *"],
                ["spare_parts", "Spare parts used"],
                ["recommendations", "Recommendations"],
                ["remarks", "Remarks"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label className="mb-2 block">{label}</Label>
                <Textarea rows={2} value={form[key]} onChange={(e) => set(key, e.target.value)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">
              Site Photographs
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {photoList.length}/10 attached · auto-compressed
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PHOTO_SLOTS.map((caption) => {
              const photo = photos[caption];
              return (
                <div key={caption} className="rounded-lg border border-border p-2">
                  <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {photo ? (
                      <>
                        <img src={photo.dataUrl} alt={caption} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setPhotos((p) => {
                              const next = { ...p };
                              delete next[caption];
                              return next;
                            })
                          }
                          className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-destructive"
                          aria-label={`Remove ${caption}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                        <Camera className="h-5 w-5" />
                        Tap to add
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => onPhoto(caption, e.target.files?.[0])}
                        />
                      </label>
                    )}
                  </div>
                  <p className="mt-2 truncate text-xs font-medium">{caption}</p>
                  {photo && <p className="text-xs text-muted-foreground">{formatBytes(photo.size)}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Signatures</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <SignaturePad label={`Service Engineer — ${profile?.full_name ?? ""}`} onChange={setEngineerSig} />
            <SignaturePad label="Customer" onChange={setCustomerSig} />
          </CardContent>
        </Card>

        {busy && (
          <Card className="shadow-card">
            <CardContent className="p-4">
              <p className="mb-2 flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> {stage}
              </p>
              <Progress value={progress} />
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/reports" })} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Submitting…" : "Submit & file to Drive"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function Field({
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