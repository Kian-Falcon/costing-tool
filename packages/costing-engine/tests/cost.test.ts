import { describe, expect, it } from "vitest";
import { classify, costItem } from "../src";

describe("costItem", () => {
  it("upgrades ashwood chair specs to CHAIR_WOOD", () => {
    expect(classify("Dining Chair", "590x580x830", "ashwood frame with fabric seat")).toBe("CHAIR_WOOD");
  });

  it("suppresses laminate table top lines when stone is specified", () => {
    const result = costItem({
      item: {
        id: "1",
        name: "Cafe Table",
        ptype: "TABLE",
        dims: "900x900x750",
        qty: 1,
        margin: 35,
        spec: "marble stone top with ms base"
      }
    });

    expect(result.breakdown.some((line) => line.materialKey === "stone")).toBe(true);
    expect(result.breakdown.some((line) => line.materialKey === "laminate")).toBe(false);
  });

  it("uses legacy explicit material multipliers for MDF laminate table specs", () => {
    const result = costItem({
      item: {
        id: "explicit-table",
        name: "Custom Unit",
        ptype: "UNKNOWN",
        dims: "1000x500x750",
        qty: 1,
        margin: 30,
        spec: "25mm MDF top with laminate and MS pedestal base powder coat"
      }
    });

    const byKey = new Map(result.breakdown.map((line) => [line.materialKey, line]));
    expect(byKey.get("mdf_25")?.qty).toBeCloseTo(15.07, 1);
    expect(byKey.get("laminate")?.qty).toBeCloseTo(13.46, 1);
    expect(byKey.get("balancing")?.qty).toBeCloseTo(10.76, 1);
    expect(byKey.get("ms_pipe_63")?.qty).toBeCloseTo(8.07, 1);
    expect(byKey.get("fevicol_sft")?.qty).toBeCloseTo(10.76, 1);
  });

  it("lets manual overrides win over generated estimates", () => {
    const result = costItem({
      item: {
        id: "2",
        name: "Chair",
        ptype: "CHAIR",
        dims: "500x500x800",
        qty: 2,
        margin: 20,
        rawOverride: 1000,
        manualFac: 1800
      }
    });

    expect(result.raw).toBe(1000);
    expect(result.factory).toBe(1800);
    expect(result.total).toBe(4500);
  });
});
