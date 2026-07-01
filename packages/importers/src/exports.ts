import type { BoqItem, CostResult } from "@kf/shared";
import { csvFromRows } from "./workbook";

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

export function buildClientQuotationCsv(rows: CostedBoqRow[]): string {
  return csvFromRows(buildClientQuotationRows(rows));
}

export function buildInternalCostingCsv(rows: CostedBoqRow[]): string {
  return csvFromRows(buildInternalCostingRows(rows));
}
