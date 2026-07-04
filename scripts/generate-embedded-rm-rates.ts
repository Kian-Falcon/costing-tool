import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseRmRatesWorkbook } from "@kf/importers";

const sourceFile = process.argv[2] ?? "rm_rates.xlsx";
const outputFile = process.argv[3] ?? "apps/web/lib/embedded-rate-library.ts";
const result = parseRmRatesWorkbook(readFileSync(sourceFile), sourceFile);
const rates = result.rates.map((rate) => ({
  ...rate,
  label: ascii(rate.label),
  unit: ascii(rate.unit),
  category: ascii(rate.category),
  source: ascii(rate.source)
}));
const vendors = result.vendors.map((vendor) => ({
  name: ascii(vendor.name),
  materialName: ascii(vendor.materialName),
  rateKey: ascii(vendor.rateKey)
}));

const contents = `import type { RateItem } from "@kf/shared";

export type EmbeddedVendorLink = {
  name: string;
  materialName: string;
  rateKey: string;
};

export const EMBEDDED_RATE_LIBRARY_META = ${JSON.stringify(
  {
    sourceFile: result.sourceFile,
    rowsRead: result.rowsRead,
    rowsImported: result.rowsImported,
    rowsSkipped: result.rowsSkipped,
    generatedAt: new Date().toISOString()
  },
  null,
  2
)} as const;

export const EMBEDDED_RM_RATES: RateItem[] = ${JSON.stringify(rates, null, 2)};

export const EMBEDDED_VENDOR_LINKS: EmbeddedVendorLink[] = ${JSON.stringify(vendors, null, 2)};
`;

mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, contents);
console.log(`Generated ${result.rates.length} rates and ${result.vendors.length} vendor links at ${outputFile}`);

function ascii(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\u00d8/g, "Dia ")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
