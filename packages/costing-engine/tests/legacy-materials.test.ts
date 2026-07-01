import { describe, expect, it } from "vitest";
import { costItem } from "../src";

describe("legacy material split pricing", () => {
  it("adds stone and suppresses laminate/board top materials for marble tables", () => {
    const result = costItem({
      item: {
        id: "stone-table",
        name: "Marble Round Table",
        ptype: "TABLE",
        dims: "DIA 600 x 750",
        qty: 1,
        margin: 35,
        spec: "Top: natural stone/marble on 18MM thick ply backing. Base: loose metal base with powder coat finish."
      }
    });

    expect(result.breakdown.some((line) => line.materialKey === "stone")).toBe(true);
    expect(result.breakdown.some((line) => line.materialKey === "laminate")).toBe(false);
    expect(result.breakdown.some((line) => line.materialKey === "mdf_25")).toBe(false);
    expect(result.breakdown.some((line) => line.materialKey === "ms_pipe_63")).toBe(true);
  });

  it("uses wood slab material for solid wood table tops", () => {
    const result = costItem({
      item: {
        id: "wood-table",
        name: "Solid Wood Table",
        ptype: "TABLE_WOOD",
        dims: "1200x700x750",
        qty: 1,
        margin: 35,
        spec: "Solid ash wood top 25mm thick with PU polish and MS base"
      }
    });

    expect(result.breakdown.some((line) => line.materialKey === "wood_slab_sft")).toBe(true);
    expect(result.breakdown.some((line) => line.materialKey === "laminate")).toBe(false);
  });

  it("includes legacy sofa fixed upholstery materials", () => {
    const result = costItem({
      item: {
        id: "sofa",
        name: "Sofa",
        ptype: "SOFA",
        dims: "2000x690x960",
        qty: 1,
        margin: 35,
        spec: "Plywood laminated base structure. Seat and back in fabric upholstery."
      }
    });

    expect(result.breakdown.some((line) => line.materialKey === "dacron")).toBe(true);
    expect(result.breakdown.some((line) => line.materialKey === "upholstery_thread")).toBe(true);
    expect(result.breakdown.some((line) => line.materialKey === "piping_cord")).toBe(true);
  });
});
