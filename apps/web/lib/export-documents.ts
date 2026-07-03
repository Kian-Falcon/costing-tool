import {
  buildClientQuotationRows,
  buildInternalCostingRows,
  buildPiRows,
  type CostedBoqRow
} from "@kf/importers";
import PDFDocument from "pdfkit";

type PdfVariant = "quotation" | "internal" | "pi";

export async function buildClientQuotationPdf(rows: CostedBoqRow[]): Promise<Buffer> {
  return buildPdf("Client Quotation", "Commercial quotation prepared from the priced BOQ.", buildClientQuotationRows(rows), "quotation");
}

export async function buildInternalCostingPdf(rows: CostedBoqRow[]): Promise<Buffer> {
  return buildPdf("Internal Costing", "Internal raw material, factory cost, margin, confidence, and source details.", buildInternalCostingRows(rows), "internal");
}

export async function buildPiPdf(rows: CostedBoqRow[]): Promise<Buffer> {
  return buildPdf("Proforma Invoice", "PI export prepared from the approved quotation pricing.", buildPiRows(rows), "pi");
}

async function buildPdf(title: string, subtitle: string, rows: Record<string, unknown>[], variant: PdfVariant): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 36, size: "A4", bufferPages: true });
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    renderHeader(document, title, subtitle, variant);
    rows.forEach((row, index) => {
      if (document.y > 700) {
        document.addPage();
        renderHeader(document, title, subtitle, variant);
      }
      renderRow(document, row, index, variant);
    });
    renderTotals(document, rows, variant);
    renderTerms(document, variant);
    renderFooter(document);
    document.end();
  });
}

function renderHeader(document: PDFKit.PDFDocument, title: string, subtitle: string, variant: PdfVariant) {
  const meta = documentMeta(variant);
  document.rect(36, 32, 523, 72).fill("#f8fafc");
  document.fillColor("#1f2937").font("Helvetica-Bold").fontSize(16).text(process.env.COMPANY_NAME || "Kian Falcon", 50, 46);
  document.fillColor("#64748b").font("Helvetica").fontSize(8).text(process.env.COMPANY_ADDRESS || "Furniture costing and manufacturing workspace", 50, 67, { width: 260 });
  document.fillColor("#0f172a").font("Helvetica-Bold").fontSize(15).text(title, 360, 46, { align: "right", width: 180 });
  document.fillColor("#64748b").font("Helvetica").fontSize(8).text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 360, 69, { align: "right", width: 180 });
  document.fillColor("#64748b").font("Helvetica").fontSize(8).text(meta, 360, 82, { align: "right", width: 180 });
  document.y = 120;
  document.fillColor("#475569").font("Helvetica").fontSize(9).text(subtitle);
  document.moveDown(0.7);
  renderTableHeader(document, variant);
}

function renderRow(document: PDFKit.PDFDocument, row: Record<string, unknown>, index: number, variant: PdfVariant) {
  const name = pick(row, "Product Name", "Description");
  const code = pick(row, "Code");
  const qty = pick(row, "Qty");
  const total = currency(pick(row, "Line Total (INR)", "Amount (INR)"));
  const unitPrice = currency(pick(row, "Unit Price (INR)", "Selling Price (INR)"));

  const startY = document.y;
  document.fillColor("#475569").font("Helvetica").fontSize(8).text(String(index + 1), 42, startY, { width: 24 });
  document.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8.5).text(String(name || "Item"), 70, startY, { width: 230 });
  document.fillColor("#475569").font("Helvetica").fontSize(8).text(String(qty || "-"), 322, startY, { width: 38, align: "right" });
  document.text(unitPrice, 372, startY, { width: 72, align: "right" });
  document.fillColor("#0f172a").font("Helvetica-Bold").text(total, 462, startY, { width: 82, align: "right" });
  document.y = startY + 15;

  const dimensions = pick(row, "Dimensions");
  const specification = pick(row, "Specification");
  if (dimensions || specification) {
    document.fillColor("#64748b").font("Helvetica").fontSize(7.5).text([code && `Code: ${code}`, dimensions && `Dimensions: ${dimensions}`, specification && `Spec: ${specification}`].filter(Boolean).join("   "), 70, document.y, { width: 470 });
  }

  if (variant === "internal") {
    document.fillColor("#475569").fontSize(8).text(
      `Raw: ${currency(pick(row, "Raw Material (INR)"))}   Factory: ${currency(pick(row, "Factory Cost (INR)"))}   Margin: ${pick(row, "Margin %") || "-"}   Confidence: ${pick(row, "Confidence") || "-"}   Source: ${pick(row, "Source") || "-"}`
    );
    const materials = String(pick(row, "Materials") || "");
    if (materials) document.fillColor("#64748b").fontSize(7).text(materials, { width: 510 });
  }

  document.moveDown(0.35);
  document.strokeColor("#e5e7eb").moveTo(36, document.y).lineTo(559, document.y).stroke();
  document.moveDown(0.35);
}

function renderTableHeader(document: PDFKit.PDFDocument, variant: PdfVariant) {
  const y = document.y;
  document.rect(36, y, 523, 22).fill("#e8f0ed");
  document.fillColor("#264c42").font("Helvetica-Bold").fontSize(8);
  document.text("#", 42, y + 7, { width: 24 });
  document.text(variant === "internal" ? "Item / Cost Basis" : "Item Description", 70, y + 7, { width: 230 });
  document.text("Qty", 322, y + 7, { width: 38, align: "right" });
  document.text("Rate", 372, y + 7, { width: 72, align: "right" });
  document.text("Amount", 462, y + 7, { width: 82, align: "right" });
  document.y = y + 30;
}

function renderTotals(document: PDFKit.PDFDocument, rows: Record<string, unknown>[], variant: PdfVariant) {
  if (document.y > 650) document.addPage();
  const subtotal = rows.reduce((sum, row) => sum + Number(pick(row, "Line Total (INR)", "Amount (INR)") || 0), 0);
  const gstRate = variant === "internal" ? 0 : Number(process.env.EXPORT_GST_PERCENT ?? 0);
  const gst = subtotal * (Number.isFinite(gstRate) ? gstRate : 0) / 100;
  const grandTotal = subtotal + gst;
  document.moveDown(0.8);
  document.rect(350, document.y, 195, gstRate ? 70 : 48).fill("#f8fafc");
  const y = document.y + 10;
  document.fillColor("#475569").font("Helvetica").fontSize(9).text("Subtotal", 365, y, { width: 75 });
  document.text(currency(subtotal), 455, y, { width: 75, align: "right" });
  if (gstRate) {
    document.text(`GST ${gstRate}%`, 365, y + 18, { width: 75 });
    document.text(currency(gst), 455, y + 18, { width: 75, align: "right" });
  }
  document.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("Total", 365, y + (gstRate ? 40 : 22), { width: 75 });
  document.text(currency(grandTotal), 455, y + (gstRate ? 40 : 22), { width: 75, align: "right" });
  document.y += gstRate ? 82 : 60;
}

function renderTerms(document: PDFKit.PDFDocument, variant: PdfVariant) {
  if (variant === "internal") return;
  if (document.y > 700) document.addPage();
  document.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9).text("Terms");
  document.fillColor("#64748b").font("Helvetica").fontSize(8).text(
    process.env.EXPORT_TERMS || "Prices are indicative until final drawing, finish, and quantity approval. Taxes, freight, installation, and delivery timelines are as agreed in the final purchase order.",
    { width: 500 }
  );
  document.moveDown(1);
  document.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9).text("Authorized Signatory", 390, document.y + 20, { width: 150, align: "center" });
  document.strokeColor("#94a3b8").moveTo(390, document.y + 14).lineTo(540, document.y + 14).stroke();
}

function renderFooter(document: PDFKit.PDFDocument) {
  const range = document.bufferedPageRange();
  for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
    document.switchToPage(pageIndex);
    document.fillColor("#94a3b8").font("Helvetica").fontSize(7).text(`Generated by Kian Falcon Costing Tool | Page ${pageIndex + 1}`, 36, 810, { align: "center", width: 523 });
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
  return `INR ${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function documentMeta(variant: PdfVariant): string {
  if (variant === "pi") return "Proforma / PI";
  if (variant === "internal") return "Internal use only";
  return "Quotation";
}
