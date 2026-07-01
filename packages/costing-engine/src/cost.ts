import type { BoqItem, CorpusProduct, CostResult, MaterialBreakdownLine, RateItem, RatioNorm, TrainedModel } from "@kf/shared";
import { parseDims } from "./dimensions";
import { classify } from "./classify";
import { estimateMaterials } from "./materials";
import { BASE_RATES, rateMap } from "./rates";
import { findCorpusReferences } from "./corpus";
import { materialQtyFromNorm, predictFactoryFromModels } from "./regression";
import { estimateLegacyBreakdown } from "./legacy-materials";

export type CostItemInput = {
  item: BoqItem;
  rates?: RateItem[];
  corpus?: CorpusProduct[];
  models?: TrainedModel[];
  ratioNorms?: RatioNorm[];
};

export function costItem({ item, rates = BASE_RATES, corpus = [], models = [], ratioNorms = [] }: CostItemInput): CostResult {
  const dims = parseDims(item.dims);
  const ptype = item.ptype === "UNKNOWN" ? classify(item.name, item.dims, item.aiSpec ?? item.spec) : item.ptype;
  const spec = `${item.spec ?? ""} ${item.aiSpec ?? ""}`.toLowerCase();
  const ratesByKey = rateMap(rates);
  const refs = findCorpusReferences({ name: item.name, ptype, ct: item.ct ?? spec, dims: item.dims, corpus });
  const modelPrediction = predictFactoryFromModels({ ptype, ct: item.ct ?? spec, planArea: dims.planArea, models });
  let breakdown: MaterialBreakdownLine[] = estimateLegacyBreakdown({ item, ptype, rates, ratioNorms });

  if (!breakdown.length) {
    const estimated = estimateMaterials(ptype, {
      planArea: dims.planArea,
      heightM: dims.H ? dims.H / 1000 : undefined,
      spec
    });

    breakdown = estimated.map((line) => {
      const overrideKey = item.materialOverrides?.[line.materialKey] ?? line.materialKey;
      const rate = ratesByKey.get(overrideKey);
      const normQty = materialQtyFromNorm({ ptype, materialKey: line.materialKey, planArea: dims.planArea, ratioNorms });
      const qty = item.qtyOverrides?.[line.materialKey] ?? normQty ?? line.qty;
      const unitRate = item.rateOverrides?.[line.materialKey] ?? rate?.rate ?? 0;
      return {
        materialKey: overrideKey,
        label: rate?.label ?? overrideKey,
        qty,
        unit: rate?.unit ?? "NOS",
        rate: unitRate,
        amount: roundMoney(qty * unitRate),
        source: item.qtyOverrides?.[line.materialKey] || item.rateOverrides?.[line.materialKey] ? "override" : "estimate"
      };
    });
  }

  const estimatedRaw = roundMoney(breakdown.reduce((sum, line) => sum + line.amount, 0));
  const rawFromModel = modelPrediction ? modelPrediction.value / 1.65 : undefined;
  const raw = item.rawOverride ?? roundMoney(rawFromModel ? blend(estimatedRaw, rawFromModel, refs[0]?.score ?? 0.4) : estimatedRaw);
  const factory = roundMoney(item.manualFac ?? modelPrediction?.value ?? raw * 1.65);
  const margin = clamp(item.margin, 0, 85);
  const sell = roundMoney(factory / (1 - margin / 100));
  const total = roundMoney(sell * item.qty);

  return {
    raw,
    factory,
    sell,
    total,
    confidence: confidence(ptype, refs[0]?.score, modelPrediction?.model?.samples),
    source: modelPrediction ? "trained" : refs.length ? "interpolated" : "seed",
    breakdown,
    refs,
    matchLevel: refs[0] && refs[0].score > 0.85 ? "catalog" : refs[0] ? "similar" : "new",
    matchLabel: modelPrediction ? `Area model (${modelPrediction.model?.samples ?? 0} samples)` : refs[0] ? `Similar to ${refs[0].product}` : "Seed estimate",
    matchScore: refs[0]?.score ?? 0
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function blend(seed: number, model: number, trust: number): number {
  const weight = clamp(trust, 0.25, 0.75);
  return seed * (1 - weight) + model * weight;
}

function confidence(ptype: string, refScore = 0, samples = 0): number {
  const base = ptype === "UNKNOWN" ? 0.35 : 0.58;
  return Math.round(clamp(base + refScore * 0.22 + Math.min(samples, 25) / 125, 0.2, 0.92) * 100) / 100;
}
