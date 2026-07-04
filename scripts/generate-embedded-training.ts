import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseMasterCostingWorkbook } from "@kf/importers";

const sourceFile = process.argv[2] ?? "training_data2.xlsx";
const outputFile = process.argv[3] ?? "apps/web/lib/embedded-training-library.ts";
const result = parseMasterCostingWorkbook(readFileSync(sourceFile), sourceFile);
const products = result.products.map((product) => ({
  ...product,
  brand: ascii(product.brand),
  product: ascii(product.product),
  itemno: product.itemno ? ascii(product.itemno) : undefined,
  size: ascii(product.size),
  ct: ascii(product.ct),
  sourceFile: ascii(product.sourceFile)
}));

const contents = `import type { CorpusProduct } from "@kf/shared";

export const EMBEDDED_TRAINING_LIBRARY_META = ${JSON.stringify(
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

export const EMBEDDED_CORPUS_PRODUCTS: CorpusProduct[] = ${JSON.stringify(products, null, 2)};
`;

mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, contents);
console.log(`Generated ${result.products.length} corpus products at ${outputFile}`);

function ascii(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
