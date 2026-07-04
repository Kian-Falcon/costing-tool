import {
  buildClientQuotationRows,
  buildInternalCostingRows,
  buildPiRows,
  type CostedBoqRow
} from "@kf/importers";
import { existsSync } from "fs";
import path from "path";
import PDFDocument from "pdfkit";

type PdfVariant = "quotation" | "internal" | "pi";

export type ExportDocumentMeta = {
  projectName?: string;
  clientName?: string;
  clientAddress?: string;
};

export async function buildClientQuotationPdf(rows: CostedBoqRow[], meta: ExportDocumentMeta = {}): Promise<Buffer> {
  return buildPdf("Client Quotation", "Commercial quotation prepared from the priced BOQ.", buildClientQuotationRows(rows), "quotation", meta);
}

export async function buildInternalCostingPdf(rows: CostedBoqRow[], meta: ExportDocumentMeta = {}): Promise<Buffer> {
  return buildPdf("Internal Costing", "Internal raw material, factory cost, margin, confidence, and source details.", buildInternalCostingRows(rows), "internal", meta);
}

export async function buildPiPdf(rows: CostedBoqRow[], meta: ExportDocumentMeta = {}): Promise<Buffer> {
  return buildPdf("Proforma Invoice", "PI export prepared from the approved quotation pricing.", buildPiRows(rows), "pi", meta);
}

async function buildPdf(title: string, subtitle: string, rows: Record<string, unknown>[], variant: PdfVariant, meta: ExportDocumentMeta): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 36, size: "A4", bufferPages: true });
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    renderHeader(document, title, subtitle, variant, meta);
    rows.forEach((row, index) => {
      if (document.y > 700) {
        document.addPage();
        renderHeader(document, title, subtitle, variant, meta);
      }
      renderRow(document, row, index, variant);
    });
    renderTotals(document, rows, variant);
    renderTerms(document, variant);
    renderFooter(document);
    document.end();
  });
}

function renderHeader(document: PDFKit.PDFDocument, title: string, subtitle: string, variant: PdfVariant, meta: ExportDocumentMeta) {
  const docNo = documentNumber(variant);
  renderLogo(document);
  document.fillColor("#111827").font("Helvetica-Bold").fontSize(11).text(companyName(), 42, 82, { width: 220 });
  document.fillColor("#475569").font("Helvetica").fontSize(7.2).text(companyDetails(), 42, 98, { width: 260 });
  document.fillColor("#111827").font("Helvetica-Bold").fontSize(18).text(documentTitle(title, variant).toUpperCase(), 350, 40, { width: 190, align: "right" });
  document.fillColor("#b91c1c").font("Helvetica-Bold").fontSize(12).text(docNo, 350, 64, { width: 190, align: "right" });
  document.fillColor("#111827").font("Helvetica").fontSize(8.5).text(`${documentNoLabel(variant)}: ${docNo}   Date: ${new Date().toLocaleDateString("en-IN")}`, 42, 122, { width: 500 });
  document.text(`Project: ${meta.projectName || process.env.EXPORT_PROJECT_LABEL || "Uploaded BOQ"}`, 42, 137, { width: 250 });
  if (variant !== "internal") {
    document.text(`Client: ${meta.clientName || process.env.EXPORT_CLIENT_NAME || "Client"}`, 305, 122, { width: 235, align: "right" });
    const address = meta.clientAddress || process.env.EXPORT_CLIENT_ADDRESS;
    if (address) document.fillColor("#475569").fontSize(7.5).text(address, 305, 137, { width: 235, align: "right" });
  }
  if (variant === "internal") {
    document.fillColor("#b91c1c").font("Helvetica-Bold").fontSize(8).text(subtitle, 42, 154, { width: 500 });
    document.y = 172;
  } else {
    document.y = 168;
  }
  renderTableHeader(document, variant);
}

function renderRow(document: PDFKit.PDFDocument, row: Record<string, unknown>, index: number, variant: PdfVariant) {
  const name = pick(row, "Product Name", "Description");
  const code = pick(row, "Code");
  const qty = pick(row, "Qty");
  const total = currency(pick(row, "Line Total (INR)", "Amount (INR)"));
  const unitPrice = currency(pick(row, "Unit Price (INR)", "Selling Price (INR)"));

  const startY = document.y;
  document.fillColor("#111827").font("Helvetica").fontSize(7.5).text(String(index + 1), 42, startY, { width: 22 });
  document.text(String(code || "-"), 66, startY, { width: 58 });
  document.fillColor("#111827").font("Helvetica-Bold").fontSize(7.7).text(String(name || "Item"), 128, startY, { width: 118 });
  document.fillColor("#111827").font("Helvetica").fontSize(7.2).text(String(pick(row, "Dimensions") || "-"), 250, startY, { width: 78 });
  document.text(String(pick(row, "Specification") || "-"), 332, startY, { width: 72 });
  document.text(String(qty || "-"), 406, startY, { width: 28, align: "right" });
  document.text(moneyOnly(unitPrice), 438, startY, { width: 52, align: "right" });
  document.fillColor("#111827").font("Helvetica-Bold").text(moneyOnly(total), 494, startY, { width: 54, align: "right" });
  document.y = startY + 15;

  if (variant === "internal") {
    document.fillColor("#475569").fontSize(8).text(
      `Raw: ${currency(pick(row, "Raw Material (INR)"))}   Factory: ${currency(pick(row, "Factory Cost (INR)"))}   Margin: ${pick(row, "Margin %") || "-"}   Confidence: ${pick(row, "Confidence") || "-"}   Source: ${pick(row, "Source") || "-"}`
    );
    const materials = String(pick(row, "Materials") || "");
    if (materials) document.fillColor("#64748b").fontSize(7).text(materials, { width: 510 });
  }

  document.moveDown(0.35);
  document.strokeColor("#e5e7eb").moveTo(42, document.y).lineTo(550, document.y).stroke();
  document.moveDown(0.35);
}

function renderTableHeader(document: PDFKit.PDFDocument, variant: PdfVariant) {
  const y = document.y;
  document.rect(42, y, 508, 22).fill("#111827");
  document.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7);
  document.text("Sr.", 46, y + 7, { width: 18 });
  document.text("Code", 66, y + 7, { width: 58 });
  document.text("Product", 128, y + 7, { width: 118 });
  document.text("Dimensions", 250, y + 7, { width: 78 });
  document.text("Specification", 332, y + 7, { width: 72 });
  document.text("Qty", 406, y + 7, { width: 28, align: "right" });
  document.text(variant === "internal" ? "Factory" : "Unit (Rs.)", 438, y + 7, { width: 52, align: "right" });
  document.text("Total (Rs.)", 494, y + 7, { width: 54, align: "right" });
  document.y = y + 30;
}

function renderTotals(document: PDFKit.PDFDocument, rows: Record<string, unknown>[], variant: PdfVariant) {
  if (document.y > 620) document.addPage();
  const subtotal = rows.reduce((sum, row) => sum + Number(pick(row, "Line Total (INR)", "Amount (INR)") || 0), 0);
  const gstRate = variant === "internal" ? 0 : Number(process.env.EXPORT_GST_PERCENT ?? 18);
  const gst = subtotal * (Number.isFinite(gstRate) ? gstRate : 0) / 100;
  const grandTotal = subtotal + gst;
  document.moveDown(0.8);
  const y = document.y;
  document.strokeColor("#111827").moveTo(350, y).lineTo(550, y).stroke();
  document.fillColor("#111827").font("Helvetica").fontSize(9).text("Subtotal", 370, y + 10, { width: 80 });
  document.text(moneyOnly(currency(subtotal)), 455, y + 10, { width: 80, align: "right" });
  if (gstRate) {
    document.text(`CGST @ ${gstRate / 2}%`, 370, y + 28, { width: 80 });
    document.text(moneyOnly(currency(gst / 2)), 455, y + 28, { width: 80, align: "right" });
    document.text(`SGST @ ${gstRate / 2}%`, 370, y + 46, { width: 80 });
    document.text(moneyOnly(currency(gst / 2)), 455, y + 46, { width: 80, align: "right" });
  }
  document.fillColor("#111827").font("Helvetica-Bold").fontSize(10).text("Grand Total (Rs.)", 370, y + (gstRate ? 70 : 34), { width: 90 });
  document.text(moneyOnly(currency(grandTotal)), 455, y + (gstRate ? 70 : 34), { width: 80, align: "right" });
  document.y = y + (gstRate ? 96 : 58);
  if (variant !== "internal") {
    document.fillColor("#111827").font("Helvetica-Bold").fontSize(8.5).text(`Amount in words: INR ${toIndianWords(Math.round(grandTotal))} Only`, 42, document.y, { width: 500 });
    document.moveDown(1);
  }
}

function renderTerms(document: PDFKit.PDFDocument, variant: PdfVariant) {
  if (variant === "internal") return;
  if (document.y > 700) document.addPage();
  const terms = (process.env.EXPORT_TERMS || DEFAULT_TERMS).split("|");
  document.fillColor("#111827").font("Helvetica-Bold").fontSize(9).text("Terms & Conditions", 42, document.y);
  document.moveDown(0.4);
  document.fillColor("#111827").font("Helvetica").fontSize(7.8);
  terms.forEach((term, index) => {
    document.text(`${index + 1}. ${term.trim()}`, 42, document.y, { width: 500 });
  });
  document.moveDown(1.4);
  document.fillColor("#111827").font("Helvetica").fontSize(8.5).text("For Kian Falcon", 390, document.y, { width: 150, align: "center" });
  document.moveDown(2.3);
  document.fillColor("#111827").font("Helvetica-Bold").fontSize(8.5).text("Authorised Signatory", 390, document.y, { width: 150, align: "center" });
}

function renderFooter(document: PDFKit.PDFDocument) {
  const range = document.bufferedPageRange();
  for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
    document.switchToPage(pageIndex);
    document.fillColor("#6b7280").font("Helvetica").fontSize(7).text(`Kian Falcon | Page ${pageIndex + 1}`, 36, 810, { align: "center", width: 523 });
  }
}

function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return "";
}

function currency(value: unknown): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return `INR ${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function documentTitle(title: string, variant: PdfVariant): string {
  if (variant === "pi") return "Proforma Invoice";
  return title;
}

function documentNoLabel(variant: PdfVariant): string {
  if (variant === "pi") return "PI No";
  if (variant === "internal") return "Costing No";
  return "Quote No";
}

function documentNumber(variant: PdfVariant): string {
  const year = new Date().getFullYear();
  const suffix = process.env.EXPORT_DOCUMENT_NUMBER || `${new Date().getTime().toString().slice(-4)}`;
  if (variant === "pi") return `PI-KF-${year}-${suffix}`;
  if (variant === "internal") return `IC-KF-${year}-${suffix}`;
  return `QT-KF-${year}-${suffix}`;
}

function moneyOnly(value: string): string {
  return value.replace(/^INR\s*/, "");
}

function renderLogo(document: PDFKit.PDFDocument) {
  const logoPath = findLogoPath();
  if (logoPath) {
    document.image(logoPath, 42, 34, { width: 185 });
    return;
  }
  document.fillColor("#111827").font("Helvetica-Bold").fontSize(26).text("Kian", 42, 36, { continued: true });
  document.fillColor("#b91c1c").text(" Falcon");
}

function companyName(): string {
  return process.env.EXPORT_COMPANY_NAME || "Kian Falcon";
}

function companyDetails(): string {
  return [
    process.env.EXPORT_COMPANY_ADDRESS || "Furniture Manufacturing",
    process.env.EXPORT_COMPANY_GST ? `GST: ${process.env.EXPORT_COMPANY_GST}` : "",
    process.env.EXPORT_COMPANY_CONTACT || ""
  ].filter(Boolean).join(" | ");
}

function findLogoPath(): string | undefined {
  const candidates = [
    path.join(process.cwd(), "public", "kian-falcon-logo.png"),
    path.join(process.cwd(), "apps", "web", "public", "kian-falcon-logo.png")
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

function toIndianWords(value: number): string {
  if (!value) return "Zero";
  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value % 10000000) / 100000);
  const thousand = Math.floor((value % 100000) / 1000);
  const hundred = Math.floor((value % 1000) / 100);
  const rest = value % 100;
  return [
    crore ? `${smallWords(crore)} Crore` : "",
    lakh ? `${smallWords(lakh)} Lakh` : "",
    thousand ? `${smallWords(thousand)} Thousand` : "",
    hundred ? `${smallWords(hundred)} Hundred` : "",
    rest ? smallWords(rest) : ""
  ].filter(Boolean).join(" ");
}

function smallWords(value: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (value < 20) return ones[value];
  return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ""}`;
}

const DEFAULT_TERMS = [
  "50% advance with PO, balance before dispatch.",
  "Lead time: 4-6 weeks from PO + advance receipt.",
  "Delivery: Ex-factory unless otherwise agreed; freight extra.",
  "GST as charged above; rates valid for 30 days from PI date.",
  "Site measurements to be confirmed before production begins.",
  "Any change in scope, material grade, or finish will be re-quoted."
].join("|");
