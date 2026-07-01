import { describe, expect, it } from "vitest";
import { parseDims } from "../src/dimensions";

describe("parseDims", () => {
  it("parses standard millimeter dimensions", () => {
    const dims = parseDims("590x580x830");
    expect(dims.L).toBe(590);
    expect(dims.W).toBe(580);
    expect(dims.H).toBe(830);
    expect(dims.planArea).toBeCloseTo(0.3422, 4);
  });

  it("parses circular DIA dimensions using circular area", () => {
    const dims = parseDims("DIA 600 x 750");
    expect(dims.isCircular).toBe(true);
    expect(dims.diameter).toBe(600);
    expect(dims.planArea).toBeCloseTo(0.2827, 4);
  });

  it("parses labelled W/D/H dimensions", () => {
    const dims = parseDims("W450 D550 H870");
    expect(dims.L).toBe(450);
    expect(dims.W).toBe(550);
    expect(dims.H).toBe(870);
  });
});
