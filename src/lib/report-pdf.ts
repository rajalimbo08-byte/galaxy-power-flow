import { jsPDF } from "jspdf";

import logo from "@/assets/galaxy-logo.png.asset.json";

export type ReportFields = Record<string, string | boolean | null | undefined>;

const NAVY = [26, 42, 92] as const;
const GREY = [110, 118, 135] as const;

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch(logo.url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export type PdfInput = {
  reportNumber: string;
  reportDate: string;
  fields: ReportFields;
  sections: { title: string; rows: [string, string][] }[];
  checks: { label: string; value: boolean }[];
  narrative: { label: string; value: string }[];
  photos: { caption: string; dataUrl: string }[];
  customerSignature: string | null;
  engineerSignature: string | null;
  engineerName: string;
  customerName: string;
};

export async function buildReportPdf(input: PdfInput): Promise<{ blob: Blob; base64: string }> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const logoData = await loadLogo();

  const header = () => {
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(0, 0, pageW, 74, "F");
    if (logoData) {
      try {
        doc.addImage(logoData, "PNG", margin, 16, 90, 42, undefined, "FAST");
      } catch {
        /* logo optional */
      }
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Service Report", pageW - margin, 34, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${input.reportNumber}  ·  ${input.reportDate}`, pageW - margin, 50, { align: "right" });
    doc.setTextColor(0, 0, 0);
    y = 96;
  };

  const footer = () => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text("Galaxy Online Power Systems · Service Management Portal", margin, pageH - 20);
      doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 20, { align: "right" });
    }
  };

  const space = (needed: number) => {
    if (y + needed > pageH - 50) {
      doc.addPage();
      header();
    }
  };

  const sectionTitle = (title: string) => {
    space(40);
    doc.setFillColor(240, 244, 250);
    doc.rect(margin, y, pageW - margin * 2, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(title.toUpperCase(), margin + 8, y + 14);
    doc.setTextColor(0, 0, 0);
    y += 28;
  };

  header();

  for (const section of input.sections) {
    const rows = section.rows.filter(([, v]) => v && v.trim().length > 0);
    if (!rows.length) continue;
    sectionTitle(section.title);
    const colW = (pageW - margin * 2) / 2;
    for (let i = 0; i < rows.length; i += 2) {
      space(24);
      const pair = [rows[i], rows[i + 1]];
      pair.forEach((row, idx) => {
        if (!row) return;
        const x = margin + idx * colW;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text(row[0], x, y);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(20, 24, 40);
        doc.text(doc.splitTextToSize(row[1], colW - 14), x, y + 13);
      });
      y += 32;
    }
  }

  if (input.checks.length) {
    sectionTitle("Installation / Service Checklist");
    for (const check of input.checks) {
      space(20);
      doc.setDrawColor(180, 188, 205);
      doc.rect(margin, y - 8, 10, 10);
      if (check.value) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(22, 122, 72);
        doc.text("X", margin + 2.4, y);
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(20, 24, 40);
      doc.text(check.label, margin + 20, y);
      y += 18;
    }
    y += 6;
  }

  const narrative = input.narrative.filter((n) => n.value && n.value.trim().length);
  if (narrative.length) {
    sectionTitle("Service Details");
    for (const item of narrative) {
      const lines = doc.splitTextToSize(item.value, pageW - margin * 2);
      space(24 + lines.length * 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.text(item.label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(20, 24, 40);
      doc.text(lines, margin, y + 14);
      y += 20 + lines.length * 12;
    }
  }

  if (input.photos.length) {
    sectionTitle("Site Photographs");
    const cellW = (pageW - margin * 2 - 12) / 2;
    const cellH = cellW * 0.72;
    for (let i = 0; i < input.photos.length; i += 2) {
      space(cellH + 30);
      for (let c = 0; c < 2; c++) {
        const photo = input.photos[i + c];
        if (!photo) continue;
        const x = margin + c * (cellW + 12);
        try {
          doc.addImage(photo.dataUrl, "JPEG", x, y, cellW, cellH, undefined, "FAST");
        } catch {
          /* skip unreadable image */
        }
        doc.setDrawColor(210, 216, 228);
        doc.rect(x, y, cellW, cellH);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.text(photo.caption, x, y + cellH + 11);
      }
      y += cellH + 26;
    }
  }

  space(120);
  sectionTitle("Sign-off");
  const sigW = (pageW - margin * 2 - 24) / 2;
  const sigs: [string, string, string | null][] = [
    ["Service Engineer", input.engineerName, input.engineerSignature],
    ["Customer", input.customerName, input.customerSignature],
  ];
  sigs.forEach(([role, name, sig], idx) => {
    const x = margin + idx * (sigW + 24);
    if (sig) {
      try {
        doc.addImage(sig, "JPEG", x, y, sigW, 56, undefined, "FAST");
      } catch {
        /* signature optional */
      }
    }
    doc.setDrawColor(150, 158, 175);
    doc.line(x, y + 60, x + sigW, y + 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(20, 24, 40);
    doc.text(name || "—", x, y + 74);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(role, x, y + 86);
  });

  footer();

  const blob = doc.output("blob");
  const base64 = (doc.output("datauristring") as string).split(",")[1] ?? "";
  return { blob, base64 };
}