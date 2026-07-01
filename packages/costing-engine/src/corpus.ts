import type { CorpusProduct, CorpusReference, ProductType } from "@kf/shared";
import { parseDims } from "./dimensions";

const CT_SYNONYMS: Array<[RegExp, string]> = [
  [/ash|teak|beech|marandi|solid wood|wood/i, "wood"],
  [/ply|plywood|mdf|hdhmr|board/i, "board"],
  [/uph|upholstery|fabric|foam|leather|rexine/i, "upholstery"],
  [/\bms\b|metal|steel|ss|stainless/i, "metal"],
  [/aluminium|aluminum|\bal\b/i, "aluminium"],
  [/stone|marble|granite|quartz/i, "stone"],
  [/laminate|veneer|polish|pu/i, "finish"],
  [/rattan|cane|wicker/i, "rattan"]
];

export function findCorpusReferences(input: {
  name: string;
  ptype: ProductType;
  ct?: string;
  dims: string;
  corpus?: CorpusProduct[];
  limit?: number;
}): CorpusReference[] {
  const corpus = input.corpus ?? [];
  if (!corpus.length) return [];

  const dims = parseDims(input.dims);
  return corpus
    .map((product) => {
      const typeScore = product.ptype === input.ptype ? 0.45 : bucket(product.ptype) === bucket(input.ptype) ? 0.25 : 0;
      const constructionScore = ctScore(input.ct ?? "", product.ct ?? "") * 0.3;
      const areaScore = areaProximity(dims.planArea, Number(product.area) || 0) * 0.2;
      const nameScore = tokenOverlap(input.name, product.product) * 0.05;
      const score = Math.round((typeScore + constructionScore + areaScore + nameScore) * 100) / 100;
      return {
        product: product.product,
        brand: product.brand,
        size: product.size,
        score,
        factoryCost: Number(product._total) || undefined
      };
    })
    .filter((ref) => ref.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 5);
}

export function ctScore(a: string, b: string): number {
  const left = ctTokens(a);
  const right = ctTokens(b);
  if (!left.size || !right.size) return 0;
  const shared = [...left].filter((token) => right.has(token)).length;
  return shared / Math.max(left.size, right.size);
}

function ctTokens(input: string): Set<string> {
  const text = input.toLowerCase();
  const tokens = new Set(text.split(/[^a-z0-9]+/).filter((token) => token.length > 2));
  for (const [regex, token] of CT_SYNONYMS) {
    if (regex.test(text)) tokens.add(token);
  }
  return tokens;
}

function areaProximity(a: number, b: number): number {
  if (!a || !b) return 0;
  const ratio = Math.min(a, b) / Math.max(a, b);
  return Math.max(0, Math.min(1, ratio));
}

function tokenOverlap(a: string, b: string): number {
  const left = new Set(a.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const right = new Set(b.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  if (!left.size || !right.size) return 0;
  return [...left].filter((token) => right.has(token)).length / Math.max(left.size, right.size);
}

function bucket(ptype: ProductType): string {
  if (ptype.startsWith("CHAIR")) return "CHAIR";
  if (ptype.startsWith("STOOL")) return "STOOL";
  if (ptype.startsWith("TABLE")) return "TABLE";
  if (ptype.startsWith("SOFA")) return "SOFA";
  return ptype;
}
