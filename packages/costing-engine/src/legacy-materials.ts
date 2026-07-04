import type { AddedMaterial, BoqItem, MaterialBreakdownLine, ProductType, RateItem, RatioNorm } from "@kf/shared";
import { parseDims } from "./dimensions";
import { rateMap } from "./rates";
import { materialQtyFromLegacyNorm } from "./regression";

type LegacyRule = {
  k: string[];
  sp: number[];
  lb: string;
  fixed?: number;
};

type LegacyMap = Partial<Record<string, LegacyRule>>;

const SFT_PER_SQM = 10.7639104167;

const LEGACY_MATMAP: Record<ProductType, LegacyMap> = {
  CHAIR: {
    ply_sft: { k: ["ply_12_com", "ply_6_flexi"], sp: [0.45, 0.55], lb: "Plywood" },
    foam_sft: { k: ["foam_40", "foam_25"], sp: [0.55, 0.45], lb: "Foam" },
    uph_mtr: { k: ["fabric_mid"], sp: [1], lb: "Fabric upholstery" },
    uph_sft: { k: ["fabric_mid"], sp: [1], lb: "Fabric seat" },
    metal_kg: { k: ["ms_pipe_gen"], sp: [1], lb: "MS/metal frame" },
    wood_cft: { k: ["wood_ashwood"], sp: [1], lb: "Ashwood frame" },
    polish_sft: { k: ["pu_polish"], sp: [1], lb: "PU Polish" },
    nw_extra: { k: ["non_woven"], sp: [1], lb: "Non-woven", fixed: 1.3 },
    fev_extra: { k: ["fevicol_sft"], sp: [1], lb: "Fevicol", fixed: 8 },
    bostic_extra: { k: ["bostic"], sp: [1], lb: "Bostic adhesive", fixed: 0.25 }
  },
  CHAIR_WOOD: {
    wood_cft: { k: ["wood_ashwood"], sp: [1], lb: "Ashwood frame" },
    ply_sft: { k: ["ply_12_com"], sp: [1], lb: "Seat panel 12mm ply" },
    uph_mtr: { k: ["fabric_mid"], sp: [1], lb: "Fabric upholstery" },
    wood_teak_cft: { k: ["wood_teak"], sp: [1], lb: "CP Teakwood frame" },
    wood_beech_cft: { k: ["wood_beech"], sp: [1], lb: "Beechwood frame" },
    wood_marandi_cft: { k: ["wood_marandi"], sp: [1], lb: "Marandi frame" },
    foam_sft: { k: ["foam_75", "foam_40"], sp: [0.55, 0.45], lb: "Foam" },
    polish_sft: { k: ["pu_polish"], sp: [1], lb: "PU Polish" },
    nw_extra: { k: ["non_woven"], sp: [1], lb: "Non-woven", fixed: 1.3 },
    fev_extra: { k: ["fevicol_sft"], sp: [1], lb: "Fevicol", fixed: 6 },
    bostic_extra: { k: ["bostic"], sp: [1], lb: "Bostic adhesive", fixed: 0.25 }
  },
  CHAIR_RATTAN: {
    wood_cft: { k: ["wood_ashwood"], sp: [1], lb: "Ashwood frame" },
    rattan_sft: { k: ["wood_rattan"], sp: [1], lb: "Rattan weave" },
    foam_sft: { k: ["foam_40", "foam_25"], sp: [0.5, 0.5], lb: "Foam" },
    polish_sft: { k: ["pu_polish"], sp: [1], lb: "PU Polish" }
  },
  CHAIR_AL: {
    metal_kg: { k: ["al_pipe"], sp: [1], lb: "Aluminium pipe" },
    wood_cft: { k: ["wood_teak"], sp: [1], lb: "CP Teakwood" },
    polish_sft: { k: ["nat_polish"], sp: [1], lb: "Natural polish" }
  },
  CHAIR_MS: {
    metal_kg: { k: ["ms_rod_12", "ms_pipe_gen"], sp: [0.6, 0.4], lb: "MS frame" },
    foam_sft: { k: ["foam_25"], sp: [1], lb: "Foam seat" },
    uph_mtr: { k: ["fabric_mid"], sp: [1], lb: "Fabric" },
    powder: { k: ["powder_coat"], sp: [1], lb: "Powder coat finish", fixed: 0.4 }
  },
  STOOL: {
    foam_sft: { k: ["foam_40", "foam_25"], sp: [0.55, 0.45], lb: "Foam" },
    uph_sft: { k: ["fabric_mid"], sp: [1], lb: "Fabric seat" },
    metal_kg: { k: ["ms_pipe_gen", "ms_pipe_25sq"], sp: [0.55, 0.45], lb: "MS pipe frame" },
    polish_sft: { k: ["mel_polish"], sp: [1], lb: "Melamine polish" },
    powder: { k: ["powder_coat"], sp: [1], lb: "Powder coat finish", fixed: 0.35 },
    ply_sft: { k: ["ply_12_com"], sp: [1], lb: "Seat panel" },
    wood_cft: { k: ["wood_ashwood"], sp: [1], lb: "Wood frame" }
  },
  STOOL_OUT: {
    outsourced: { k: ["out_bar_stool"], sp: [1], lb: "Outsourced Ash+Bentwood", fixed: 1 }
  },
  TABLE: {
    ply_sft: { k: ["mdf_25", "laminate"], sp: [0.55, 0.45], lb: "MDF/Laminate top" },
    veneer_sft: { k: ["veneer"], sp: [1], lb: "Wood veneer" },
    wood_slab_sft: { k: ["wood_slab_sft"], sp: [1], lb: "Solid wood top panel" },
    bal_sft: { k: ["balancing"], sp: [1], lb: "Balancing sheet" },
    edge_mtr: { k: ["edgeband_rehau", "edgeband"], sp: [0.6, 0.4], lb: "Edgebanding" },
    metal_kg: { k: ["ms_pipe_63"], sp: [1], lb: "MS base" },
    wood_cft: { k: ["wood_ashwood"], sp: [1], lb: "Wood trim" },
    polish_sft: { k: ["pu_polish"], sp: [1], lb: "PU polish" },
    fevicol_sft: { k: ["fevicol_sft"], sp: [1], lb: "Fevicol" },
    lam_sft: { k: ["laminate", "balancing"], sp: [0.6, 0.4], lb: "Laminate surface" }
  },
  TABLE_WOOD: {
    wood_slab_sft: { k: ["wood_slab_sft"], sp: [1], lb: "Solid wood top panel" },
    wood_cft: { k: ["wood_ashwood"], sp: [1], lb: "Ashwood top" },
    wood_teak_cft: { k: ["wood_teak"], sp: [1], lb: "CP Teakwood top" },
    wood_beech_cft: { k: ["wood_beech"], sp: [1], lb: "Beechwood top" },
    wood_marandi_cft: { k: ["wood_marandi"], sp: [1], lb: "Marandi top" },
    metal_kg: { k: ["ms_pipe_63"], sp: [1], lb: "MS pipe base" },
    polish_sft: { k: ["pu_polish"], sp: [1], lb: "PU polish" },
    fevicol_sft: { k: ["fevicol_sft"], sp: [1], lb: "Fevicol" }
  },
  SOFA: {
    ply_sft: { k: ["ply_18_mr", "ply_12_com"], sp: [0.6, 0.4], lb: "Plywood carcass" },
    foam_sft: { k: ["foam_75", "foam_40", "foam_12"], sp: [0.45, 0.35, 0.2], lb: "Foam layers" },
    uph_mtr: { k: ["leatherite"], sp: [1], lb: "Leatherite upholstery" },
    metal_kg: { k: ["ms_pipe_25sq"], sp: [1], lb: "MS frame" },
    wood_cft: { k: ["wood_ashwood", "wood_marandi"], sp: [0.65, 0.35], lb: "Solid wood frame" },
    edge_mtr: { k: ["edgeband_rehau", "edgeband"], sp: [0.6, 0.4], lb: "Edgebanding" },
    polish_sft: { k: ["pu_polish"], sp: [1], lb: "PU polish" },
    nw_extra: { k: ["non_woven"], sp: [1], lb: "Non-woven lining", fixed: 1.3 },
    el_extra: { k: ["elastic_50"], sp: [1], lb: "Elastic 50mm", fixed: 1 },
    fev_extra: { k: ["fevicol_sft"], sp: [1], lb: "Fevicol", fixed: 8 },
    bostic_extra: { k: ["bostic"], sp: [1], lb: "Bostic adhesive", fixed: 0.5 },
    dacron_sft: { k: ["dacron"], sp: [1], lb: "Dacron wrap", fixed: 14 },
    thread_set: { k: ["upholstery_thread"], sp: [1], lb: "Thread+staples", fixed: 1 },
    piping_mtr: { k: ["piping_cord"], sp: [1], lb: "Piping cord", fixed: 8 }
  },
  SOFA_LEATH: {
    ply_sft: { k: ["ply_18_mr", "ply_12_com"], sp: [0.6, 0.4], lb: "Plywood carcass" },
    foam_sft: { k: ["foam_75", "foam_40", "foam_12"], sp: [0.45, 0.35, 0.2], lb: "Foam layers" },
    uph_sft: { k: ["leather_real"], sp: [1], lb: "Real leather" },
    metal_kg: { k: ["ms_pipe_40sq"], sp: [1], lb: "MS frame" },
    wood_cft: { k: ["wood_marandi"], sp: [1], lb: "Marandi frame" },
    springs_set: { k: ["springs_set"], sp: [1], lb: "Zigzag springs", fixed: 1 },
    screws_pkg: { k: ["screws"], sp: [1], lb: "Screws", fixed: 2 }
  },
  SOFA_LAM: {
    ply_sft: { k: ["ply_18_mr", "ply_12_com"], sp: [0.6, 0.4], lb: "Plywood" },
    lam_sft: { k: ["laminate", "balancing"], sp: [0.6, 0.4], lb: "Laminate surface" },
    edge_mtr: { k: ["edgeband_rehau", "edgeband"], sp: [0.6, 0.4], lb: "Edgebanding" },
    foam_sft: { k: ["foam_75", "foam_40", "foam_25"], sp: [0.45, 0.35, 0.2], lb: "Foam" },
    uph_mtr: { k: ["leatherite"], sp: [1], lb: "Leatherite seat" },
    metal_kg: { k: ["ms_pipe_40sq"], sp: [1], lb: "MS frame" },
    fev_extra: { k: ["fevicol_sft"], sp: [1], lb: "Fevicol", fixed: 8 },
    bostic_extra: { k: ["bostic"], sp: [1], lb: "Bostic adhesive", fixed: 0.5 },
    dacron_sft: { k: ["dacron"], sp: [1], lb: "Dacron wrap", fixed: 14 },
    thread_set: { k: ["upholstery_thread"], sp: [1], lb: "Thread+staples", fixed: 1 }
  },
  COMPACT_BOARD: {
    compact_sft: { k: ["compact_board"], sp: [1], lb: "Compact Board" },
    edge_mtr: { k: ["edgeband"], sp: [1], lb: "Edgeband" }
  },
  COUNTER: {
    ply_sft: { k: ["ply_18_mr", "ply_12_com"], sp: [0.7, 0.3], lb: "Plywood carcass" },
    lam_sft: { k: ["laminate", "balancing"], sp: [0.6, 0.4], lb: "Laminate surface" },
    edge_mtr: { k: ["edgeband_rehau", "edgeband"], sp: [0.6, 0.4], lb: "Edgebanding" },
    fev_extra: { k: ["fevicol_sft"], sp: [1], lb: "Fevicol", fixed: 8 },
    metal_kg: { k: ["ms_pipe_gen"], sp: [1], lb: "MS skirting" }
  },
  UNKNOWN: {}
};

export function estimateLegacyBreakdown(input: {
  item: BoqItem;
  ptype: ProductType;
  rates?: RateItem[];
  ratioNorms?: RatioNorm[];
}): MaterialBreakdownLine[] {
  const { item, ptype } = input;
  const ratesByKey = rateMap(input.rates);
  const dims = dimensionsWithDefaults(item.name, ptype, item.dims);
  const L = dims.L || 600;
  const W = dims.W || L;
  const H = dims.H || 750;
  const spec = `${item.spec ?? ""} ${item.aiSpec ?? ""}`.toUpperCase();
  const ct = (item.ct ?? "").toUpperCase();
  const sig = `${ct} ${spec}`;
  const planAreaSft = dims.isCircular ? Math.PI * Math.pow(L / 304.8 / 2, 2) : (L / 304.8) * (W / 304.8);
  const planAreaSqm = planAreaSft / SFT_PER_SQM;
  const perimeterM = dims.isCircular ? Math.PI * (L / 1000) : 2 * ((L + W) / 1000);

  const hasWood = /ASHWOOD|ASH WOOD|TEAKWOOD|MARANDI|BEECHWOOD|OAK|MANGO|WALNUT|SHEESHAM|ACACIA|RATTAN|CP TEAK|SOLID WOOD|WOOD.?TOP|WOOD.?TABLE/.test(sig) || ["CHAIR_WOOD", "CHAIR_RATTAN", "CHAIR_AL", "TABLE_WOOD"].includes(ptype);
  const hasAshwood = /ASHWOOD|ASH[. ]?WOOD|SOLID[. ]?ASH/.test(sig);
  const hasTeakwood = /CP[. ]?TEAK|CP[. ]?TEAKWOOD|TEAKWOOD|TEAK[. ]?FRAME|TEAK[. ]?LEG/.test(sig);
  const hasMarandi = /MARANDI/.test(sig);
  const hasBeech = /BEECHWOOD|BEECH[. ]?WOOD|SOLID[. ]?BEECH/.test(sig);
  const hasSpecificWoodSpecies = hasAshwood || hasTeakwood || hasMarandi || hasBeech;
  const hasVeneer = /VENEER/.test(sig);
  const hasPly = /PLYWOOD|\bPLY\b|\bMDF\b|HDHMR|PRELAM/.test(sig);
  const hasMdf = /\bMDF\b|PRELAM/.test(sig);
  const hasLam = /LAMINATE|PRELAM|HPL/.test(sig);
  const hasStoneTop = /STONE.?TOP|MARBLE.?TOP|GRANITE|QUARTZ|STONE|MARBLE/.test(sig);
  const hasSolidWoodTop = hasWood && /TOP|TABLE.?TOP|WOOD.?TOP|SOLID.?TOP|\d+MM.?THICK|THICK.?\d+MM/.test(spec) && !hasPly && !hasMdf && !hasLam;
  const hasWoodFinish = /MONO.?COAT|PU.?FINISH|PU.?POLISH|NAT.?POLISH|NATURAL.?POLISH|MELAMINE.?FINISH|OIL.?FINISH|WAX.?FINISH|LACQUER/.test(spec);
  const hasLooseBase = /LOOSE.{0,15}BASE|SEPARATE.{0,10}BASE/.test(spec);

  const lines: MaterialBreakdownLine[] = [];
  const seen = new Set<string>();
  const matmap = LEGACY_MATMAP[ptype] ?? {};

  mergePrimarySpecMaterials(lines, ratesByKey, { spec, ptype, planAreaSft });

  for (const [varId, rule] of Object.entries(matmap)) {
    if (!rule) continue;
    if (skipRule(varId, ptype, { hasWood, hasAshwood, hasTeakwood, hasMarandi, hasBeech, hasSpecificWoodSpecies, hasVeneer, hasStoneTop, hasSolidWoodTop, hasWoodFinish, hasLooseBase })) continue;
    const derived = deriveQty({
      varId,
      rule,
      item,
      ptype,
      planAreaSft,
      planAreaSqm,
      perimeterM,
      L,
      W,
      H,
      sig,
      ratioNorms: input.ratioNorms
    });
    if (!derived) continue;

    for (let i = 0; i < rule.k.length; i += 1) {
      const key = item.materialOverrides?.[rule.k[i]] ?? rule.k[i];
      if (seen.has(key)) continue;
      const rate = ratesByKey.get(key);
      if (!rate || rate.rate <= 0) continue;
      seen.add(key);

      let qty = roundQty((item.qtyOverrides?.[rule.k[0]] ?? derived.qty) * (rule.sp[i] ?? 1));
      let unitRate = item.rateOverrides?.[key] ?? rate.rate;
      if (["fabric_mid", "lustrell", "leatherite"].includes(key) && item.fabricMtr && item.fabricMtr > 0) qty = item.fabricMtr;
      if (["fabric_mid", "lustrell", "leatherite"].includes(key) && item.fabricRate && item.fabricRate > 0) unitRate = item.fabricRate;
      if (qty < 0.01) continue;
      lines.push({
        materialKey: key,
        label: rule.lb + (rule.k.length > 1 ? ` (${rate.label})` : ""),
        qty,
        unit: rate.unit,
        rate: unitRate,
        amount: roundMoney(qty * unitRate),
        source: item.qtyOverrides?.[rule.k[0]] || item.rateOverrides?.[key] ? "override" : derived.source
      });
    }
  }

  mergeSpecMaterials(lines, ratesByKey, { spec, ptype, planAreaSft, perimeterM });
  appendAddedMaterials(lines, item.addedMaterials, ratesByKey);
  return lines;
}

function deriveQty(input: {
  varId: string;
  rule: LegacyRule;
  item: BoqItem;
  ptype: ProductType;
  planAreaSft: number;
  planAreaSqm: number;
  perimeterM: number;
  L: number;
  W: number;
  H: number;
  sig: string;
  ratioNorms?: RatioNorm[];
}): { qty: number; source: MaterialBreakdownLine["source"] } | undefined {
  if (input.rule.fixed !== undefined) return { qty: input.rule.fixed, source: "fixed" };
  if (input.varId === "edge_mtr") return { qty: input.perimeterM, source: "geometry" };
  if (input.varId === "uph_mtr" && input.item.fabricMtr && input.item.fabricMtr > 0) return { qty: input.item.fabricMtr, source: "user" };
  if (input.ptype === "TABLE" || input.ptype === "TABLE_WOOD") {
    const tableQty = tableSpecQty(input);
    if (tableQty) return tableQty;
  }

  const normQty = materialQtyFromLegacyNorm({
    ptype: input.ptype,
    materialKey: input.varId,
    planAreaSft: input.planAreaSft,
    ratioNorms: input.ratioNorms
  });
  if (normQty && normQty > 0.01) return { qty: capQty(input.varId, input.ptype, normQty, input.planAreaSft), source: "model" };

  return seedQty(input);
}

function tableSpecQty(input: { varId: string; planAreaSft: number; L: number; W: number; H: number; sig: string }): { qty: number; source: MaterialBreakdownLine["source"] } | undefined {
  const t = input.sig;
  const hasPly = /PLYWOOD|\bPLY\b|HDHMR/.test(t);
  const hasLam = /LAMINATE|PRELAM|HPL/.test(t);
  const hasVeneer = /VENEER/.test(t);
  const hasMdf = /\bMDF\b/.test(t);
  const hasStone = /STONE.?TOP|MARBLE.?TOP|GRANITE|QUARTZ|STONE|MARBLE/.test(t);
  const hasMSBase = /\bMS\b|MS[. ]PIPE|MS[. ]FLAT|MS[. ]LEG|MS[. ]FRAME|MS[. ]TUBE|MILD.?STEEL|STEEL.?BASE|METAL.?LEG|METAL.?BASE|METAL.?FRAME|SPIDER|PEDESTAL|TRUMPET/.test(t);
  const hasWood = /ASHWOOD|ASH.?WOOD|TEAKWOOD|TEAK.?WOOD|MARANDI|BEECHWOOD|SOLID.?WOOD|WOOD.?TOP/.test(t);
  const solidWoodTop = hasWood && /TOP|TABLE.?TOP|WOOD.?TOP|SOLID.?TOP|THICK/.test(t) && !hasPly && !hasMdf && !hasLam;

  switch (input.varId) {
    case "ply_sft":
      if (hasStone) return undefined;
      if (!hasPly && !hasMdf) return undefined;
      return { qty: input.planAreaSft * 1.15, source: "spec" };
    case "lam_sft":
      return hasLam && !hasStone ? { qty: input.planAreaSft * 1.1, source: "spec" } : undefined;
    case "bal_sft":
      return (hasPly || hasMdf) && !hasStone ? { qty: input.planAreaSft * 0.9, source: "spec" } : undefined;
    case "veneer_sft":
      return hasVeneer && !hasStone ? { qty: input.planAreaSft * 1.15, source: "spec" } : undefined;
    case "metal_kg":
      if (!hasMSBase) return undefined;
      return { qty: Math.min(10, Math.max(2, input.planAreaSft * 1.5)), source: "spec" };
    case "wood_cft":
      return solidWoodTop ? undefined : hasWood ? { qty: 4 * (50 / 304.8) * (50 / 304.8) * (input.H / 304.8) + 2 * ((input.L + input.W) / 304.8) * (80 / 304.8) * (25 / 304.8), source: "spec" } : undefined;
    case "wood_slab_sft":
      return solidWoodTop ? { qty: input.planAreaSft * 1.08, source: "spec" } : undefined;
    case "polish_sft":
      return hasWood ? { qty: input.planAreaSft * 1.05, source: "spec" } : undefined;
    case "fevicol_sft":
      return hasPly || hasMdf ? { qty: input.planAreaSft * 0.8, source: "spec" } : undefined;
    default:
      return undefined;
  }
}

function seedQty(input: { varId: string; ptype: ProductType; planAreaSft: number; L: number; W: number; H: number }): { qty: number; source: MaterialBreakdownLine["source"] } | undefined {
  const area = Math.max(0.1, input.planAreaSft);
  const qty = (() => {
    if (input.varId === "ply_sft") return area * (input.ptype.startsWith("SOFA") ? 5 : input.ptype === "COUNTER" ? 4 : 1.4);
    if (input.varId === "foam_sft") return area * (input.ptype.startsWith("SOFA") ? 3.2 : 1.4);
    if (input.varId === "uph_mtr") return area * (input.ptype.startsWith("SOFA") ? 0.24 : 0.2);
    if (input.varId === "metal_kg") return area * (input.ptype.startsWith("TABLE") ? 1.15 : 0.9);
    if (input.varId === "wood_cft") return area * 0.13;
    if (input.varId === "polish_sft") return area * 1.6;
    if (input.varId === "lam_sft") return area * 1.2;
    if (input.varId === "bal_sft") return area * 1.1;
    return 0;
  })();
  return qty > 0.01 ? { qty: capQty(input.varId, input.ptype, qty, area), source: "seed" } : undefined;
}

function mergeSpecMaterials(lines: MaterialBreakdownLine[], ratesByKey: Map<string, RateItem>, input: { spec: string; ptype: ProductType; planAreaSft: number; perimeterM: number }) {
  const push = (key: string, label: string, qty: number, source: MaterialBreakdownLine["source"] = "spec") => {
    if (qty < 0.01) return;
    const rate = ratesByKey.get(key);
    if (!rate || rate.rate <= 0) return;
    const existing = lines.find((line) => line.materialKey === key);
    if (existing) {
      existing.label = label;
      existing.qty = roundQty(qty);
      existing.unit = rate.unit;
      existing.rate = rate.rate;
      existing.amount = roundMoney(qty * rate.rate);
      existing.source = source;
      return;
    }
    lines.push({ materialKey: key, label, qty: roundQty(qty), unit: rate.unit, rate: rate.rate, amount: roundMoney(qty * rate.rate), source });
  };

  const t = input.spec;
  const isTable = input.ptype === "TABLE" || input.ptype === "TABLE_WOOD";
  const hasStone = /STONE.?TOP|MARBLE.?TOP|GRANITE|QUARTZ/.test(t);
  const hasSolidSurface = /SOLID.?SURFACE|CORIAN|HI.?MACS/.test(t);
  const hasMdf25 = /25.?MM.?MDF|MDF.?25/.test(t);
  const hasMdf18 = /18.?MM.?MDF|MDF.?18/.test(t);
  const hasMdf = /\bMDF\b/.test(t);
  const hasPly18 = /18.?MM.?PLY|PLY.?18|PLYWOOD/.test(t);
  const hasPly12 = /12.?MM.?PLY|PLY.?12/.test(t);
  const hasLaminate = /LAMINATE|LAMINATED|HPL/.test(t) && !/VENEER/.test(t);
  const hasVeneer = /VENEER/.test(t);
  const hasLooseBase = /LOOSE.?(BASE|METAL)|SEPARATE.?BASE|SPIDER.?(BASE|PLATE)|PEDESTAL.?BASE|TRUMPET.?BASE/.test(t);
  const hasMsFrame = /MS.?PIPE|METAL.?BASE|MS.?FRAME|MS.?BASE|MS.?LEG|METAL.?FRAME|METAL.?LEG|POWDER.?COAT.?(METAL|MS|BASE)/.test(t);
  const hasPowderCoat = /POWDER.?COAT/.test(t);

  if (hasMdf25) push("mdf_25", "MDF 25mm substrate", input.planAreaSft * 2.8);
  else if (hasMdf18) push("mdf_18", "MDF 18mm substrate", input.planAreaSft * 2.8);
  else if (hasMdf) push("mdf_18", "MDF substrate", input.planAreaSft * 2.5);

  if (hasPly18) push("ply_18_mr", isTable ? "Plywood 18mm top" : "Plywood 18mm carcass", input.planAreaSft * (isTable ? 1.15 : 2.8));
  else if (hasPly12) push("ply_12_com", "Plywood 12mm", input.planAreaSft * (isTable ? 1.15 : 2.2));

  if (hasLaminate && !hasStone && !hasSolidSurface) {
    push("laminate", "Laminate surface", input.planAreaSft * 2.5);
    push("balancing", "Balancing sheet", input.planAreaSft * 2);
  }
  if (hasVeneer && !hasStone && !hasSolidSurface) push("veneer", "Wood veneer", input.planAreaSft * 1.5);
  if (hasStone || hasSolidSurface) push(hasStone ? "stone" : "ss_surface", hasStone ? "Stone/Marble top incl. fabrication" : "Solid surface incl. fabrication", input.planAreaSft * 1.05);
  if (/WIRE.?SUPPORT/.test(t)) push("ms_wire", "MS wire support", 1.5);
  if (hasMsFrame && !hasLooseBase) {
    const kg = input.planAreaSft > 0 ? input.planAreaSft * 3.5 : 6;
    push("ms_pipe_gen", "MS frame/pipe", kg);
    if (hasPowderCoat) push("powder_coat", "Powder coat", kg);
  } else if (hasLooseBase) {
    const kg = Math.min(10, Math.max(2, input.planAreaSft * 1.5));
    push("ms_pipe_63", "MS loose base estimate", kg);
    if (hasPowderCoat) push("powder_coat", "Powder coat base", Math.min(kg, 3));
  }
  if (input.perimeterM > 0 && (hasMdf || hasPly18 || hasPly12 || hasLaminate)) push("edgeband", "Edgebanding", input.perimeterM * 3);
  if (/\bBIN\b/.test(t)) {
    push("ms_pipe_gen", "Bin frame/lining estimate", 2);
    push("hinge_soft", "Hinges", 2);
  }
  if (input.planAreaSft > 0 && (hasMdf || hasPly18 || hasLaminate)) push("fevicol_sft", "Fevicol", input.planAreaSft * 2);
}

function mergePrimarySpecMaterials(lines: MaterialBreakdownLine[], ratesByKey: Map<string, RateItem>, input: { spec: string; ptype: ProductType; planAreaSft: number }) {
  const push = (key: string, label: string, qty: number) => {
    const rate = ratesByKey.get(key);
    if (!rate || lines.some((line) => line.materialKey === key)) return;
    lines.push({ materialKey: key, label, qty: roundQty(qty), unit: rate.unit, rate: rate.rate, amount: roundMoney(qty * rate.rate), source: "spec" });
  };

  if (/STONE|MARBLE|GRANITE|QUARTZ/.test(input.spec)) {
    push("stone", "Stone/Marble top incl. fabrication", input.planAreaSft * 1.05);
  }
}

function appendAddedMaterials(lines: MaterialBreakdownLine[], added: AddedMaterial[] | undefined, ratesByKey: Map<string, RateItem>) {
  for (const material of added ?? []) {
    const rate = ratesByKey.get(material.materialKey);
    const unitRate = material.rate ?? rate?.rate ?? 0;
    if (!material.qty || !unitRate) continue;
    lines.push({
      materialKey: material.materialKey,
      label: material.label ?? rate?.label ?? material.materialKey,
      qty: material.qty,
      unit: material.unit ?? rate?.unit ?? "NOS",
      rate: unitRate,
      amount: roundMoney(material.qty * unitRate),
      source: "added"
    });
  }
}

function skipRule(varId: string, ptype: ProductType, flags: Record<string, boolean>): boolean {
  if (["wood_cft", "wood_teak_cft", "wood_beech_cft", "wood_marandi_cft"].includes(varId) && !flags.hasWood) return true;
  if (varId === "wood_teak_cft" && !flags.hasTeakwood) return true;
  if (varId === "wood_marandi_cft" && !flags.hasMarandi) return true;
  if (varId === "wood_beech_cft" && !flags.hasBeech) return true;
  if (varId === "wood_cft" && flags.hasSpecificWoodSpecies && !flags.hasAshwood) return true;
  if (varId === "polish_sft" && flags.hasSolidWoodTop && !flags.hasWoodFinish) return true;
  if (["ply_sft", "lam_sft", "bal_sft"].includes(varId) && flags.hasSolidWoodTop) return true;
  if (varId === "ply_sft" && flags.hasStoneTop && (ptype === "TABLE" || ptype === "TABLE_WOOD")) return true;
  if (["lam_sft", "bal_sft", "veneer_sft"].includes(varId) && flags.hasStoneTop) return true;
  if (varId === "wood_slab_sft" && !flags.hasSolidWoodTop) return true;
  if (varId === "wood_cft" && flags.hasSolidWoodTop && ptype === "TABLE") return true;
  if (varId === "veneer_sft" && !flags.hasVeneer) return true;
  if (varId === "metal_kg" && flags.hasLooseBase) return true;
  return false;
}

function dimensionsWithDefaults(name: string, ptype: ProductType, dims: string) {
  const parsed = parseDims(dims);
  if (parsed.L) return parsed;
  const n = name.toUpperCase();
  const fallback = /DOUBLE.?BIN|TWIN.?BIN|BIN.?UNIT/.test(n)
    ? { L: 700, W: 450, H: 850 }
    : /SINGLE.?BIN|BIN/.test(n)
      ? { L: 450, W: 450, H: 850 }
      : /SIDE.?STORAGE|SIDE.?UNIT|STORAGE|CABINET|CUPBOARD|WARDROBE/.test(n)
        ? { L: 1200, W: 500, H: 900 }
        : /COUNTER|SERVICE.?STATION|KIOSK/.test(n) || ptype === "COUNTER"
          ? { L: 1500, W: 700, H: 900 }
          : /SHELF|RACK/.test(n)
            ? { L: 1200, W: 350, H: 1800 }
            : /CREDENZA|CONSOLE/.test(n)
              ? { L: 1500, W: 450, H: 750 }
              : { L: 600, W: 600, H: 750 };
  return { ...parsed, ...fallback, planArea: (fallback.L / 1000) * (fallback.W / 1000), isCircular: false };
}

function capQty(varId: string, ptype: ProductType, qty: number, planAreaSft: number): number {
  const family = ptype.startsWith("SOFA") ? "SOFA" : ptype.startsWith("CHAIR") ? "CHAIR" : ptype;
  const caps: Record<string, number> = {
    ply_sft: planAreaSft * (({ TABLE: 4.5, SOFA: 5.5, CHAIR: 5, STOOL: 4, COUNTER: 5 } as Record<string, number>)[family] ?? 4.5),
    foam_sft: planAreaSft * (({ TABLE: 2, SOFA: 3, CHAIR: 3, STOOL: 2.5 } as Record<string, number>)[family] ?? 2),
    lam_sft: planAreaSft * 3.5,
    bal_sft: planAreaSft * 2.5,
    polish_sft: planAreaSft * 4
  };
  return caps[varId] ? Math.min(qty, caps[varId]) : qty;
}

function roundQty(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
