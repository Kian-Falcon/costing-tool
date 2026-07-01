import { describe, expect, it } from "vitest";
import { costItem, rebuildModelsFromCorpus, rebuildRatioNorms } from "../src";
import type { CorpusProduct } from "@kf/shared";

const corpus: CorpusProduct[] = [
  product("A", 0.25, 4000, 8),
  product("B", 0.5, 8000, 14),
  product("C", 1, 16000, 28)
];

describe("corpus-aware costing", () => {
  it("builds area models using plan area", () => {
    const models = rebuildModelsFromCorpus(corpus);
    expect(models[0].predictor).toBe("planArea");
    expect(models[0].samples).toBe(3);
  });

  it("uses corpus references and trained source when available", () => {
    const result = costItem({
      item: {
        id: "t1",
        name: "Cafe Table",
        ptype: "TABLE",
        dims: "750x750x750",
        qty: 1,
        margin: 35,
        spec: "laminate table"
      },
      corpus,
      models: rebuildModelsFromCorpus(corpus),
      ratioNorms: rebuildRatioNorms(corpus)
    });

    expect(result.source).toBe("trained");
    expect(result.refs.length).toBeGreaterThan(0);
    expect(result.factory).toBeGreaterThan(0);
  });
});

function product(name: string, area: number, total: number, lam: number): CorpusProduct {
  return {
    brand: "KF",
    product: name,
    size: "fixture",
    ptype: "TABLE",
    ct: "laminate table",
    L: 1000,
    W: area * 1000,
    area,
    uph_area: 0,
    _total: total,
    sourceFile: "test",
    lam_sft: lam
  };
}
