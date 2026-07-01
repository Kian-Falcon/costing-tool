import type { CorpusProduct, ProductType, RatioNorm, TrainedModel } from "@kf/shared";
import { LEGACY_RATIO_NORMS } from "./legacy-data.generated";

const MATERIAL_KEYS = [
  "ply_sft",
  "foam_sft",
  "uph_mtr",
  "uph_sft",
  "metal_kg",
  "wood_cft",
  "wood_teak_cft",
  "wood_beech_cft",
  "wood_marandi_cft",
  "compact_sft",
  "veneer_sft",
  "lam_sft",
  "bal_sft",
  "polish_sft",
  "edge_mtr",
  "fevicol_sft"
];

export function rebuildModelsFromCorpus(corpus: CorpusProduct[]): TrainedModel[] {
  const groups = new Map<string, CorpusProduct[]>();

  for (const product of corpus) {
    const bucketKey = bucket(product.ptype);
    add(groups, `ptype:${bucketKey}`, product);
    if (product.ct) add(groups, `ct:${bucketKey}:${product.ct.toLowerCase()}`, product);
  }

  return [...groups.entries()]
    .map(([key, rows]) => buildModel(key, rows))
    .filter((model): model is TrainedModel => Boolean(model));
}

export function rebuildRatioNorms(corpus: CorpusProduct[]): RatioNorm[] {
  const groups = new Map<string, { qty: number; area: number; samples: number; productType: ProductType; materialKey: string }>();

  for (const product of corpus) {
    const area = Number(product.area) || 0;
    if (!area) continue;
    for (const materialKey of MATERIAL_KEYS) {
      const qty = Number(product[materialKey]) || 0;
      if (!qty) continue;
      const key = `${bucket(product.ptype)}:${materialKey}`;
      const existing = groups.get(key) ?? { qty: 0, area: 0, samples: 0, productType: bucket(product.ptype) as ProductType, materialKey };
      existing.qty += qty;
      existing.area += area;
      existing.samples += 1;
      groups.set(key, existing);
    }
  }

  return [...groups.values()].map((group) => ({
    productType: group.productType,
    materialKey: group.materialKey,
    qtyPerSqm: group.qty / group.area,
    samples: group.samples
  }));
}

export function predictFactoryFromModels(input: {
  ptype: ProductType;
  ct?: string;
  planArea: number;
  models?: TrainedModel[];
}): { value: number; model?: TrainedModel } | undefined {
  const models = input.models ?? [];
  const productBucket = bucket(input.ptype);
  const ctNeedle = input.ct ? `ct:${productBucket}:${input.ct.toLowerCase()}` : "";
  const model =
    models.find((candidate) => candidate.key === ctNeedle) ??
    models.find((candidate) => candidate.key === `ptype:${productBucket}`);

  if (!model) return undefined;
  return { value: Math.max(0, model.intercept + model.slope * input.planArea), model };
}

export function materialQtyFromNorm(input: {
  ptype: ProductType;
  materialKey: string;
  planArea: number;
  ratioNorms?: RatioNorm[];
}): number | undefined {
  const norms = input.ratioNorms?.length ? input.ratioNorms : LEGACY_RATIO_NORMS;
  const norm = norms.find((candidate) => candidate.productType === bucket(input.ptype) && candidate.materialKey === input.materialKey);
  return norm ? norm.qtyPerSqm * input.planArea : undefined;
}

export function materialQtyFromLegacyNorm(input: {
  ptype: ProductType;
  materialKey: string;
  planAreaSft: number;
  ratioNorms?: RatioNorm[];
}): number | undefined {
  const norms = input.ratioNorms?.length ? input.ratioNorms : LEGACY_RATIO_NORMS;
  const norm = norms.find((candidate) => candidate.productType === bucket(input.ptype) && candidate.materialKey === input.materialKey);
  return norm ? norm.qtyPerSqm * input.planAreaSft : undefined;
}

function buildModel(key: string, rows: CorpusProduct[]): TrainedModel | undefined {
  const samples = rows
    .map((row) => ({ x: Number(row.area) || 0, y: Number(row._total) || 0, row }))
    .filter((sample) => sample.x > 0 && sample.y > 0);

  if (samples.length < 3) return undefined;

  const meanX = avg(samples.map((sample) => sample.x));
  const meanY = avg(samples.map((sample) => sample.y));
  const numerator = samples.reduce((sum, sample) => sum + (sample.x - meanX) * (sample.y - meanY), 0);
  const denominator = samples.reduce((sum, sample) => sum + Math.pow(sample.x - meanX, 2), 0);
  const slope = denominator ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;
  const ssTot = samples.reduce((sum, sample) => sum + Math.pow(sample.y - meanY, 2), 0);
  const ssRes = samples.reduce((sum, sample) => sum + Math.pow(sample.y - (intercept + slope * sample.x), 2), 0);

  return {
    key,
    productType: bucket(samples[0].row.ptype) as ProductType,
    constructionType: key.startsWith("ct:") ? key.split(":").slice(2).join(":") : undefined,
    predictor: "planArea",
    slope,
    intercept,
    samples: samples.length,
    r2: ssTot ? 1 - ssRes / ssTot : 0
  };
}

function add(groups: Map<string, CorpusProduct[]>, key: string, product: CorpusProduct): void {
  groups.set(key, [...(groups.get(key) ?? []), product]);
}

function avg(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function bucket(ptype: ProductType): ProductType {
  if (ptype.startsWith("CHAIR")) return "CHAIR";
  if (ptype.startsWith("STOOL")) return "STOOL";
  if (ptype.startsWith("TABLE")) return "TABLE";
  if (ptype.startsWith("SOFA")) return "SOFA";
  return ptype;
}
