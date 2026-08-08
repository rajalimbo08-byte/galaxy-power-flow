import { jsPDF } from "jspdf";

import logo from "@/assets/galaxy-logo.png.asset.json";

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
  visitType: "installation" | "breakdown" | "preventive" | null;
  siteAddress: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
  item: string;
  model: string;
  rating: string;
  serialNo: string;
  systemDcVolt: string;
  batteryMake: string;
  batteryAh: string;
  batteryQty: string;
  siteParams: [string, string][];
  physicalChecks: [string, string][];
  actionTaken: string;
  spares: string;
  batteryVolts: string[];
  unit: {
    inputR: string;
    inputY: string;
    inputB: string;
    inputNE: string;
    outputR: string;
    outputY: string;
    outputB: string;
    outputNE: string;
    charging: string;
    discharging: string;
    readingDiff: string;
    dg: string;
  };
  connectedLoads: string;
  customerRemarks: string;
  engineerName: string;
  engineerMobile: string;
  timeIn: string;
  timeOut: string;
  customerName: string;
  customerMobile: string;
  customerDesignation: string;
  customerSignature: string | null;
  engineerSignature: string | null;
  photos: { caption: string; dataUrl: string }[];
};

const F = "helvetica";

export async function buildReportPdf(input: PdfInput): Promise<{ blob: Blob; base64: string }> {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth(); // 595
  const pageH = doc.internal.pageSize.getHeight(); // 842
  const M = 28;
  const W = pageW - M * 2;
  const logoData = await loadLogo();

  doc.setLineWidth(0.7);
  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);

  const label = (t: string, x: number, y: number, size = 7.2) => {
    doc.setFont(F, "bold");
    doc.setFontSize(size);
    doc.text(t, x, y);
  };
  const value = (t: string, x: number, y: number, maxW?: number, size = 8) => {
    if (!t) return;
    doc.setFont(F, "normal");
    doc.setFontSize(size);
    doc.text(maxW ? (doc.splitTextToSize(t, maxW) as string[])[0] ?? "" : t, x, y);
  };
  const tick = (checked: boolean, x: number, y: number, w = 26, h = 11) => {
    doc.rect(x, y, w, h);
    if (checked) {
      doc.setFont(F, "bold");
      doc.setFontSize(9);
      doc.text("X", x + w / 2 - 2.6, y + h - 2.6);
    }
  };

  /* ---------------- Header ---------------- */
  let y = M;
  if (logoData) {
    try {
      doc.addImage(logoData, "PNG", M, y - 4, 92, 26, undefined, "FAST");
    } catch {
      /* logo optional */
    }
  }
  doc.setFont(F, "bold");
  doc.setFontSize(13);
  doc.text("FIELD SERVICE REPORT", pageW / 2 + 10, y + 12, { align: "center" });

  doc.setFontSize(7.5);
  doc.text("Report No.:", pageW - M - 118, y + 10);
  doc.text("Date", pageW - M - 118, y + 24);
  doc.setFont(F, "normal");
  doc.setFontSize(10);
  doc.text(input.reportNumber, pageW - M - 62, y + 10);
  doc.text(input.reportDate, pageW - M - 62, y + 24);
  doc.line(pageW - M - 64, y + 12.5, pageW - M, y + 12.5);
  doc.line(pageW - M - 64, y + 26.5, pageW - M, y + 26.5);

  y += 34;

  /* -------------- Visit type row -------------- */
  const typeH = 15;
  doc.rect(M, y, W, typeH);
  label("INSTALLATION CERTIFICATE", M + 4, y + 10);
  tick(input.visitType === "installation", M + 120, y + 2.5);
  label("BREAK DOWN", M + 168, y + 10);
  tick(input.visitType === "breakdown", M + 232, y + 2.5);
  label("PREVENTIVE MAINTENANCE", M + 285, y + 10);
  tick(input.visitType === "preventive", M + 400, y + 2.5);
  y += typeH;

  /* -------------- Customer / Unit block -------------- */
  const leftW = W * 0.55;
  const rightX = M + leftW;
  const rightW = W - leftW;
  const unitRows: [string, string][] = [
    ["ITEM", input.item],
    ["MODEL", input.model],
    ["RATING", input.rating],
    ["SR.NO", input.serialNo],
    ["SYSTEM DC VOLT", input.systemDcVolt],
    ["BATTERY MAKE", input.batteryMake],
    ["BATTERY AH", input.batteryAh],
    ["BATTERY QTY", input.batteryQty],
  ];
  const unitRowH = 13;
  const blockH = unitRowH * (unitRows.length + 1);

  doc.rect(M, y, leftW, blockH);
  doc.rect(rightX, y, rightW, blockH);

  // right column rows
  label("PREVENTIVE MAINTENANCE", rightX + 4, y + 9.5);
  doc.line(rightX, y + unitRowH, rightX + rightW, y + unitRowH);
  const unitLabelW = rightW * 0.52;
  unitRows.forEach(([k, v], i) => {
    const ry = y + unitRowH * (i + 1);
    doc.line(rightX, ry + unitRowH, rightX + rightW, ry + unitRowH);
    doc.line(rightX + unitLabelW, ry, rightX + unitLabelW, ry + unitRowH);
    label(k, rightX + 4, ry + 9.5);
    value(v, rightX + unitLabelW + 4, ry + 9.5, rightW - unitLabelW - 8);
  });

  // left column
  label("CUSTOMER SITE  ADDRESS & BRANCH  CODE/ID:", M + 4, y + 9.5);
  doc.line(M, y + unitRowH, M + leftW, y + unitRowH);
  const addrLines = doc.splitTextToSize(input.siteAddress || "", leftW - 10) as string[];
  doc.setFont(F, "normal");
  doc.setFontSize(8.5);
  addrLines.slice(0, 4).forEach((line, i) => doc.text(line, M + 5, y + unitRowH + 12 + i * 11));

  const contactTop = y + blockH - unitRowH * 3;
  const contactLabelW = leftW * 0.42;
  ([
    ["CONTACT PERSON", input.contactPerson],
    ["CONTACT NUMBER", input.contactNumber],
    ["EMAIL ID", input.email],
  ] as [string, string][]).forEach(([k, v], i) => {
    const ry = contactTop + unitRowH * i;
    doc.line(M, ry, M + leftW, ry);
    doc.line(M + contactLabelW, ry, M + contactLabelW, ry + unitRowH);
    label(k, M + 5, ry + 9.5);
    value(v, M + contactLabelW + 5, ry + 9.5, leftW - contactLabelW - 10);
  });

  y += blockH;

  /* -------------- Parameters / Physical verification -------------- */
  const hdrH = 12;
  doc.rect(M, y, leftW, hdrH);
  doc.rect(rightX, y, rightW, hdrH);
  label("SITE/ENVIRONMENT PARAMETERS:", M + 4, y + 8.8);
  label("PHYSICAL VERIFICATION:", rightX + 4, y + 8.8);
  y += hdrH;

  const paramRowH = 12.6;
  const rows = Math.max(input.siteParams.length, input.physicalChecks.length);
  const paramsH = paramRowH * rows;
  doc.rect(M, y, leftW, paramsH);
  doc.rect(rightX, y, rightW, paramsH);
  const lvW = leftW * 0.55;
  const rvW = rightW * 0.7;
  doc.line(M + lvW, y, M + lvW, y + paramsH);
  doc.line(rightX + rvW, y, rightX + rvW, y + paramsH);
  for (let i = 0; i < rows; i++) {
    const ry = y + paramRowH * i;
    if (i > 0) {
      doc.line(M, ry, M + leftW, ry);
      doc.line(rightX, ry, rightX + rightW, ry);
    }
    const lp = input.siteParams[i];
    if (lp) {
      label(lp[0], M + 5, ry + 9);
      value(lp[1], M + lvW + 5, ry + 9, leftW - lvW - 10);
    }
    const rp = input.physicalChecks[i];
    if (rp) {
      label(rp[0], rightX + 5, ry + 9);
      value(rp[1], rightX + rvW + 5, ry + 9, rightW - rvW - 10);
    }
  }
  y += paramsH;

  /* -------------- Action taken -------------- */
  const textBlock = (title: string, text: string, lines: number) => {
    const h = 12 + lines * 12;
    doc.rect(M, y, W, h);
    label(title, M + 4, y + 8.8);
    doc.setFont(F, "normal");
    doc.setFontSize(8.5);
    (doc.splitTextToSize(text || "", W - 12) as string[])
      .slice(0, lines)
      .forEach((line, i) => doc.text(line, M + 6, y + 21 + i * 12));
    y += h;
  };
  textBlock("ACTION TAKEN:", input.actionTaken, 3);
  textBlock("SPARES REPLACEMENT IF ANY:", input.spares, 2);

  /* -------------- Battery volt grid -------------- */
  const gridHdrH = 12;
  doc.rect(M, y, W, gridHdrH);
  label("INDIVIDUAL BATTERY VOLT:BATTERY BATCH NO:", M + 4, y + 8.8);
  y += gridHdrH;
  const cellH = 14;
  const cols = 10;
  const cellW = W / cols;
  const numW = cellW * 0.3;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < cols; c++) {
      const x = M + c * cellW;
      const ry = y + r * cellH;
      doc.rect(x, ry, cellW, cellH);
      doc.line(x + numW, ry, x + numW, ry + cellH);
      const n = c * 4 + r + 1;
      doc.setFont(F, "normal");
      doc.setFontSize(7);
      doc.text(String(n), x + 2.5, ry + 9.5);
      const v = input.batteryVolts[n - 1];
      if (v) {
        doc.setFontSize(7.5);
        doc.text(v, x + numW + 2.5, ry + 9.5);
      }
    }
  }
  y += cellH * 4;

  /* -------------- Unit parameters -------------- */
  doc.rect(M, y, W, 12);
  label("UNIT  PARAMETERS:", M + 4, y + 8.8);
  y += 12;

  const upH = 26;
  const upW = W * 0.52;
  const cellSlots = (rowY: number, vals: [string, string, string, string]) => {
    const slotW = (upW - 60) / 4;
    const marks = ["R", "Y", "B", "NE"];
    for (let i = 0; i < 4; i++) {
      const x = M + 60 + i * slotW;
      doc.line(x, rowY, x, rowY + upH);
      doc.setFont(F, "bold");
      doc.setFontSize(6.6);
      doc.text(marks[i] ?? "", x + 2, rowY + 9);
      doc.setFont(F, "normal");
      doc.setFontSize(7.5);
      doc.text(vals[i] || "", x + 12, rowY + 9);
      doc.setFont(F, "bold");
      doc.setFontSize(6.6);
      doc.text("V", x + slotW - 8, rowY + 9);
      doc.text("A", x + slotW - 8, rowY + 21);
    }
  };
  // input row
  doc.rect(M, y, upW, upH);
  label("INPUT", M + 4, y + 10);
  label("VOLT/AMP", M + 4, y + 20, 6.4);
  doc.line(M + 60, y, M + 60, y + upH);
  doc.line(M + 60, y + upH / 2, M + upW, y + upH / 2);
  cellSlots(y, [input.unit.inputR, input.unit.inputY, input.unit.inputB, input.unit.inputNE]);
  // right side charging
  doc.rect(M + upW, y, W - upW, upH);
  doc.line(M + upW, y + upH / 2, M + W, y + upH / 2);
  label("CHARGING", M + upW + 4, y + 10);
  value(input.unit.charging, M + upW + 90, y + 10, W - upW - 95);
  label("DISCHARGING", M + upW + 4, y + upH - 6);
  value(input.unit.discharging, M + upW + 90, y + upH - 6, W - upW - 95);
  y += upH;

  // output row
  doc.rect(M, y, upW, upH);
  label("OUTPUT", M + 4, y + 10);
  label("VOLT/AMP", M + 4, y + 20, 6.4);
  doc.line(M + 60, y, M + 60, y + upH);
  doc.line(M + 60, y + upH / 2, M + upW, y + upH / 2);
  cellSlots(y, [input.unit.outputR, input.unit.outputY, input.unit.outputB, input.unit.outputNE]);
  doc.rect(M + upW, y, W - upW, upH);
  doc.line(M + upW, y + upH / 2, M + W, y + upH / 2);
  label("READING DIFFERENCE IN DISPLAY-Y/N", M + upW + 4, y + 10, 6.8);
  value(input.unit.readingDiff, M + W - 60, y + 10, 55);
  label("DIESEL GENERATOR- KVA & AUTO/MANUAL", M + upW + 4, y + upH - 6, 6.8);
  value(input.unit.dg, M + W - 60, y + upH - 6, 55);
  y += upH;

  /* -------------- Connected loads / remarks -------------- */
  const inlineRow = (title: string, text: string, h: number) => {
    doc.rect(M, y, W, h);
    label(title, M + 4, y + 9);
    doc.setFont(F, "normal");
    doc.setFontSize(8.5);
    (doc.splitTextToSize(text || "", W - 150) as string[])
      .slice(0, Math.max(1, Math.floor((h - 4) / 11)))
      .forEach((line, i) => doc.text(line, M + 140, y + 9 + i * 11));
    y += h;
  };
  inlineRow("CONNECTED  LOADS:", input.connectedLoads, 16);
  inlineRow("CUSTOMER  REMARKS IF ANY:", input.customerRemarks, 40);

  /* -------------- Sign-off -------------- */
  const signH = 74;
  doc.rect(M, y, W, signH);
  const half = W * 0.55;
  doc.line(M + half, y, M + half, y + signH);

  label("ENGINEER'S NAME:", M + 4, y + 12);
  value(input.engineerName, M + 96, y + 12, half - 105, 9);
  label("MOB:", M + 4, y + 28);
  value(input.engineerMobile, M + 96, y + 28, half - 105, 9);
  label("SIGNATURE:", M + 4, y + 44);
  label("TIME IN :", M + 4, y + 62);
  value(input.timeIn, M + 48, y + 62, 60, 8.5);
  label("TIME OUT :", M + 120, y + 62);
  value(input.timeOut, M + 172, y + 62, 60, 8.5);
  if (input.engineerSignature) {
    try {
      doc.addImage(input.engineerSignature, "JPEG", M + 96, y + 32, 110, 30, undefined, "FAST");
    } catch {
      /* optional */
    }
  }

  label("CUSTOMER  STAMP&SIGN:", M + half + 4, y + 12);
  label("NAME:", M + half + 4, y + 28);
  value(input.customerName, M + half + 46, y + 28, W - half - 55, 9);
  label("MOB:", M + half + 4, y + 44);
  value(input.customerMobile, M + half + 46, y + 44, W - half - 55, 9);
  label("DESIGNATION:", M + half + 4, y + 60);
  value(input.customerDesignation, M + half + 74, y + 60, W - half - 82, 9);
  if (input.customerSignature) {
    try {
      doc.addImage(input.customerSignature, "JPEG", M + half + 120, y + 16, 100, 42, undefined, "FAST");
    } catch {
      /* optional */
    }
  }
  y += signH;

  /* -------------- Footer -------------- */
  doc.setFont(F, "bold");
  doc.setFontSize(8.5);
  doc.text("GALAXY ONLINE POWER SYSTEMS PVT. LTD. / GALAXY UPS SYSTEMS", pageW / 2, y + 12, {
    align: "center",
  });
  doc.setFont(F, "normal");
  doc.setFontSize(7.5);
  doc.text("A-97, Sector - 58, Noida 201301 Uttar Pradesh", pageW / 2, y + 23, { align: "center" });
  doc.setFont(F, "bold");
  doc.setFontSize(9);
  doc.text("CUSTOMER SUPPORT NUMBER : 9310017756   |   MAIL ID: SUPPORT@GALAXYUPS.IN", pageW / 2, y + 36, {
    align: "center",
  });

  /* -------------- Photo pages (one per page, as in the master report) -------------- */
  for (const photo of input.photos) {
    doc.addPage("a4", "portrait");
    doc.setFont(F, "bold");
    doc.setFontSize(9);
    doc.text(`${input.reportNumber}  ·  ${photo.caption}`, M, M + 4);
    const maxW = W;
    const maxH = pageH - M * 2 - 40;
    let w = maxW;
    let h = maxW * 0.72;
    try {
      const props = doc.getImageProperties(photo.dataUrl);
      const ratio = props.height / props.width;
      h = w * ratio;
      if (h > maxH) {
        h = maxH;
        w = h / ratio;
      }
    } catch {
      /* fall back to default box */
    }
    const x = M + (maxW - w) / 2;
    try {
      doc.addImage(photo.dataUrl, "JPEG", x, M + 16, w, h, undefined, "FAST");
    } catch {
      /* skip unreadable image */
    }
    doc.setDrawColor(0, 0, 0);
    doc.rect(x, M + 16, w, h);
  }

  // page numbers
  const pages = doc.getNumberOfPages();
  if (pages > 1) {
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont(F, "normal");
      doc.setFontSize(7.5);
      doc.text(`Page ${i} of ${pages}`, pageW - M, pageH - 12, { align: "right" });
    }
  }

  const blob = doc.output("blob");
  const base64 = (doc.output("datauristring") as string).split(",")[1] ?? "";
  return { blob, base64 };
}
