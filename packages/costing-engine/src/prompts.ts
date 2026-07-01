import type { BoqItem, CorpusReference, RateItem } from "@kf/shared";

export type CostingPromptInput = {
  item: BoqItem;
  rates: RateItem[];
  refs?: CorpusReference[];
  corpusCount?: number;
  brandCount?: number;
};

export function buildCostingPrompt({ item, rates, refs = [], corpusCount = 0, brandCount = 0 }: CostingPromptInput): string {
  const knownRates = rates
    .filter((rate) => rate.rate > 0)
    .slice(0, 140)
    .map((rate) => `- ${rate.label} [${rate.key}]: INR ${rate.rate}/${rate.unit}`)
    .join("\n");

  const anchors = refs.slice(0, 5);
  const anchorSection = anchors.length
    ? `REFERENCE ANCHORS - top ${anchors.length} closest items from Kian's historical R&D corpus
(${corpusCount} items across ${brandCount} brands).
================================================================================
${anchors
  .map(
    (ref, index) => `  ${index + 1}. ${ref.brand || "(unbranded)"} - ${ref.product} (${ref.size || "size unavailable"})
     Historical factory cost: INR ${Math.round(ref.factoryCost ?? 0).toLocaleString("en-IN")}
     Similarity: ${Math.round(ref.score * 100)}%`
  )
  .join("\n\n")}

INTERPOLATION RULES:
- Same item-type and construction: use the closest anchor as the bill-of-material template.
- Different size: scale linear quantities by length ratio and surface quantities by plan-area ratio.
- Same type but different construction: keep proportions, swap materials based on current specification.
- If similarity is below 50%, treat the anchor as directional and flag R&D review.`
    : `NO HISTORICAL ANCHOR found in Kian's corpus for this item.
================================================================================
Estimate from first principles using the rate list. Flag in notes that this needs R&D review and set confidence <= 0.6.`;

  return `You are a senior furniture costing expert at Kian Falcon Manufacturing.
Produce a complete raw material breakdown for manufacturing this product.

PRODUCT
=======
NAME:       ${item.name}
PTYPE:      ${item.ptype}
CT:         ${item.ct || "(not given)"}
DIMENSIONS: ${item.dims} mm
SPEC:       ${item.aiSpec || item.spec || "Not specified"}

RATE LIST (use these rates first; never invent rates not in this list)
================================================================================
${knownRates}

${anchorSection}

GENERAL FURNITURE ENGINEERING GUIDANCE
================================================================================
- CHAIRS: frame, seat substrate, foam if upholstered, fabric/leatherite, polish/finish, adhesives.
- STOOLS: taller chair-like frame; metal stools use more MS pipe and less wood.
- TABLES: top substrate, surface finish, balancing sheet, edgebanding, base/legs, powder coat, adhesives.
- SOFAS/BOOTH seating: ply carcass, multiple foam grades, fabric/leatherite, frame, dacron, springs if needed, adhesives, thread/piping/staples.
- STORAGE/CABINETS/BINS: ply carcass, laminate, balancing, edgebanding, hinges/channels, screws, adhesives, stone top if specified.

SPEC PHRASE INTERPRETATION
================================================================================
- Spider plate 300x300x3mm is a small MS mounting plate, about 2.1 KG.
- MS pipe OD/thickness describes structural pedestal/leg material.
- Flexi ply 6+6+6mm means count each layer separately.
- 18+12mm commercial ply means count both layers.
- Powder coat finish is a metal surface treatment.
- PP included for stone means do not add a separate fabrication line.

Return ONLY a JSON array:
[{"material":"Name","qty":0.0,"unit":"SFT|KG|MTR|NOS|SET|PKT","rate_inr":0,"confidence":0.8,"notes":"brief qty reasoning"}]`;
}
