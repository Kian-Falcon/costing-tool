export type ProductType =
  | "CHAIR"
  | "CHAIR_WOOD"
  | "CHAIR_RATTAN"
  | "CHAIR_AL"
  | "CHAIR_MS"
  | "STOOL"
  | "STOOL_OUT"
  | "TABLE"
  | "TABLE_WOOD"
  | "SOFA"
  | "SOFA_LEATH"
  | "SOFA_LAM"
  | "COUNTER"
  | "UNKNOWN"
  | "COMPACT_BOARD";

export type RateUnit = "SFT" | "CFT" | "KG" | "KGS" | "MTR" | "NOS" | "PCS" | "SET" | "PKT" | string;

export type RateItem = {
  key: string;
  label: string;
  rate: number;
  unit: RateUnit;
  category: string;
  source: string;
  custom?: boolean;
};

export type AiMaterial = {
  materialKey: string;
  label: string;
  qty: number;
  unit: RateUnit;
  rate?: number;
  confidence?: number;
  reason?: string;
};

export type AddedMaterial = {
  materialKey: string;
  label?: string;
  qty: number;
  rate?: number;
  unit?: RateUnit;
};

export type BoqItem = {
  id: string;
  code?: string;
  name: string;
  ptype: ProductType;
  ct?: string;
  dims: string;
  qty: number;
  margin: number;
  spec?: string;
  aiSpec?: string;
  rawOverride?: number;
  manualFac?: number;
  notes?: string;
  reason?: string;
  fabricRate?: number;
  fabricMtr?: number;
  metalFinish?: string;
  claudeMats?: AiMaterial[];
  qtyOverrides?: Record<string, number>;
  rateOverrides?: Record<string, number>;
  materialOverrides?: Record<string, string>;
  addedMaterials?: AddedMaterial[];
  image?: string;
  dimsSource?: "schedule" | "drawing" | "missing" | "manual" | string;
};

export type CorpusProduct = {
  brand: string;
  product: string;
  itemno?: string;
  size: string;
  ptype: ProductType;
  ct: string;
  L: number;
  W?: number;
  H?: number;
  area: number;
  uph_area: number;
  _total: number;
  sourceFile: string;
  [materialQuantity: string]: string | number | undefined;
};

export type MaterialBreakdownLine = {
  materialKey: string;
  label: string;
  qty: number;
  unit: RateUnit;
  rate: number;
  amount: number;
  source: "estimate" | "override" | "ai" | "added" | "spec" | "fixed" | "geometry" | "dataset" | "seed" | "model" | "user";
};

export type CorpusReference = {
  product: string;
  brand?: string;
  size?: string;
  score: number;
  factoryCost?: number;
};

export type TrainedModel = {
  key: string;
  productType: ProductType;
  constructionType?: string;
  predictor: "planArea";
  slope: number;
  intercept: number;
  samples: number;
  r2: number;
};

export type RatioNorm = {
  productType: ProductType;
  materialKey: string;
  qtyPerSqm: number;
  samples: number;
  predictor?: string;
  p10?: number;
  p90?: number;
};

export type CostResult = {
  raw: number;
  factory: number;
  sell: number;
  total: number;
  confidence: number;
  source: "trained" | "dataset" | "interpolated" | "seed" | "spec+est" | "claude" | "gpt4o" | string;
  breakdown: MaterialBreakdownLine[];
  refs: CorpusReference[];
  matchLevel: "catalog" | "similar" | "new";
  matchLabel: string;
  matchScore: number;
};

export type ImportSummary = {
  sourceFile: string;
  rowsRead: number;
  rowsImported: number;
  rowsSkipped: number;
  warnings: string[];
};
