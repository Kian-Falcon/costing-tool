import type { BoqItem, CostResult } from "@kf/shared";
import * as XLSX from "xlsx";
import { csvFromRows, xlsxFromRows } from "./workbook";

export type CostedBoqRow = {
  item: BoqItem;
  result: CostResult;
};

export function buildClientQuotationRows(rows: CostedBoqRow[]): Record<string, unknown>[] {
  return rows.map(({ item, result }, index) => ({
    Sr: index + 1,
    Code: item.code ?? "",
    "Product Name": item.name,
    Dimensions: item.dims,
    Specification: item.aiSpec || item.spec || "",
    Qty: item.qty,
    "Unit Price (INR)": result.sell,
    "Line Total (INR)": result.total
  }));
}

export function buildInternalCostingRows(rows: CostedBoqRow[]): Record<string, unknown>[] {
  return rows.map(({ item, result }, index) => ({
    Sr: index + 1,
    Code: item.code ?? "",
    "Product Name": item.name,
    Type: item.ptype,
    Dimensions: item.dims,
    Qty: item.qty,
    "Raw Material (INR)": result.raw,
    "Factory Cost (INR)": result.factory,
    "Margin %": item.margin,
    "Selling Price (INR)": result.sell,
    "Line Total (INR)": result.total,
    Confidence: result.confidence,
    Source: result.source,
    Match: result.matchLabel,
    Materials: result.breakdown.map((line) => `${line.label}: ${line.qty} ${line.unit} x ${line.rate}`).join("; ")
  }));
}

export function buildPiRows(rows: CostedBoqRow[]): Record<string, unknown>[] {
  return rows.map(({ item, result }, index) => ({
    Sr: index + 1,
    Code: item.code ?? "",
    Description: item.name,
    Specification: item.aiSpec || item.spec || "",
    Dimensions: item.dims,
    Qty: item.qty,
    Unit: "Nos",
    "Unit Price (INR)": result.sell,
    "Amount (INR)": result.total
  }));
}

export function buildClientQuotationCsv(rows: CostedBoqRow[]): string {
  return csvFromRows(buildClientQuotationRows(rows));
}

export function buildInternalCostingCsv(rows: CostedBoqRow[]): string {
  return csvFromRows(buildInternalCostingRows(rows));
}

export function buildPiCsv(rows: CostedBoqRow[]): string {
  return csvFromRows(buildPiRows(rows));
}

export function buildClientQuotationXlsx(rows: CostedBoqRow[]): Buffer {
  return xlsxFromRows(buildClientQuotationRows(rows), "Client Quotation");
}

export function buildInternalCostingXlsx(rows: CostedBoqRow[]): Buffer {
  return xlsxFromRows(buildInternalCostingRows(rows), "Internal Costing");
}

export function buildPiXlsx(rows: CostedBoqRow[]): Buffer {
  const piRows = buildPiRows(rows);
  const subtotal = piRows.reduce((sum, row) => sum + Number(row["Amount (INR)"] || 0), 0);
  const gstRate = Number(process.env.EXPORT_GST_PERCENT ?? 18);
  const safeGstRate = Number.isFinite(gstRate) ? gstRate : 18;
  const cgst = subtotal * (safeGstRate / 200);
  const sgst = subtotal * (safeGstRate / 200);
  const grand = Math.round(subtotal + cgst + sgst);
  const piNo = documentNumber("PI-KF");
  const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const projectName = String(process.env.EXPORT_PROJECT_LABEL || "Uploaded BOQ");

  const aoa: unknown[][] = [];
  const row = () => aoa.length;
  const rowHead = row();
  aoa.push(["KIAN FALCON", "", "", "", "", "", "", "", "PROFORMA INVOICE"]);
  aoa.push(["Furniture Manufacturing", "", "", "", "", "", "", "", piNo]);
  aoa.push(["", "", "", "", "", "", "", "", ""]);
  aoa.push(["PI No:", piNo, "", "", "", "", "", "Date:", date]);
  const rowProj = row();
  aoa.push(["Project:", projectName, "", "", "", "", "", "", ""]);
  aoa.push(["", "", "", "", "", "", "", "", ""]);
  const rowHdr = row();
  aoa.push(["Sr.", "Image", "Code", "Product", "Dimensions", "Specification", "Qty", "Unit (Rs.)", "Total (Rs.)"]);
  const rowItemsStart = row();
  piRows.forEach((item) => {
    aoa.push([
      item.Sr,
      "",
      item.Code,
      item.Description,
      item.Dimensions,
      String(item.Specification || "").slice(0, 300),
      item.Qty,
      item["Unit Price (INR)"],
      item["Amount (INR)"]
    ]);
  });
  const rowItemsEnd = row() - 1;
  aoa.push(["", "", "", "", "", "", "", "", ""]);
  aoa.push(["", "", "", "", "", "", "", "Subtotal", Math.round(subtotal)]);
  aoa.push(["", "", "", "", "", "", "", `CGST @ ${safeGstRate / 2}%`, Math.round(cgst)]);
  aoa.push(["", "", "", "", "", "", "", `SGST @ ${safeGstRate / 2}%`, Math.round(sgst)]);
  aoa.push(["", "", "", "", "", "", "", "Grand Total (Rs.)", grand]);
  aoa.push(["", "", "", "", "", "", "", "", ""]);
  const rowAmtWords = row();
  aoa.push([`Amount in words: INR ${toIndianWords(grand)} Only`, "", "", "", "", "", "", "", ""]);
  aoa.push(["", "", "", "", "", "", "", "", ""]);
  const rowTerms = row();
  const terms = [
    "Terms & Conditions",
    "1. 50% advance with PO, balance before dispatch.",
    "2. Lead time: 4-6 weeks from PO + advance receipt.",
    "3. Delivery: Ex-factory unless otherwise agreed; freight extra.",
    "4. GST as charged above; rates valid for 30 days from PI date.",
    "5. Site measurements to be confirmed before production begins.",
    "6. Any change in scope, material grade, or finish will be re-quoted."
  ];
  terms.forEach((term) => aoa.push([term, "", "", "", "", "", "", "", ""]));
  aoa.push(["", "", "", "", "", "", "", "", ""]);
  aoa.push(["", "", "", "", "", "", "", "", ""]);
  aoa.push(["", "", "", "", "", "", "", "For Kian Falcon", ""]);
  aoa.push(["", "", "", "", "", "", "", "Authorised Signatory", ""]);

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet["!cols"] = [
    { wch: 5 },
    { wch: 20 },
    { wch: 14 },
    { wch: 24 },
    { wch: 16 },
    { wch: 42 },
    { wch: 7 },
    { wch: 16 },
    { wch: 18 }
  ];
  sheet["!rows"] = [];
  sheet["!rows"][rowHead] = { hpx: 30 };
  sheet["!rows"][rowHead + 1] = { hpx: 18 };
  sheet["!rows"][rowHdr] = { hpx: 24 };
  for (let i = rowItemsStart; i <= rowItemsEnd; i += 1) sheet["!rows"][i] = { hpx: 90 };
  sheet["!merges"] = [
    { s: { r: rowHead, c: 0 }, e: { r: rowHead, c: 2 } },
    { s: { r: rowHead, c: 6 }, e: { r: rowHead, c: 8 } },
    { s: { r: rowHead + 1, c: 0 }, e: { r: rowHead + 1, c: 2 } },
    { s: { r: rowHead + 1, c: 6 }, e: { r: rowHead + 1, c: 8 } },
    { s: { r: rowProj, c: 1 }, e: { r: rowProj, c: 8 } },
    { s: { r: rowAmtWords, c: 0 }, e: { r: rowAmtWords, c: 8 } },
    ...terms.map((_, index) => ({ s: { r: rowTerms + index, c: 0 }, e: { r: rowTerms + index, c: 8 } }))
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Proforma Invoice");
  return Buffer.from(XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }));
}

function documentNumber(prefix: string): string {
  const year = new Date().getFullYear();
  const suffix = process.env.EXPORT_DOCUMENT_NUMBER || `${Math.floor(Math.random() * 9000 + 1000)}`;
  return `${prefix}-${year}-${suffix}`;
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
