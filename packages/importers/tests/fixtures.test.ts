import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBoqCsv, parseMasterCostingWorkbook, parseRmRatesWorkbook } from "../src";

describe("fixture imports", () => {
  it("imports the real Master Costing workbook", () => {
    const result = parseMasterCostingWorkbook(readFileSync("training_data2.xlsx"), "training_data2.xlsx");
    expect(result.rowsRead).toBeGreaterThan(2500);
    expect(result.products.length).toBeGreaterThan(300);
    expect(result.products.some((product) => Number(product.metal_kg) > 0 || Number(product.ply_sft) > 0)).toBe(true);
  });

  it("imports RM rates with seed fallbacks", () => {
    const result = parseRmRatesWorkbook(readFileSync("rm_rates.xlsx"), "rm_rates.xlsx");
    expect(result.rowsRead).toBeGreaterThan(900);
    expect(result.rates.length).toBeGreaterThanOrEqual(12);
    expect(result.rates.some((rate) => rate.key === "fabric_mid" && rate.source === "rm_rates.xlsx")).toBe(true);
  });

  it("imports the Costa golden BOQ fixture", () => {
    const items = parseBoqCsv(readFileSync("costa_golden_boq.csv", "utf8"));
    expect(items).toHaveLength(7);
    expect(items.some((item) => item.name.includes("Marble"))).toBe(true);
  });
});
