import { readFileSync } from "node:fs";
import { parseRmRatesWorkbook } from "@kf/importers";

const file = process.argv[2] ?? "rm_rates.xlsx";
const result = parseRmRatesWorkbook(readFileSync(file), file);

console.log(JSON.stringify({
  sourceFile: result.sourceFile,
  rowsRead: result.rowsRead,
  rowsImported: result.rowsImported,
  rowsSkipped: result.rowsSkipped,
  rates: result.rates,
  vendorSample: result.vendors.slice(0, 5)
}, null, 2));
