import type { BoqItem } from "@kf/shared";
import { classify } from "@kf/costing-engine";
import * as XLSX from "xlsx";
import { numeric, pick } from "./headers";
import { rowsFromCsvText, rowsFromWorkbookBuffer } from "./workbook";

export function parseBoqRows(rows: Record<string, unknown>[]): BoqItem[] {
  return rows.flatMap((row, index) => {
    const code = pick(row, ["Code", "Sr", "Sr / code", "Item Code"]);
    const dims = pick(row, ["Dimensions", "Product Size (mm)", "Size"]);
    const spec = pick(row, ["Specification", "Original Specification", "Spec", "Material Specification"]);
    const name = pick(row, ["Product Name", "Name", "Item", "Description", "Particulars"]) || nameFromSpec(spec) || code || `BOQ Item ${index + 1}`;
    const qty = numericValue(row, ["Qty", "QTY", "Quantity", "Nos"]);

    if (isHeaderLike(code, name, dims, spec) || (!code && !dims && !spec && !qty)) return [];

    return {
      id: cryptoSafeId(index),
      code: code || undefined,
      name,
      ptype: classify(name, dims, spec),
      dims,
      qty: qty || 1,
      margin: 35,
      spec
    };
  });
}

function cryptoSafeId(index: number): string {
  return `boq_${index + 1}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseBoqCsv(csv: string): BoqItem[] {
  return parseBoqRows(rowsFromCsvText(csv));
}

export function parseBoqWorkbook(buffer: ArrayBuffer | Buffer | Uint8Array): BoqItem[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = workbook.Sheets[pickBoqSheet(workbook)];
  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", blankrows: false });
  const headerIndex = findBoqHeaderIndex(table);
  if (headerIndex >= 0) return parseBoqRows(rowsFromHeaderTable(table, headerIndex));
  return parseBoqRows(rowsFromWorkbookBuffer(buffer));
}

function rowsFromHeaderTable(table: unknown[][], headerIndex: number): Record<string, unknown>[] {
  const headers = table[headerIndex].map((value, index) => String(value || `Column ${index + 1}`).trim());
  return table.slice(headerIndex + 1).flatMap((row) => {
    const values = row.map((value) => (typeof value === "string" ? value.trim() : value));
    if (!values.some((value) => value !== "" && value != null)) return [];
    const item: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      item[header || `Column ${index + 1}`] = values[index] ?? "";
    });
    return [item];
  });
}

function findBoqHeaderIndex(table: unknown[][]): number {
  return table.findIndex((row) => {
    const headers = row.map((cell) => String(cell ?? "").toLowerCase().replace(/[^a-z0-9]+/g, ""));
    const hasCode = headers.some((header) => header === "code" || header === "itemcode" || header === "sr");
    const hasSpec = headers.some((header) => /specification|description|particulars/.test(header));
    const hasQty = headers.some((header) => header === "qty" || header === "quantity" || header === "nos");
    return hasCode && (hasSpec || hasQty);
  });
}

function pickBoqSheet(workbook: XLSX.WorkBook): string {
  return workbook.SheetNames.find((sheetName) => /boq|furniture|quote/i.test(sheetName)) ?? workbook.SheetNames[0];
}

function numericValue(row: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = pick(row, [key]);
    if (value) return numeric(value);
  }
  return 0;
}

function isHeaderLike(code: string, name: string, dims: string, spec: string): boolean {
  const value = `${code} ${name} ${dims} ${spec}`.toLowerCase();
  return /^(code|product name|name|item|description|specification|size|qty|\s)+$/.test(value.trim());
}

function nameFromSpec(spec: string): string {
  const compact = spec.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  const firstClause = compact.split(/\b(?:made|using|having|with|to be)\b/i)[0]?.trim();
  return (firstClause || compact).replace(/[.:;,]+$/g, "").slice(0, 90);
}
