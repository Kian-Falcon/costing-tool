import type { ProductType } from "@kf/shared";

export type MaterialEstimate = {
  materialKey: string;
  qty: number;
  reason: string;
};

type MaterialFormulaContext = {
  planArea: number;
  heightM?: number;
  spec: string;
};

type MaterialRule = {
  materialKey: string;
  qty: (ctx: MaterialFormulaContext) => number;
  when?: (ctx: MaterialFormulaContext) => boolean;
  reason: string;
};

const has = (needle: RegExp) => (ctx: MaterialFormulaContext) => needle.test(ctx.spec);

export const MATMAP: Record<ProductType, MaterialRule[]> = {
  CHAIR: [
    { materialKey: "ply_commercial", qty: () => 7, reason: "chair seat/back board allowance" },
    { materialKey: "foam", qty: () => 6, reason: "chair upholstery foam allowance" },
    { materialKey: "fabric_mid", qty: () => 1.2, reason: "chair fabric allowance" },
    { materialKey: "hardware", qty: () => 1, reason: "chair hardware allowance" }
  ],
  CHAIR_WOOD: [
    { materialKey: "wood_ash", qty: () => 0.18, reason: "wooden chair frame allowance" },
    { materialKey: "foam", qty: () => 5, reason: "upholstered wooden chair foam" },
    { materialKey: "fabric_mid", qty: () => 1.1, reason: "upholstered wooden chair fabric" },
    { materialKey: "polish", qty: () => 8, reason: "wood polish allowance" }
  ],
  CHAIR_RATTAN: [
    { materialKey: "aluminium", qty: () => 4, reason: "outdoor/rattan chair frame" },
    { materialKey: "fabric_mid", qty: () => 0.8, reason: "seat cushion fabric" }
  ],
  CHAIR_AL: [
    { materialKey: "aluminium", qty: () => 5, reason: "aluminium chair frame" },
    { materialKey: "fabric_mid", qty: () => 0.8, reason: "seat upholstery" }
  ],
  CHAIR_MS: [
    { materialKey: "metal_ms", qty: () => 6, reason: "mild steel chair frame" },
    { materialKey: "fabric_mid", qty: () => 1, reason: "seat upholstery" }
  ],
  STOOL: [
    { materialKey: "ply_commercial", qty: () => 4, reason: "stool seat board" },
    { materialKey: "foam", qty: () => 3, reason: "stool seat foam" },
    { materialKey: "fabric_mid", qty: () => 0.7, reason: "stool fabric" }
  ],
  STOOL_OUT: [
    { materialKey: "aluminium", qty: () => 4, reason: "outdoor stool frame" },
    { materialKey: "fabric_mid", qty: () => 0.6, reason: "outdoor stool cushion" }
  ],
  TABLE: [
    { materialKey: "ply_commercial", qty: (ctx) => ctx.planArea * 10.764 * 1.2, when: (ctx) => !has(/stone|marble|granite|quartz|solid wood/)(ctx), reason: "table top board area" },
    { materialKey: "laminate", qty: (ctx) => ctx.planArea * 10.764 * 1.2, when: (ctx) => !has(/stone|marble|granite|quartz|solid wood/)(ctx), reason: "table top laminate area" },
    { materialKey: "stone", qty: (ctx) => ctx.planArea * 10.764, when: has(/stone|marble|granite|quartz/), reason: "stone top area" },
    { materialKey: "metal_ms", qty: () => 12, when: has(/metal|ms|steel/), reason: "table metal base allowance" },
    { materialKey: "edge_band", qty: (ctx) => Math.max(4, Math.sqrt(ctx.planArea) * 4), reason: "table edge allowance" }
  ],
  TABLE_WOOD: [
    { materialKey: "wood_ash", qty: (ctx) => Math.max(0.25, ctx.planArea * 0.18), reason: "solid wood table allowance" },
    { materialKey: "polish", qty: (ctx) => ctx.planArea * 10.764 * 1.4, reason: "wood table polish area" },
    { materialKey: "metal_ms", qty: () => 12, when: has(/metal|ms|steel/), reason: "wood table metal base" }
  ],
  SOFA: [
    { materialKey: "ply_commercial", qty: (ctx) => Math.max(18, ctx.planArea * 10.764 * 3), reason: "sofa frame board allowance" },
    { materialKey: "foam", qty: (ctx) => Math.max(24, ctx.planArea * 10.764 * 3), reason: "sofa foam allowance" },
    { materialKey: "fabric_mid", qty: (ctx) => Math.max(6, ctx.planArea * 5), reason: "sofa fabric allowance" },
    { materialKey: "hardware", qty: () => 1, reason: "sofa hardware allowance" }
  ],
  SOFA_LEATH: [
    { materialKey: "ply_commercial", qty: (ctx) => Math.max(18, ctx.planArea * 10.764 * 3), reason: "leather sofa frame" },
    { materialKey: "foam", qty: (ctx) => Math.max(24, ctx.planArea * 10.764 * 3), reason: "leather sofa foam" },
    { materialKey: "fabric_mid", qty: (ctx) => Math.max(7, ctx.planArea * 5.5), reason: "leather upholstery proxy" }
  ],
  SOFA_LAM: [
    { materialKey: "ply_commercial", qty: (ctx) => Math.max(16, ctx.planArea * 10.764 * 2), reason: "laminated sofa base board" },
    { materialKey: "laminate", qty: (ctx) => Math.max(12, ctx.planArea * 10.764 * 2), reason: "laminated sofa finish" }
  ],
  COUNTER: [
    { materialKey: "ply_commercial", qty: (ctx) => Math.max(32, ctx.planArea * 10.764 * 4), reason: "counter carcass board" },
    { materialKey: "laminate", qty: (ctx) => Math.max(28, ctx.planArea * 10.764 * 4), reason: "counter laminate finish" },
    { materialKey: "hardware", qty: () => 2, reason: "counter hardware" }
  ],
  COMPACT_BOARD: [
    { materialKey: "compact", qty: (ctx) => Math.max(1, ctx.planArea * 10.764), reason: "compact board area" }
  ],
  UNKNOWN: [
    { materialKey: "ply_commercial", qty: (ctx) => Math.max(6, ctx.planArea * 10.764), reason: "generic board fallback" },
    { materialKey: "hardware", qty: () => 1, reason: "generic hardware fallback" }
  ]
};

export function estimateMaterials(ptype: ProductType, ctx: MaterialFormulaContext): MaterialEstimate[] {
  return (MATMAP[ptype] ?? MATMAP.UNKNOWN)
    .filter((rule) => !rule.when || rule.when(ctx))
    .map((rule) => ({
      materialKey: rule.materialKey,
      qty: roundQty(rule.qty(ctx)),
      reason: rule.reason
    }))
    .filter((line) => line.qty > 0);
}

function roundQty(value: number): number {
  return Math.round(value * 100) / 100;
}
