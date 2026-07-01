import type { ProductType } from "@kf/shared";

export function inferCTFromSpec(name = "", spec = ""): string {
  const text = `${name} ${spec}`.toUpperCase();
  const parts: string[] = [];

  if (/STAINLESS.?STEEL|SS.?304|SS.?FRAME|SS.?PIPE/.test(text)) parts.push("SS");
  else if (/ALUMIN/.test(text)) parts.push("ALUMINIUM");
  else if (/MILD.?STEEL|MS.?PIPE|MS.?ROD|MS.?TUBE|MS.?FRAME|METAL.?FRAME|IRON.?FRAME|POWDER.?COA|ERW.?PIPE|SQUARE.?TUBE/.test(text) || (/\bMS\b/.test(text) && /TUBE|PIPE|ROD|FRAME|BASE/.test(text))) parts.push("MS");

  if (/COMPACT.?BOARD|COMPACT.?SHEET|SOFT.?BOARD/.test(text)) parts.push("COMPACT BOARD");
  else if (/\bMDF\b|PRELAM.?MDF|MDF.?PRELAM/.test(text)) parts.push("MDF");
  else if (/PLYWOOD|MR.?PLY|BWP.?PLY|HDHMR|\d+MM.?PLY|PLY.?\d+MM|PLY.?BASED/.test(text)) parts.push("PLYWOOD");

  if (/SOLID.?SURFACE|CORIAN|HI.?MACS|STONE|MARBLE|GRANITE|QUARTZ/.test(text)) parts.push("STONE");
  else if (/VENEER|VENEERED|WOOD.?VENEER/.test(text)) parts.push("VENEER");
  else if (/\bLAMINATE\b|HPL|GREENLAM|CENTURY.?LAM|MERINO.?LAM/.test(text) && !/LAMINATED\s+(BASE|STRUCTURE|PLY|BODY|FRAME|BOARD|CORE|SEATING)/.test(text)) parts.push("LAMINATE");

  const species = /CP.?TEAK|TEAKWOOD/.test(text)
    ? "CP TEAKWOOD"
    : /ASHWOOD|ASH.?WOOD|SOLID.?ASH/.test(text)
      ? "ASHWOOD"
      : /BEECHWOOD|BEECH.?WOOD|SOLID.?BEECH/.test(text)
        ? "BEECHWOOD"
        : /MARANDI/.test(text)
          ? "MARANDI"
          : /\bOAK\b|MANGO.?WOOD|WALNUT.?WOOD|SHEESHAM|RUBBERWOOD|SOLID.?WOOD|WOODEN.?FRAME|WOOD.?FRAME|HARDWOOD|WOOD.?TOP/.test(text)
            ? "ASHWOOD"
            : null;
  if (species) parts.push(species);

  if (/RATTAN|CANE|WICKER/.test(text)) parts.push("RATTAN");
  if (/UPHOLSTER|\bFABRIC\b|FOAM|LEATHERITE|LEATHER.?SEAT|CUSHION|IN FABRIC|SEAT.*BACK/.test(text)) parts.push("UPHOLSTERED");

  return [...new Set(parts)].join(" + ");
}

export function ptypeFromCT(ct = "", fallback: ProductType = "UNKNOWN"): ProductType {
  const text = ct.toUpperCase();
  if (/SOFA|BOOTH|BANQUET|BANQUETE/.test(text)) return /REAL.?LEATH|GENUINE.?LEATH/.test(text) ? "SOFA_LEATH" : /LAMINATE|PLYWOOD|MDF/.test(text) ? "SOFA_LAM" : "SOFA";
  if (/CHAIR/.test(text)) {
    if (/RATTAN|CANE|WICKER/.test(text)) return "CHAIR_RATTAN";
    if (/ALUMINIUM/.test(text)) return "CHAIR_AL";
    if (/\bMS\b|METAL|STEEL/.test(text)) return "CHAIR_MS";
    if (/WOOD|ASH|TEAK|BEECH|MARANDI/.test(text)) return "CHAIR_WOOD";
    return "CHAIR";
  }
  if (/STOOL/.test(text)) return /OUTSOURCE|BENTWOOD/.test(text) ? "STOOL_OUT" : "STOOL";
  if (/COUNTER|KIOSK|PODIUM|SERVICE.?STATION/.test(text)) return "COUNTER";
  if (/COMPACT/.test(text)) return "COMPACT_BOARD";
  if (/TABLE|CONSOLE|CREDENZA/.test(text)) return /WOOD|ASH|TEAK|BEECH|MARANDI/.test(text) && !/PLYWOOD|MDF|LAMINATE/.test(text) ? "TABLE_WOOD" : "TABLE";
  return fallback;
}

export function classify(name = "", dims = "", spec = ""): ProductType {
  const upperName = name.toUpperCase();
  const desc = spec.toUpperCase();
  const all = `${upperName} ${dims.toUpperCase()} ${desc}`;
  const ct = inferCTFromSpec(name, spec);

  const specAlum = /ALUMIN|ALUM PIPE|ALUM FRAME/.test(desc);
  const specMetal = /MILD.?STEEL|MS.?PIPE|MS.?ROD|MS.?TUBE|MS.?FRAME|MS.?SECTION|METAL.?FRAME|IRON.?FRAME|STEEL.?FRAME|POWDER.?COAT|FERROGRAIN|TUBULAR.?STEEL|GALVAN|25MM.?DIA|32MM.?DIA|38MM.?DIA|ERW.?PIPE|SQUARE.?TUBE/.test(desc);
  const specWood = /ASHWOOD|SOLID.?ASH|TEAK|MARANDI|BEECH|SOLID.?WOOD|WOODEN.?FRAME|RUBBERWOOD|SHEESHAM|MANGO.?WOOD|OAK.?WOOD/.test(desc);
  const specStool = /BAR.?STOOL|HIGH.?STOOL|COUNTER.?STOOL/.test(all);
  const specSofa = /SOFA|COUCH|SETTEE|BOOTH|BANQUET/.test(all);

  if (/OUTSOURC|AJAY|BENTWOOD/.test(all)) return "STOOL_OUT";
  if (specStool) return "STOOL";
  if (specSofa) {
    if (/REAL.?LEATH|FULL.?LEATH|GENUINE.?LEATH/.test(desc)) return "SOFA_LEATH";
    if (/LAMINAT/.test(desc)) return "SOFA_LAM";
    return "SOFA";
  }
  if (/COUNTER|SERVICE.?STAT|RECEPTION|PODIUM|KIOSK/.test(all)) return "COUNTER";
  if (/COMPACT.?BOARD/.test(all)) return "COMPACT_BOARD";
  if (/TABLE/.test(all) && !/CHAIR|SOFA|STOOL|BOOTH/.test(all)) return specWood ? "TABLE_WOOD" : "TABLE";
  if (/\bBIN\b|TRASHBIN|STORAGE|SHELF|SHELVING|\bRACK\b|DIVIDER|SCREEN|CREDENZA|CONSOLE|SIDEBOARD/.test(all)) return "TABLE";

  if (/CHAIR|SEAT/.test(upperName) || /CHAIR/.test(all)) {
    if (specAlum) return "CHAIR_AL";
    if (specMetal && !specWood) return "CHAIR_MS";
    if (/RATTAN|CANE|WICKER|BAMBOO/.test(desc) || /RATTAN|CANE/.test(upperName)) return "CHAIR_RATTAN";
    if (/ASHWOOD|SOLID.?ASH|ASH.?WOOD|CP.?TEAK|TEAK.?WOOD|MARANDI|BEECHWOOD|SOLID.?BEECH|RUBBERWOOD|SHEESHAM|MANGO.?WOOD/.test(desc) || (specWood && !specMetal)) return "CHAIR_WOOD";
    return "CHAIR";
  }

  if (/STOOL|OTTOMAN/.test(all)) return "STOOL";
  if (/TABLE|DESK|TOP\b|CONSOLE/.test(all)) return ptypeFromCT(`TABLE ${ct}`, "TABLE");

  return "UNKNOWN";
}
