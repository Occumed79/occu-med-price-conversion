import { jsPDF } from "jspdf";
import { PDFDocument, StandardFonts } from "pdf-lib";
import logo from "@/assets/occu-med-logo.png";
import type { ClinicMemoData, NetworkMemoData, SignedClinicMemoData } from "@/types/memo";

const AURORA_STOPS: [number, [number, number, number]][] = [
  [0, [10, 102, 100]],
  [0.28, [36, 201, 138]],
  [0.56, [46, 196, 196]],
  [0.78, [91, 79, 207]],
  [1, [155, 48, 200]],
];

const NAVY_STOPS: [number, [number, number, number]][] = [
  [0, [13, 31, 60]],
  [0.4, [30, 80, 160]],
  [0.7, [60, 130, 220]],
  [1, [13, 31, 60]],
];

async function loadLogoDataUrl(): Promise<string> {
  const res = await fetch(logo);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
}

function drawHeaderStrip(
  doc: jsPDF,
  stops: [number, [number, number, number]][],
  pageW: number,
  height: number,
  title: string,
  logoData: string,
) {
  // Color bands
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    const segments = 30;
    for (let s = 0; s < segments; s++) {
      const t = s / segments;
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * t);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * t);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * t);
      const x = (t0 + (t1 - t0) * t) * pageW;
      const w = ((t1 - t0) / segments) * pageW + 0.5;
      doc.setFillColor(r, g, b);
      doc.rect(x, 0, w, height, "F");
    }
  }
  // Dark overlay for legibility
  doc.setFillColor(9, 14, 26);
  doc.setGState(new (doc as any).GState({ opacity: 0.35 }));
  doc.rect(0, 0, pageW, height, "F");
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
  // Logo (white)
  try {
    doc.addImage(logoData, "PNG", 14, 8, 28, 16);
  } catch {}
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 48, 20);
}

function fmtAddress(a: { street1: string; street2: string; city: string; state: string; zip: string }) {
  const lines = [
    a.street1,
    a.street2,
    [a.city, a.state, a.zip].filter(Boolean).join(", "),
  ].filter(Boolean);
  return lines.join("\n");
}

function fmtDateLong(v: string) {
  if (!v) return "—";
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" }).toUpperCase();
}

interface FieldDef {
  label: string;
  value: string;
}

async function buildBasePdf(
  title: string,
  variant: "aurora" | "navy",
): Promise<{ doc: jsPDF; pageW: number; pageH: number; logoData: string }> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logoData = await loadLogoDataUrl();
  const stops = variant === "aurora" ? AURORA_STOPS : NAVY_STOPS;
  drawHeaderStrip(doc, stops, pageW, 30, title, logoData);
  return { doc, pageW, pageH, logoData };
}

function drawFieldsGrid(doc: jsPDF, fields: FieldDef[], startY: number, pageW: number) {
  const margin = 14;
  const colW = (pageW - margin * 2 - 8) / 2;
  let x = margin;
  let y = startY;
  let col = 0;

  doc.setTextColor(60, 70, 85);
  fields.forEach((f) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(f.label.toUpperCase(), x, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(28, 43, 58);
    const lines = doc.splitTextToSize(f.value || "—", colW);
    doc.text(lines, x, y + 5);
    const lineH = 4.5;
    const blockH = 5 + lines.length * lineH + 2;

    // underline
    doc.setDrawColor(215, 225, 235);
    doc.setLineWidth(0.3);
    doc.line(x, y + blockH, x + colW, y + blockH);

    if (col === 0) {
      x += colW + 8;
      col = 1;
    } else {
      x = margin;
      y += blockH + 6;
      col = 0;
    }
    doc.setTextColor(60, 70, 85);
  });

  return col === 1 ? y + 14 : y;
}

function drawNotes(doc: jsPDF, label: string, value: string, y: number, pageW: number) {
  const margin = 14;
  const w = pageW - margin * 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 70, 85);
  doc.text(label.toUpperCase(), margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(28, 43, 58);
  const lines = doc.splitTextToSize(value || "—", w);
  doc.text(lines, margin, y + 5);
  return y + 5 + lines.length * 4.5 + 4;
}

function drawTable(doc: jsPDF, rows: { component: string; price: string }[], y: number, pageW: number) {
  const margin = 14;
  const tableW = pageW - margin * 2;
  const compW = tableW * 0.7;
  const priceW = tableW * 0.3;

  // header
  doc.setFillColor(13, 31, 60);
  doc.rect(margin, y, tableW, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Exam Component", margin + 3, y + 5.5);
  doc.text("Price", margin + compW + 3, y + 5.5);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(28, 43, 58);

  rows.forEach((r, i) => {
    const lines = doc.splitTextToSize(r.component || "—", compW - 6);
    const rowH = Math.max(8, lines.length * 4.5 + 3);
    if (i % 2 === 0) {
      doc.setFillColor(245, 248, 252);
      doc.rect(margin, y, tableW, rowH, "F");
    }
    doc.text(lines, margin + 3, y + 5);
    doc.text(r.price || "—", margin + compW + 3, y + 5);
    doc.setDrawColor(220, 228, 236);
    doc.line(margin, y + rowH, margin + tableW, y + rowH);
    y += rowH;
  });

  // outer border
  doc.setDrawColor(180, 195, 215);
  doc.rect(margin, y - rows.length * 8 - 8, tableW, 0); // noop guard
  return y + 6;
}

export async function generateNetworkPdf(d: NetworkMemoData): Promise<Uint8Array> {
  const { doc, pageW } = await buildBasePdf("Network Management Pricing Memo", "aurora");
  let y = 40;
  y = drawFieldsGrid(doc, [
    { label: "Network Management Analyst", value: d.analystName },
    { label: "Director of Network Management", value: d.directorName },
    { label: "Pricing Established", value: fmtDateLong(d.dateOfMemo) },
    { label: "Pricing Expires", value: fmtDateLong(d.dateOfPricingReceived) },
    { label: "Billing Terms", value: d.billingTerms },
    { label: "Source of Pricing", value: d.sourceOfPricing },
    { label: "Clinic Representative", value: d.clinicRepName },
    { label: "Method of Communication", value: d.methodOfComm },
    { label: "Existing or New Clinic", value: d.existingOrNew },
    { label: "Updated or New Pricing", value: d.pricingType },
    { label: "Acquisition Type", value: d.acquisitionType },
    { label: "Clinic Type", value: d.clinicType },
    { label: "Client", value: d.client },
  ], y, pageW);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(13, 31, 60);
  doc.text("Pricing", 14, y + 4);
  y = drawTable(doc, d.priceRows.filter((r) => r.component || r.price), y + 8, pageW);
  y = drawNotes(doc, "Clinic Address", fmtAddress(d.address), y + 4, pageW);
  y = drawNotes(doc, "Notes or Context Regarding the Pricing Received", d.notes, y + 2, pageW);
  return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
}

export async function generateClinicPdf(d: ClinicMemoData): Promise<Uint8Array> {
  const { doc, pageW } = await buildBasePdf("Network Management Provider Pricing Sheet", "navy");
  let y = 40;
  y = drawFieldsGrid(doc, [
    { label: "Network Management Analyst", value: d.analystName },
    { label: "Director of Network Management", value: d.directorName },
    { label: "Pricing Established", value: fmtDateLong(d.dateOfMemo) },
    { label: "Pricing Expires", value: fmtDateLong(d.dateOfPricingReceived) },
    { label: "Billing Terms", value: d.billingTerms },
    { label: "Source of Pricing", value: d.sourceOfPricing },
    { label: "Clinic Representative", value: d.clinicRepName },
    { label: "Method of Communication", value: d.methodOfComm },
    { label: "New or Existing Provider", value: d.newOrExistingProvider },
    { label: "New or Updated Pricing", value: d.newOrUpdatedPricing },
    { label: "Provider Specialty / Practice", value: d.providerSpecialty },
    { label: "Facility Type", value: d.facilityType },
    { label: "", value: "" },
  ], y, pageW);

  y = drawNotes(doc, "Provider Address", fmtAddress(d.address), y + 4, pageW);

  // Price table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(13, 31, 60);
  doc.text("Pricing", 14, y + 4);
  y = drawTable(doc, d.priceRows.filter((r) => r.component || r.price), y + 8, pageW);

  y = drawNotes(doc, "Additional Notes or Context Regarding Pricing", d.notes, y + 4, pageW);

  return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
}

export async function generateSignedClinicPdf(
  d: SignedClinicMemoData,
  envelopeId: string,
): Promise<Uint8Array> {
  const { doc, pageW, pageH } = await buildBasePdf("Network Management Provider Pricing Sheet", "navy");
  let y = 40;
  y = drawFieldsGrid(doc, [
    { label: "Network Management Analyst", value: d.analystName },
    { label: "Director of Network Management", value: d.directorName },
    { label: "Pricing Established", value: fmtDateLong(d.dateOfMemo) },
    { label: "Pricing Expires", value: fmtDateLong(d.dateOfPricingReceived) },
    { label: "Billing Terms", value: d.billingTerms },
    { label: "New or Existing Provider", value: d.newOrExistingProvider },
    { label: "New or Updated Pricing", value: d.newOrUpdatedPricing },
    { label: "Provider Specialty / Practice", value: d.providerSpecialty },
    { label: "Facility Type", value: d.facilityType },
    { label: "Source of Pricing", value: d.sourceOfPricing },
    { label: "Method of Communication", value: d.methodOfComm },
  ], y, pageW);

  y = drawNotes(doc, "Provider Address", fmtAddress(d.address), y + 4, pageW);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(13, 31, 60);
  doc.text("Pricing", 14, y + 4);
  y = drawTable(doc, d.priceRows.filter((r) => r.component || r.price), y + 8, pageW);

  y = drawNotes(doc, "Additional Notes or Context Regarding Pricing", d.notes, y + 4, pageW);

  // Signatures block
  if (y > pageH - 70) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(180, 195, 215);
  doc.line(14, y, pageW - 14, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(13, 31, 60);
  doc.text("Signatures", 14, y);
  y += 6;

  const sigW = (pageW - 28 - 8) / 2;

  // Occu-Med rep (fingerprint stylized: simple radial pattern as placeholder)
  const drawFingerprint = (x: number, yy: number) => {
    doc.setDrawColor(13, 31, 60);
    doc.setLineWidth(0.4);
    for (let r = 2; r < 9; r += 1.4) {
      doc.circle(x + 12, yy + 10, r, "S");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(13, 31, 60);
    doc.text("OCCU-MED", x + 26, yy + 9);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text("VERIFIED ELECTRONIC SIGNATURE", x + 26, yy + 13);
  };

  // Box 1
  doc.setDrawColor(180, 195, 215);
  doc.rect(14, y, sigW, 36);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 70, 85);
  doc.text("OCCU-MED REPRESENTATIVE", 16, y + 5);
  drawFingerprint(16, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(28, 43, 58);
  doc.text(
    `${d.occuMedRepTitle} · ${d.occuMedRepName} · ${d.occuMedRepDate}`,
    16, y + 32,
    { maxWidth: sigW - 4 },
  );

  // Box 2
  const x2 = 14 + sigW + 8;
  doc.rect(x2, y, sigW, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 70, 85);
  doc.text("CLINIC REPRESENTATIVE / PROVIDER", x2 + 2, y + 5);
  // signature in italic helvetica (Satisfy not embedded — use italic)
  doc.setFont("helvetica", "italic");
  doc.setFontSize(18);
  doc.setTextColor(13, 31, 60);
  doc.text(d.clinicRepFullName || "—", x2 + 4, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(28, 43, 58);
  doc.text(
    `${d.clinicRepTitle} · ${d.clinicRepFullName} · ${d.clinicRepDate}`,
    x2 + 2, y + 32,
    { maxWidth: sigW - 4 },
  );

  // Footer envelope ID
  doc.setFontSize(7);
  doc.setTextColor(120, 130, 145);
  doc.text(`Envelope ID: ${envelopeId}`, 14, pageH - 8);

  return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
}

export async function generateCertificate(
  envelopeId: string,
  pdfHash: string,
  audit: {
    createdAt: string;
    viewedAt?: string;
    signedAt: string;
    ipAddress: string;
    userAgent: string;
    occuMedRepName: string;
    clinicRepFullName: string;
    agreedElectronic: boolean;
  },
): Promise<Uint8Array> {
  const { doc, pageW, pageH } = await buildBasePdf("Certificate of Completion", "navy");
  let y = 42;
  doc.setTextColor(28, 43, 58);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Document Audit Trail", 14, y);
  y += 8;

  const rows: [string, string][] = [
    ["Envelope ID", envelopeId],
    ["Document SHA-256", pdfHash],
    ["Created", audit.createdAt],
    ...(audit.viewedAt ? [["Viewed", audit.viewedAt] as [string, string]] : []),
    ["Signed", audit.signedAt],
    ["IP Address", audit.ipAddress],
    ["User Agent", audit.userAgent],
    ["Occu-Med Representative", audit.occuMedRepName],
    ["Clinic Representative", audit.clinicRepFullName],
    [
      "Agreement to Electronic Record",
      audit.agreedElectronic
        ? "Accepted — recipient agreed to do business electronically with Occu-Med."
        : "Not accepted",
    ],
  ];

  doc.setFontSize(9.5);
  rows.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 70, 85);
    doc.text(k.toUpperCase(), 14, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(28, 43, 58);
    const lines = doc.splitTextToSize(v, pageW - 28);
    doc.text(lines, 14, y + 4.5);
    y += 4.5 + lines.length * 4.2 + 4;
  });

  doc.setFontSize(7);
  doc.setTextColor(120, 130, 145);
  doc.text(
    "This Certificate of Completion is generated by Occu-Med to verify the integrity and origin of the signed document.",
    14, pageH - 12,
    { maxWidth: pageW - 28 },
  );

  return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
}

export async function sha256(bytes: Uint8Array): Promise<string> {
  // Copy into a fresh ArrayBuffer to satisfy strict BufferSource typing.
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function downloadPdf(bytes: Uint8Array | ArrayBuffer, filename: string) {
  const src = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const buf = new ArrayBuffer(src.byteLength);
  new Uint8Array(buf).set(src);
  const blob = new Blob([buf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function appendAttachmentPages(
  basePdfBytes: Uint8Array,
  pages: { title: string; fields: Array<{ label: string; value: string }> }[],
): Promise<Uint8Array> {
  if (!pages.length) return basePdfBytes;
  const pdfDoc = await PDFDocument.load(basePdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const pageData of pages) {
    const page = pdfDoc.addPage([595, 842]); // A4 points
    let y = 790;
    page.drawText(pageData.title, { x: 40, y, size: 18, font: bold });
    y -= 28;
    for (const field of pageData.fields) {
      page.drawText(field.label.toUpperCase(), { x: 40, y, size: 9, font: bold });
      y -= 14;
      page.drawText(field.value || "—", { x: 40, y, size: 11, font });
      y -= 22;
    }
  }

  return pdfDoc.save();
}

export async function generateContactSheetPdf(
  title: string,
  fields: Array<{ label: string; value: string }>,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText(title, { x: 40, y: 790, size: 20, font: bold });
  let y = 752;
  for (const field of fields) {
    page.drawText(field.label.toUpperCase(), { x: 40, y, size: 9, font: bold });
    y -= 14;
    page.drawText(field.value || "—", { x: 40, y, size: 11, font });
    y -= 22;
  }

  return pdfDoc.save();
}
