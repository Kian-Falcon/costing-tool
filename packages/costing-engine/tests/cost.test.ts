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
