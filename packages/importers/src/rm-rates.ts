import type { ImportSummary, RateItem } from "@kf/shared";
import { BASE_RATES } from "@kf/costing-engine";
import { numeric, pick } from "./headers";
import { rowsFromWorkbookBuffer } from "./workbook";

export type RmRatesImport = ImportSummary & {
  rates: RateItem[];
  vendors: { name: string; materialName: string; rateKey: string }[];
};

const MATCHERS: Array<[RegExp, string, string, string]> = [
  [/ply|plywood/i, "ply_commercial", "Commercial plywood", "Board"],
  [/\bmdf\b/i, "mdf", "MDF board", "Board"],
  [/compact/i, "compact", "Compact board", "Board"],
  [/laminate|mica/i, "laminate", "Laminate", "Finish"],
  [/veneer/i, "veneer", "Veneer", "Finish"],
  [/fabric|cloth|uph/i, "fabric_mid", "Upholstery fabric", "Upholstery"],
  [/foam/i, "foam", "Foam", "Upholstery"],
  [/\bms\b|mild steel|steel/i, "metal_ms", "Mild steel", "Metal"],
  [/aluminium|aluminum/i, "aluminium", "Aluminium", "Metal"],
  [/teak/i, "wood_teak", "Teak wood", "Wood"],
  [/ash/i, "wood_ash", "Ash wood", "Wood"],
  [/stone|marble|granite|quartz/i, "stone", "Stone or marble top", "Stone"],
  [/edge|banding/i, "edge_band", "Edge banding", "Consumable"],
  [/polish|pu lacquer|lacquer/i, "polish", "Polish", "Finish"],
  [/hardware|hinge|channel|lock|bolt|screw|spider plate/i, "hardware", "Hardware set", "Hardware"]
];

const SKIP = /outsource|chair|stool|sofa|trolley|sticker|corrugated|box|panel slim|food|tea|coffee|freight|transport|labour|rent|electric|wire|packing/i;

export function parseRmRateRows(rows: Record<string, unknown>[], sourceFile = "memory"): RmRatesImport {
  const buckets = new Map<string, number[]>();
  const meta = new Map<string, Omit<RateItem, "rate">>();
  const vendors: RmRatesImport["vendors"] = [];
  let skipped = 0;

  for (const row of rows) {
    const materialName = pick(row, ["Name", "Material"]);
    const vendor = pick(row, ["party name", "Party Name", "Vendor"]);
    const unit = normalizeUnit(pick(row, ["UOM", "Unit"]));
    const rate = numeric(row["RATE"] ?? row["Rate"]);
    const match = MATCHERS.find(([regex]) => regex.test(materialName));

    if (!materialName || !rate || !match || SKIP.test(materialName)) {
      skipped += 1;
      continue;
    }

    const [, key, label, category] = match;
    const normalizedRate = normalizeRate(rate, unit, key, materialName);
    if (!normalizedRate) {
      skipped += 1;
      continue;
    }
    const normalizedUnit = canonicalUnit(key, unit);
    buckets.set(key, [...(buckets.get(key) ?? []), normalizedRate]);
    meta.set(key, { key, label, unit: normalizedUnit, category, source: sourceFile });
    if (vendor) vendors.push({ name: vendor, materialName, rateKey: key });
  }

  const rates = [...buckets.entries()].map(([key, values]) => ({
    ...meta.get(key)!,
    rate: median(values)
  }));

  for (const fallback of BASE_RATES) {
    if (!rates.some((rate) => rate.key === fallback.key)) {
      rates.push({ ...fallback, source: "seed:fallback" });
    }
  }

  return {
    sourceFile,
    rowsRead: rows.length,
    rowsImported: rates.length,
    rowsSkipped: skipped,
    warnings: [],
    rates,
    vendors
  };
}

export function parseRmRatesWorkbook(buffer: ArrayBuffer | Buffer | Uint8Array, sourceFile = "workbook"): RmRatesImport {
  return parseRmRateRows(rowsFromWorkbookBuffer(buffer, { sheetName: "Sheet1" }), sourceFile);
}

function normalizeUnit(unit: string): string {
  return unit.toUpperCase().replace("SQFT", "SFT").replace("SQ FT", "SFT").replace("KGS", "KG").replace("RMT", "MTR");
}

function normalizeRate(rate: number, unit: string, key: string, name: string): number {
  if (/KG|CFT|MTR|SFT|SET|PKT/.test(unit)) return rate;
  if (["ply_commercial", "mdf", "laminate", "compact", "stone"].includes(key) && /SHEET|NOS|PCS/.test(unit)) {
    return rate / sheetArea(name);
  }
  if (["edge_band", "hardware"].includes(key)) return rate;
  if (/NOS|PCS/.test(unit)) return 0;
  return rate;
}

function canonicalUnit(key: string, unit: string): string {
  if (["wood_ash", "wood_teak"].includes(key)) return "CFT";
  if (["metal_ms", "aluminium"].includes(key)) return "KG";
  if (["fabric_mid"].includes(key)) return "MTR";
  if (["edge_band"].includes(key)) return "MTR";
  if (["hardware"].includes(key)) return "SET";
  if (["ply_commercial", "mdf", "laminate", "compact", "stone", "polish"].includes(key)) return "SFT";
  return unit || "NOS";
}

function sheetArea(name: string): number {
  const text = name.toLowerCase();
  const match = text.match(/(\d+(?:\.\d+)?)\s*['ft]*\s*x\s*(\d+(?:\.\d+)?)/i);
  if (match) return Math.max(1, Number(match[1]) * Number(match[2]));
  return 32;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
}
