import { readFileSync } from "node:fs";
import { parseMasterCostingWorkbook } from "@kf/importers";

const file = process.argv[2] ?? "training_data2.xlsx";
const result = parseMasterCostingWorkbook(readFileSync(file), file);

console.log(JSON.stringify({
  sourceFile: result.sourceFile,
  rowsRead: result.rowsRead,
  rowsImported: result.rowsImported,
  rowsSkipped: result.rowsSkipped,
  warnings: result.warnings.slice(0, 10),
  sample: result.products.slice(0, 3)
}, null, 2));
