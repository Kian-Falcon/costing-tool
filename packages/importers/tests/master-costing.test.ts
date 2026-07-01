import { describe, expect, it } from "vitest";
import { parseMasterCostingRows } from "../src";

describe("parseMasterCostingRows", () => {
  it("groups product rows and skips quality outliers", () => {
    const result = parseMasterCostingRows([
      {
        Brand: "KF",
        "Item No.": "C-1",
        "Product Name": "Dining Chair",
        "Product Size (mm)": "590x580x830",
        "Raw Material / Finish": "ashwood frame",
        "Grand Total (INR)": 10000,
        "Data Quality": ""
      },
      {
        Brand: "KF",
        "Item No.": "C-1",
        "Product Name": "Dining Chair",
        "Product Size (mm)": "590x580x830",
        "Raw Material / Finish": "fabric",
        "Amount (INR)": 1200,
        "Data Quality": ""
      },
      {
        Brand: "KF",
        "Item No.": "BAD",
        "Product Name": "Bad Chair",
        "Product Size (mm)": "1x1x1",
        "Data Quality": "OUTLIER"
      }
    ]);

    expect(result.rowsRead).toBe(3);
    expect(result.rowsImported).toBe(1);
    expect(result.rowsSkipped).toBe(1);
    expect(result.products[0].ptype).toBe("CHAIR_WOOD");
  });
});
