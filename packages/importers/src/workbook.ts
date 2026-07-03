import * as XLSX from "xlsx";

export type WorkbookRowsOptions = {
  sheetName?: string;
};

export function rowsFromWorkbookBuffer(buffer: ArrayBuffer | Buffer | Uint8Array, options: WorkbookRowsOptions = {}): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = pickSheet(workbook.SheetNames, options.sheetName);
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

export function rowsFromCsvText(csv: string): Record<string, unknown>[] {
  const workbook = XLSX.read(csv, { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

export function csvFromRows(rows: Record<string, unknown>[]): string {
  const sheet = XLSX.utils.json_to_sheet(rows);
  return XLSX.utils.sheet_to_csv(sheet);
}

export function xlsxFromRows(rows: Record<string, unknown>[], sheetName = "Export"): Buffer {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const headers = Object.keys(rows[0] ?? { Export: "" });
  sheet["!cols"] = headers.map((header) => ({ wch: Math.min(42, Math.max(12, header.length + 4)) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));
  return Buffer.from(XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }));
}

function pickSheet(sheetNames: string[], requested?: string): string {
  if (requested && sheetNames.includes(requested)) return requested;
  if (requested) {
    const normalized = requested.toLowerCase();
    const fuzzy = sheetNames.find((sheet) => sheet.toLowerCase() === normalized);
    if (fuzzy) return fuzzy;
  }
  const master = sheetNames.find((sheet) => /master costing/i.test(sheet));
  return master ?? sheetNames[0];
}
