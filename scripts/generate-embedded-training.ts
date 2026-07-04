import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseMasterCostingWorkbook } from "@kf/importers";
import type { CorpusProduct } from "@kf/shared";

const DEFAULT_SOURCE_FILES = ["training_data.xlsx", "training_data2.xlsx"];
const args = process.argv.slice(2);
const outputFile = args.find((arg) => /\.ts$/i.test(arg)) ?? "apps/web/lib/embedded-training-library.ts";
const sourceFiles = args.filter((arg) => /\.(xlsx|xls)$/i.test(arg));
const inputs = sourceFiles.length ? sourceFiles : DEFAULT_SOURCE_FILES;
const results = inputs.map((sourceFile) => parseMasterCostingWorkbook(readFileSync(sourceFile), sourceFile));
const products = dedupeProducts(results.flatMap((result) => result.products)).map(cleanProduct);

const contents = `import type { CorpusProduct } from "@kf/shared";

export const EMBEDDED_TRAINING_LIBRARY_META = ${JSON.stringify(
  {
    sourceFile: "training_data_merged_v1",
    sourceFiles: inputs,
    rowsRead: sum(results.map((result) => result.rowsRead)),
    rowsImported: products.length,
    rowsSkipped: sum(results.map((result) => result.rowsSkipped)),
    sourceStats: results.map((result) => ({
      sourceFile: result.sourceFile,
      rowsRead: result.rowsRead,
      rowsImported: result.rowsImported,
      rowsSkipped: result.rowsSkipped
    })),
    generatedAt: new Date().toISOString()
  },
  null,
  2
)} as const;

export const EMBEDDED_CORPUS_PRODUCTS: CorpusProduct[] = ${JSON.stringify(products, null, 2)};
`;

mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, contents);
console.log(`Generated ${products.length} merged corpus products from ${inputs.join(", ")} at ${outputFile}`);

function cleanProduct(product: CorpusProduct): CorpusProduct {
  return {
    ...product,
    brand: ascii(product.brand),
    product: ascii(product.product),
    itemno: product.itemno ? ascii(product.itemno) : undefined,
    size: ascii(product.size),
    ct: ascii(product.ct),
    sourceFile: ascii(product.sourceFile)
  };
}

function dedupeProducts(input: CorpusProduct[]): CorpusProduct[] {
  const grouped = new Map<string, CorpusProduct>();
  for (const raw of input) {
    const product = cleanProduct(raw);
    const key = product.itemno ? `${product.brand}:${product.itemno}` : `${product.brand}:${product.product}:${product.size}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, product);
      continue;
    }
    grouped.set(key, mergeProduct(existing, product));
  }
  return [...grouped.values()].sort((a, b) => `${a.ptype}:${a.product}:${a.size}`.localeCompare(`${b.ptype}:${b.product}:${b.size}`));
}

function mergeProduct(a: CorpusProduct, b: CorpusProduct): CorpusProduct {
  const merged: CorpusProduct = {
    ...a,
    brand: b.brand || a.brand,
    product: b.product || a.product,
    itemno: b.itemno || a.itemno,
    size: b.size || a.size,
    ptype: b.ptype || a.ptype,
    ct: b.ct || a.ct,
    L: b.L || a.L,
    W: b.W || a.W,
    H: b.H || a.H,
    area: b.area || a.area,
    _total: Math.max(Number(a._total) || 0, Number(b._total) || 0),
    sourceFile: mergeSourceFiles(a.sourceFile, b.sourceFile)
  };
  for (const key of materialKeys(a, b)) {
    merged[key] = Math.max(Number(a[key]) || 0, Number(b[key]) || 0);
  }
  return merged;
}

function materialKeys(...productsToScan: CorpusProduct[]): string[] {
  const keys = new Set<string>();
  for (const product of productsToScan) {
    for (const key of Object.keys(product)) {
      if (/_(sft|mtr|kg|cft)$/.test(key)) keys.add(key);
    }
  }
  return [...keys];
}

function mergeSourceFiles(a: string | undefined, b: string | undefined): string {
  return [...new Set([...(a ?? "").split(","), ...(b ?? "").split(",")].map((value) => value.trim()).filter(Boolean))].join(", ");
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function ascii(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
