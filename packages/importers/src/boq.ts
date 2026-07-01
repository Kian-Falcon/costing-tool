import type { BoqItem } from "@kf/shared";
import { classify } from "@kf/costing-engine";
import { numeric, pick } from "./headers";
import { rowsFromCsvText, rowsFromWorkbookBuffer } from "./workbook";

export function parseBoqRows(rows: Record<string, unknown>[]): BoqItem[] {
  return rows.map((row, index) => {
    const name = pick(row, ["Product Name", "Name", "Item"]);
    const dims = pick(row, ["Dimensions", "Product Size (mm)", "Size"]);
    const spec = pick(row, ["Specification", "Original Specification", "Spec"]);

    return {
      id: cryptoSafeId(index),
      code: pick(row, ["Code", "Sr", "Sr / code"]) || undefined,
      name,
      ptype: classify(name, dims, spec),
      dims,
      qty: numeric(row["Qty"] ?? row["QTY"]) || 1,
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
  return parseBoqRows(rowsFromWorkbookBuffer(buffer));
}
