import type { RateItem } from "@kf/shared";
import { LEGACY_BASE_RATES } from "./legacy-data.generated";

const COMPAT_RATES: RateItem[] = [
  alias("ply_commercial", "ply_18_mr", "Commercial plywood"),
  alias("mdf", "mdf_18", "MDF board"),
  alias("compact", "compact_board", "Compact board"),
  alias("polish", "pu_polish", "Polish"),
  alias("foam", "foam_40", "Foam"),
  alias("metal_ms", "ms_pipe_gen", "Mild steel"),
  alias("aluminium", "al_pipe", "Aluminium"),
  alias("wood_ash", "wood_ashwood", "Ash wood"),
  alias("stone", "ss_surface", "Stone or marble top"),
  alias("edge_band", "edgeband", "Edge banding"),
  alias("hardware", "hinge_soft", "Hardware set")
];

export const BASE_RATES: RateItem[] = [...LEGACY_BASE_RATES, ...COMPAT_RATES];

export function rateMap(rates: RateItem[] = BASE_RATES): Map<string, RateItem> {
  const map = new Map(BASE_RATES.map((rate) => [rate.key, rate]));
  for (const rate of rates) map.set(rate.key, rate);
  return map;
}

function alias(key: string, legacyKey: string, label: string): RateItem {
  const legacy = LEGACY_BASE_RATES.find((rate) => rate.key === legacyKey);
  return {
    key,
    label,
    rate: legacy?.rate ?? 0,
    unit: legacy?.unit ?? "NOS",
    category: legacy?.category ?? "Other",
    source: `legacy-alias:${legacyKey}`
  };
}
