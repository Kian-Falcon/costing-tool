import type { CorpusProduct, ImportSummary } from "@kf/shared";
import { classify, inferCTFromSpec, parseDims } from "@kf/costing-engine";
import { numeric, pick } from "./headers";
import { rowsFromWorkbookBuffer } from "./workbook";

export type MasterCostingImport = ImportSummary & {
  products: CorpusProduct[];
};

export function parseMasterCostingRows(rows: Record<string, unknown>[], sourceFile = "memory"): MasterCostingImport {
  const warnings: string[] = [];
  const products: CorpusProduct[] = [];
  const grouped = new Map<string, CorpusProduct>();
  let skipped = 0;

  for (const row of rows) {
    const quality = pick(row, ["Data Quality"]);
    if (/outlier|unit error/i.test(quality)) {
      skipped += 1;
      continue;
    }

    const brand = pick(row, ["Brand"]);
    const product = pick(row, ["Product Name"]);
    const itemno = pick(row, ["Item No."]);
    const size = pick(row, ["Product Size (mm)", "Size", "Dimensions"]);
    const material = pick(row, ["Raw Material / Finish", "Material"]);
    const category = pick(row, ["Category", "Section"]);
    const unit = pick(row, ["Unit", "UOM"]);
    const qty = numeric(row["Qty"] ?? row["QTY"]);
    const ct = pick(row, ["Construction Type"]) || inferCTFromSpec(material);
    const amount = numeric(row["Amount (INR)"]);
    const grandTotal = numeric(row["Grand Total (INR)"]);

    if (!product || !size) {
      skipped += 1;
      warnings.push(`Skipped row without product or size in ${sourceFile}`);
      continue;
    }

    const dims = parseDims(size);
    const key = itemno ? `${brand}:${itemno}` : `${brand}:${product}:${size}`;
    const existing =
      grouped.get(key) ??
      ({
        brand,
        product,
        itemno: itemno || undefined,
        size,
        ptype: classify(product, size, ct),
        ct,
        L: dims.L,
        W: dims.W,
        H: dims.H,
        area: dims.planArea,
        uph_area: 0,
        _total: grandTotal,
        sourceFile
      } satisfies CorpusProduct);

    existing._total = Math.max(Number(existing._total) || 0, grandTotal || amount);
    const materialKey = materialQuantityKey(`${category} ${material}`, unit);
    if (materialKey && qty > 0) {
      existing[materialKey] = (Number(existing[materialKey]) || 0) + qty;
    }
    grouped.set(key, existing);
  }

  products.push(...grouped.values());

  return {
    sourceFile,
    rowsRead: rows.length,
    rowsImported: products.length,
    rowsSkipped: skipped,
    warnings,
    products
  };
}

export function parseMasterCostingWorkbook(buffer: ArrayBuffer | Buffer | Uint8Array, sourceFile = "workbook"): MasterCostingImport {
  return parseMasterCostingRows(rowsFromWorkbookBuffer(buffer, { sheetName: "Master Costing" }), sourceFile);
}

function materialQuantityKey(text: string, unit: string): string | undefined {
  const value = text.toLowerCase();
  const normalizedUnit = unit.toUpperCase();

  if (/foam/.test(value)) return "foam_sft";
  if (/fabric|cloth|uph|leather|rexine/.test(value)) return /MTR|METER|METRE/.test(normalizedUnit) ? "uph_mtr" : "uph_sft";
  if (/\bms\b|metal|steel|stainless|ss/.test(value)) return "metal_kg";
  if (/teak/.test(value)) return "wood_teak_cft";
  if (/beech/.test(value)) return "wood_beech_cft";
  if (/marandi/.test(value)) return "wood_marandi_cft";
  if (/ash|wood|timber/.test(value)) return "wood_cft";
  if (/compact/.test(value)) return "compact_sft";
  if (/veneer/.test(value)) return "veneer_sft";
  if (/laminate|mica/.test(value)) return "lam_sft";
  if (/polish|pu\b/.test(value)) return "polish_sft";
  if (/edge|band/.test(value)) return "edge_mtr";
  if (/fevicol|adhesive|glue/.test(value)) return "fevicol_sft";
  if (/ply|plywood|mdf|hdhmr|board/.test(value)) return "ply_sft";
  return undefined;
}
