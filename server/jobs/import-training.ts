import { parseMasterCostingRows } from "@kf/importers";

export async function importTrainingRows(rows: Record<string, unknown>[], sourceFile: string) {
  const result = parseMasterCostingRows(rows, sourceFile);
  return {
    ...result,
    persisted: false
  };
}
