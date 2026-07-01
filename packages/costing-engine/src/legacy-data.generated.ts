import type { RateItem, RatioNorm } from "@kf/shared";

export const LEGACY_BASE_RATES: RateItem[] = [
  {
    "key": "wood_ashwood",
    "label": "Ashwood",
    "rate": 1900,
    "unit": "CFT",
    "category": "Wood",
    "source": "legacy:compiled"
  },
  {
    "key": "wood_teak",
    "label": "CP Teakwood",
    "rate": 5200,
    "unit": "CFT",
    "category": "Wood",
    "source": "legacy:compiled"
  },
  {
    "key": "wood_marandi",
    "label": "Marandi Wood",
    "rate": 1250,
    "unit": "CFT",
    "category": "Wood",
    "source": "legacy:compiled"
  },
  {
    "key": "wood_beech",
    "label": "Beechwood",
    "rate": 1500,
    "unit": "CFT",
    "category": "Wood",
    "source": "legacy:compiled"
  },
  {
    "key": "wood_rattan",
    "label": "Rattan",
    "rate": 300,
    "unit": "SFT",
    "category": "Wood",
    "source": "legacy:compiled"
  },
  {
    "key": "ply_18_mr",
    "label": "Ply 18mm Commercial",
    "rate": 82,
    "unit": "SFT",
    "category": "Plywood",
    "source": "legacy:compiled"
  },
  {
    "key": "ply_18_bwp",
    "label": "Ply 18mm BWP",
    "rate": 94,
    "unit": "SFT",
    "category": "Plywood",
    "source": "legacy:compiled"
  },
  {
    "key": "ply_12_com",
    "label": "Ply 12mm Commercial",
    "rate": 42,
    "unit": "SFT",
    "category": "Plywood",
    "source": "legacy:compiled"
  },
  {
    "key": "ply_6_flexi",
    "label": "Flexi Ply 6+6+6mm",
    "rate": 32,
    "unit": "SFT",
    "category": "Plywood",
    "source": "legacy:compiled"
  },
  {
    "key": "mdf_25",
    "label": "MDF 25mm",
    "rate": 65.5,
    "unit": "SFT",
    "category": "MDF",
    "source": "legacy:compiled"
  },
  {
    "key": "mdf_18",
    "label": "MDF 18mm",
    "rate": 59.61,
    "unit": "SFT",
    "category": "MDF",
    "source": "legacy:compiled"
  },
  {
    "key": "mdf_12",
    "label": "MDF 12mm",
    "rate": 27.81,
    "unit": "SFT",
    "category": "MDF",
    "source": "legacy:compiled"
  },
  {
    "key": "laminate",
    "label": "Laminate 1mm",
    "rate": 39.22,
    "unit": "SFT",
    "category": "Laminate",
    "source": "legacy:compiled"
  },
  {
    "key": "balancing",
    "label": "Balancing sheet",
    "rate": 10.78,
    "unit": "SFT",
    "category": "Laminate",
    "source": "legacy:compiled"
  },
  {
    "key": "edgeband",
    "label": "Edgebanding std",
    "rate": 45.38,
    "unit": "MTR",
    "category": "Edgeband",
    "source": "legacy:compiled"
  },
  {
    "key": "edgeband_rehau",
    "label": "Rehau 30x2mm",
    "rate": 32.89,
    "unit": "MTR",
    "category": "Edgeband",
    "source": "legacy:compiled"
  },
  {
    "key": "ms_pipe_gen",
    "label": "MS Pipe (general)",
    "rate": 77,
    "unit": "KG",
    "category": "Metal MS",
    "source": "legacy:compiled"
  },
  {
    "key": "ms_pipe_63",
    "label": "MS Pipe 63x1.6mm",
    "rate": 76,
    "unit": "KG",
    "category": "Metal MS",
    "source": "legacy:compiled"
  },
  {
    "key": "ms_pipe_25sq",
    "label": "MS Pipe 25x25mm",
    "rate": 77.25,
    "unit": "KG",
    "category": "Metal MS",
    "source": "legacy:compiled"
  },
  {
    "key": "ms_pipe_40sq",
    "label": "MS Pipe 40x40mm",
    "rate": 77.67,
    "unit": "KG",
    "category": "Metal MS",
    "source": "legacy:compiled"
  },
  {
    "key": "ms_rod_12",
    "label": "MS Rod 12mm",
    "rate": 70,
    "unit": "KG",
    "category": "Metal MS",
    "source": "legacy:compiled"
  },
  {
    "key": "ms_sq_30",
    "label": "MS CR Sq 30x30mm",
    "rate": 78.5,
    "unit": "KG",
    "category": "Metal MS",
    "source": "legacy:compiled"
  },
  {
    "key": "al_pipe",
    "label": "Aluminium Pipe",
    "rate": 449.9,
    "unit": "KG",
    "category": "Aluminium",
    "source": "legacy:compiled"
  },
  {
    "key": "foam_75",
    "label": "Foam 75mm HR",
    "rate": 66.1,
    "unit": "SFT",
    "category": "Foam",
    "source": "legacy:compiled"
  },
  {
    "key": "foam_50",
    "label": "Foam 50mm",
    "rate": 53.5,
    "unit": "SFT",
    "category": "Foam",
    "source": "legacy:compiled"
  },
  {
    "key": "foam_40",
    "label": "Foam 40mm",
    "rate": 43.8,
    "unit": "SFT",
    "category": "Foam",
    "source": "legacy:compiled"
  },
  {
    "key": "foam_25",
    "label": "Foam 25mm",
    "rate": 27,
    "unit": "SFT",
    "category": "Foam",
    "source": "legacy:compiled"
  },
  {
    "key": "foam_12",
    "label": "Foam 12mm",
    "rate": 17.5,
    "unit": "SFT",
    "category": "Foam",
    "source": "legacy:compiled"
  },
  {
    "key": "fabric_mid",
    "label": "Fabric (mid-range)",
    "rate": 513.33,
    "unit": "MTR",
    "category": "Upholstery",
    "source": "legacy:compiled"
  },
  {
    "key": "leatherite",
    "label": "Leatherite / PU leath",
    "rate": 500,
    "unit": "MTR",
    "category": "Upholstery",
    "source": "legacy:compiled"
  },
  {
    "key": "leather_real",
    "label": "Real Leather",
    "rate": 1200,
    "unit": "SFT",
    "category": "Upholstery",
    "source": "legacy:compiled"
  },
  {
    "key": "non_woven",
    "label": "Non-woven lining",
    "rate": 33,
    "unit": "MTR",
    "category": "Upholstery",
    "source": "legacy:compiled"
  },
  {
    "key": "elastic_50",
    "label": "Elastic 50mm",
    "rate": 25,
    "unit": "MTR",
    "category": "Upholstery",
    "source": "legacy:compiled"
  },
  {
    "key": "polyfil",
    "label": "Polyfill",
    "rate": 180,
    "unit": "KG",
    "category": "Upholstery",
    "source": "legacy:compiled"
  },
  {
    "key": "bostic",
    "label": "Bostic adhesive",
    "rate": 195,
    "unit": "KG",
    "category": "Upholstery",
    "source": "legacy:compiled"
  },
  {
    "key": "pu_polish",
    "label": "PU Polish",
    "rate": 50,
    "unit": "SFT",
    "category": "Finish",
    "source": "legacy:compiled"
  },
  {
    "key": "nat_polish",
    "label": "Natural Polish",
    "rate": 50,
    "unit": "SFT",
    "category": "Finish",
    "source": "legacy:compiled"
  },
  {
    "key": "mel_polish",
    "label": "Melamine Polish",
    "rate": 75,
    "unit": "SFT",
    "category": "Finish",
    "source": "legacy:compiled"
  },
  {
    "key": "pu_paint",
    "label": "PU Paint RAL match",
    "rate": 892,
    "unit": "KG",
    "category": "Finish",
    "source": "legacy:compiled"
  },
  {
    "key": "powder_coat",
    "label": "Powder Coat",
    "rate": 250,
    "unit": "KG",
    "category": "Finish",
    "source": "legacy:compiled"
  },
  {
    "key": "fevicol_sft",
    "label": "Fevicol D3 (per SFT)",
    "rate": 6.78,
    "unit": "SFT",
    "category": "Adhesive",
    "source": "legacy:compiled"
  },
  {
    "key": "fevicol_kg",
    "label": "Fevicol D3 (kg)",
    "rate": 155,
    "unit": "KG",
    "category": "Adhesive",
    "source": "legacy:compiled"
  },
  {
    "key": "probond",
    "label": "Fevicol Probond",
    "rate": 315,
    "unit": "KG",
    "category": "Adhesive",
    "source": "legacy:compiled"
  },
  {
    "key": "bond_tite",
    "label": "Bond Tite (structural)",
    "rate": 1150,
    "unit": "SET",
    "category": "Adhesive",
    "source": "legacy:compiled"
  },
  {
    "key": "ss_adhesive",
    "label": "Solid Surface Adhesive",
    "rate": 565,
    "unit": "NOS",
    "category": "Adhesive",
    "source": "legacy:compiled"
  },
  {
    "key": "hinge_soft",
    "label": "Hettich Hinge SC",
    "rate": 220,
    "unit": "SET",
    "category": "Hardware",
    "source": "legacy:compiled"
  },
  {
    "key": "tele_chan",
    "label": "Telescopic Channel",
    "rate": 770,
    "unit": "SET",
    "category": "Hardware",
    "source": "legacy:compiled"
  },
  {
    "key": "handle_rec",
    "label": "Recessed Handle",
    "rate": 350,
    "unit": "PCS",
    "category": "Hardware",
    "source": "legacy:compiled"
  },
  {
    "key": "caster_50",
    "label": "Caster Wheel 50mm",
    "rate": 350,
    "unit": "SET",
    "category": "Hardware",
    "source": "legacy:compiled"
  },
  {
    "key": "screws",
    "label": "Chipboard Screws",
    "rate": 280,
    "unit": "PKT",
    "category": "Hardware",
    "source": "legacy:compiled"
  },
  {
    "key": "ss_surface",
    "label": "Solid Surface (SFT)",
    "rate": 642,
    "unit": "SFT",
    "category": "Solid Surface",
    "source": "legacy:compiled"
  },
  {
    "key": "compact_board",
    "label": "Compact Board 12mm",
    "rate": 509.38,
    "unit": "SFT",
    "category": "Board",
    "source": "legacy:compiled"
  },
  {
    "key": "out_bar_stool",
    "label": "Bar Stool Outsourced",
    "rate": 3900,
    "unit": "NOS",
    "category": "Outsourced",
    "source": "legacy:compiled"
  },
  {
    "key": "lustrell",
    "label": "Lustrell premium fabric",
    "rate": 2099,
    "unit": "MTR",
    "category": "Upholstery",
    "source": "legacy:compiled"
  },
  {
    "key": "ply_8_com",
    "label": "Ply 8mm Commercial",
    "rate": 44,
    "unit": "SFT",
    "category": "Plywood",
    "source": "legacy:compiled"
  },
  {
    "key": "ply_12_bwp",
    "label": "Ply 12mm BWP",
    "rate": 65,
    "unit": "SFT",
    "category": "Plywood",
    "source": "legacy:compiled"
  },
  {
    "key": "ply_16_com",
    "label": "Ply 16mm Commercial",
    "rate": 55,
    "unit": "SFT",
    "category": "Plywood",
    "source": "legacy:compiled"
  },
  {
    "key": "ply_8_bwp",
    "label": "Ply 8mm BWP",
    "rate": 42,
    "unit": "SFT",
    "category": "Plywood",
    "source": "legacy:compiled"
  },
  {
    "key": "hdhmr_18",
    "label": "HDHMR 18mm",
    "rate": 77.5,
    "unit": "SFT",
    "category": "Plywood",
    "source": "legacy:compiled"
  },
  {
    "key": "mdf_3",
    "label": "MDF 3.3mm",
    "rate": 9.01,
    "unit": "SFT",
    "category": "MDF",
    "source": "legacy:compiled"
  },
  {
    "key": "mdf_5",
    "label": "MDF 5.5mm",
    "rate": 14.56,
    "unit": "SFT",
    "category": "MDF",
    "source": "legacy:compiled"
  },
  {
    "key": "mdf_7",
    "label": "MDF 7.5mm",
    "rate": 18.56,
    "unit": "SFT",
    "category": "MDF",
    "source": "legacy:compiled"
  },
  {
    "key": "mdf_8_prelam",
    "label": "MDF 8mm Prelam",
    "rate": 34.71,
    "unit": "SFT",
    "category": "MDF",
    "source": "legacy:compiled"
  },
  {
    "key": "edgeband_thin",
    "label": "Edgeband 30x0.8mm",
    "rate": 16.8,
    "unit": "MTR",
    "category": "Edgeband",
    "source": "legacy:compiled"
  },
  {
    "key": "ss_304_pipe",
    "label": "SS 304 Pipe/Rod",
    "rate": 255,
    "unit": "KG",
    "category": "Metal SS",
    "source": "legacy:compiled"
  },
  {
    "key": "facade_ral",
    "label": "Facade RAL paint",
    "rate": 650,
    "unit": "KG",
    "category": "Finish",
    "source": "legacy:compiled"
  },
  {
    "key": "compact_8",
    "label": "Compact Board 8mm",
    "rate": 35,
    "unit": "SFT",
    "category": "Board",
    "source": "legacy:compiled"
  },
  {
    "key": "veneer",
    "label": "Wood Veneer",
    "rate": 118,
    "unit": "SFT",
    "category": "Wood",
    "source": "legacy:compiled"
  },
  {
    "key": "hdhmr_6",
    "label": "HDHMR 6mm",
    "rate": 25.38,
    "unit": "SFT",
    "category": "Plywood",
    "source": "legacy:compiled"
  },
  {
    "key": "hdhmr_8",
    "label": "HDHMR 8mm",
    "rate": 32.06,
    "unit": "SFT",
    "category": "Plywood",
    "source": "legacy:compiled"
  },
  {
    "key": "hdhmr_12",
    "label": "HDHMR 12mm",
    "rate": 41.5,
    "unit": "SFT",
    "category": "Plywood",
    "source": "legacy:compiled"
  },
  {
    "key": "hdhmr_25",
    "label": "HDHMR 25mm",
    "rate": 98.72,
    "unit": "SFT",
    "category": "Plywood",
    "source": "legacy:compiled"
  },
  {
    "key": "mdf_16",
    "label": "MDF 16-17mm",
    "rate": 40.25,
    "unit": "SFT",
    "category": "MDF",
    "source": "legacy:compiled"
  },
  {
    "key": "laminate_06",
    "label": "Laminate 0.6mm thin",
    "rate": 31.41,
    "unit": "SFT",
    "category": "Laminate",
    "source": "legacy:compiled"
  },
  {
    "key": "laminate_07",
    "label": "Laminate 0.7mm thin",
    "rate": 10.62,
    "unit": "SFT",
    "category": "Laminate",
    "source": "legacy:compiled"
  },
  {
    "key": "drawer_sys",
    "label": "Drawer system (Innotech)",
    "rate": 3146.37,
    "unit": "SET",
    "category": "Hardware",
    "source": "legacy:compiled"
  },
  {
    "key": "lock_mul",
    "label": "Multipurpose lock",
    "rate": 77,
    "unit": "PCS",
    "category": "Hardware",
    "source": "legacy:compiled"
  },
  {
    "key": "minifix",
    "label": "Minifix stud",
    "rate": 6.75,
    "unit": "SET",
    "category": "Hardware",
    "source": "legacy:compiled"
  },
  {
    "key": "connector",
    "label": "Gola connector set",
    "rate": 55,
    "unit": "SET",
    "category": "Hardware",
    "source": "legacy:compiled"
  },
  {
    "key": "gas_spring",
    "label": "Gas spring 75KG",
    "rate": 850,
    "unit": "SET",
    "category": "Hardware",
    "source": "legacy:compiled"
  },
  {
    "key": "handle_profile",
    "label": "Aluminium handle profile",
    "rate": 745,
    "unit": "NOS",
    "category": "Hardware",
    "source": "legacy:compiled"
  },
  {
    "key": "fastack",
    "label": "Fastack adhesive",
    "rate": 150,
    "unit": "KG",
    "category": "Adhesive",
    "source": "legacy:compiled"
  },
  {
    "key": "wood_filler",
    "label": "Wood filler white",
    "rate": 160,
    "unit": "KG",
    "category": "Finish",
    "source": "legacy:compiled"
  },
  {
    "key": "pu_paint_kgs",
    "label": "PU Paint RAL KGS",
    "rate": 892,
    "unit": "KG",
    "category": "Finish",
    "source": "legacy:compiled"
  },
  {
    "key": "primer",
    "label": "White Primer/Sealer",
    "rate": 380,
    "unit": "KG",
    "category": "Finish",
    "source": "legacy:compiled"
  },
  {
    "key": "hardener",
    "label": "PU Hardener",
    "rate": 399,
    "unit": "KG",
    "category": "Finish",
    "source": "legacy:compiled"
  },
  {
    "key": "curtain_fab",
    "label": "Curtain fabric",
    "rate": 385,
    "unit": "MTR",
    "category": "Upholstery",
    "source": "legacy:compiled"
  },
  {
    "key": "non_woven_pad",
    "label": "Non-woven pad",
    "rate": 33,
    "unit": "NOS",
    "category": "Upholstery",
    "source": "legacy:compiled"
  },
  {
    "key": "ms_wire",
    "label": "MS filler wire 1.6mm",
    "rate": 168,
    "unit": "KG",
    "category": "Metal MS",
    "source": "legacy:compiled"
  },
  {
    "key": "ms_erw",
    "label": "ERW Steel tubes",
    "rate": 78.5,
    "unit": "KG",
    "category": "Metal MS",
    "source": "legacy:compiled"
  },
  {
    "key": "bentwood_seat",
    "label": "Bentwood chair seat",
    "rate": 105,
    "unit": "NOS",
    "category": "Outsourced",
    "source": "legacy:compiled"
  },
  {
    "key": "dacron",
    "label": "Dacron wrap",
    "rate": 18,
    "unit": "SFT",
    "category": "Upholstery",
    "source": "legacy:compiled"
  },
  {
    "key": "springs_set",
    "label": "Zigzag springs (sofa)",
    "rate": 1800,
    "unit": "SET",
    "category": "Hardware",
    "source": "legacy:compiled"
  },
  {
    "key": "piping_cord",
    "label": "Piping cord",
    "rate": 25,
    "unit": "MTR",
    "category": "Upholstery",
    "source": "legacy:compiled"
  },
  {
    "key": "upholstery_thread",
    "label": "Thread+staples",
    "rate": 400,
    "unit": "SET",
    "category": "Upholstery",
    "source": "legacy:compiled"
  },
  {
    "key": "wood_oak",
    "label": "Oak Wood frame/legs (CFT)",
    "rate": 1900,
    "unit": "CFT",
    "category": "Wood",
    "source": "legacy:compiled"
  },
  {
    "key": "wood_slab_sft",
    "label": "Solid wood panel/slab (per SFT)",
    "rate": 1100,
    "unit": "SFT",
    "category": "Wood",
    "source": "legacy:compiled"
  }
];

export type LegacyFallbackVar = { slope: number; intercept: number; r2: number; n: number; mean_y?: number; useArea?: boolean };
export const LEGACY_FALLBACK_REG = {
  "CHAIR": {
    "ply_sft": {
      "slope": 1.5,
      "intercept": 0.5,
      "r2": 0.65,
      "n": 25,
      "mean_y": 6,
      "useArea": true
    },
    "foam_sft": {
      "slope": 1.83,
      "intercept": 0.44,
      "r2": 0.85,
      "n": 32,
      "mean_y": 7.3,
      "useArea": true
    },
    "uph_mtr": {
      "slope": 0.55,
      "intercept": 0.3,
      "r2": 0.65,
      "n": 28,
      "mean_y": 2.2,
      "useArea": true
    },
    "uph_sft": {
      "slope": 0.002,
      "intercept": 2,
      "r2": 0.1,
      "n": 9,
      "mean_y": 3.5
    },
    "metal_kg": {
      "slope": 0.0095,
      "intercept": -0.7,
      "r2": 0.377,
      "n": 25,
      "mean_y": 5.5
    },
    "wood_cft": {
      "slope": 0.0016,
      "intercept": 0.5,
      "r2": 0.367,
      "n": 36,
      "mean_y": 1.1
    },
    "polish_sft": {
      "slope": 1.2,
      "intercept": 2,
      "r2": 0.55,
      "n": 30,
      "mean_y": 8.6,
      "useArea": true
    },
    "rattan_sft": {
      "slope": 0.012,
      "intercept": -3.5,
      "r2": 0.6,
      "n": 4,
      "mean_y": 2.5
    },
    "lam_sft": {
      "slope": 0.05,
      "intercept": 10,
      "r2": 0.1,
      "n": 3,
      "mean_y": 40
    },
    "bal_sft": {
      "slope": 0.003,
      "intercept": 3.5,
      "r2": 0.05,
      "n": 5,
      "mean_y": 4.4
    },
    "fevicol_sft": {
      "slope": 0.01,
      "intercept": 4,
      "r2": 0.1,
      "n": 11,
      "mean_y": 10.4
    }
  },
  "STOOL": {
    "foam_sft": {
      "slope": 0.005,
      "intercept": 2,
      "r2": 0.15,
      "n": 12,
      "mean_y": 4
    },
    "uph_sft": {
      "slope": 0,
      "intercept": 0.75,
      "r2": 0,
      "n": 1,
      "mean_y": 0.75
    },
    "uph_mtr": {
      "slope": 0.0001,
      "intercept": 0.9,
      "r2": 0.003,
      "n": 7,
      "mean_y": 0.9
    },
    "metal_kg": {
      "slope": 0.0225,
      "intercept": -4.4,
      "r2": 0.147,
      "n": 15,
      "mean_y": 5.7
    },
    "wood_cft": {
      "slope": 0.0035,
      "intercept": -0.8,
      "r2": 0.296,
      "n": 11,
      "mean_y": 0.6
    },
    "polish_sft": {
      "slope": 0.0184,
      "intercept": -0.3,
      "r2": 0.308,
      "n": 17,
      "mean_y": 8.5
    },
    "ply_sft": {
      "slope": 0.0062,
      "intercept": 2.9,
      "r2": 0.094,
      "n": 9,
      "mean_y": 5
    }
  },
  "TABLE": {
    "ply_sft": {
      "slope": 2.14,
      "intercept": -1,
      "r2": 0.93,
      "n": 50,
      "mean_y": 19.5,
      "useArea": true
    },
    "metal_kg": {
      "slope": 0.0038,
      "intercept": 10.8,
      "r2": 0.054,
      "n": 73,
      "mean_y": 14.8
    },
    "wood_cft": {
      "slope": 0.0002,
      "intercept": 1.4,
      "r2": 0.029,
      "n": 40,
      "mean_y": 1.4
    },
    "lam_sft": {
      "slope": 1.8,
      "intercept": -0.8,
      "r2": 0.91,
      "n": 45,
      "mean_y": 16.5,
      "useArea": true
    },
    "bal_sft": {
      "slope": 1.6,
      "intercept": -0.5,
      "r2": 0.9,
      "n": 44,
      "mean_y": 15.2,
      "useArea": true
    },
    "polish_sft": {
      "slope": 0.0049,
      "intercept": 13.7,
      "r2": 0.054,
      "n": 69,
      "mean_y": 21.5
    },
    "edge_mtr": {
      "slope": 1.2,
      "intercept": 0.5,
      "r2": 0.85,
      "n": 38,
      "mean_y": 9.8,
      "useArea": true
    },
    "fevicol_sft": {
      "slope": 1.5,
      "intercept": 0.5,
      "r2": 0.85,
      "n": 40,
      "mean_y": 14.3,
      "useArea": true
    },
    "foam_sft": {
      "slope": -0.0007,
      "intercept": 9.8,
      "r2": 0.05,
      "n": 3,
      "mean_y": 8.9
    },
    "veneer_sft": {
      "slope": 1.1,
      "intercept": -0.5,
      "r2": 0.88,
      "n": 15,
      "mean_y": 8.5,
      "useArea": true
    }
  },
  "SOFA": {
    "ply_sft": {
      "slope": 3.7,
      "intercept": 5,
      "r2": 0.87,
      "n": 42,
      "mean_y": 59.5,
      "useArea": true
    },
    "foam_sft": {
      "slope": 2,
      "intercept": 1,
      "r2": 0.8,
      "n": 44,
      "mean_y": 49.1,
      "useArea": true
    },
    "uph_mtr": {
      "slope": 0.37,
      "intercept": 0.2,
      "r2": 0.75,
      "n": 32,
      "mean_y": 4.9,
      "useArea": true
    },
    "uph_sft": {
      "slope": 0.02,
      "intercept": 5,
      "r2": 0.1,
      "n": 4,
      "mean_y": 37.8
    },
    "metal_kg": {
      "slope": 0.0125,
      "intercept": -2.9,
      "r2": 0.734,
      "n": 24,
      "mean_y": 15.1
    },
    "wood_cft": {
      "slope": 0.0001,
      "intercept": 1.3,
      "r2": 0.011,
      "n": 17,
      "mean_y": 1.2
    },
    "lam_sft": {
      "slope": 2.3,
      "intercept": 0,
      "r2": 0.85,
      "n": 35,
      "mean_y": 34.3,
      "useArea": true
    },
    "bal_sft": {
      "slope": 1.05,
      "intercept": 0,
      "r2": 0.82,
      "n": 30,
      "mean_y": 15.6,
      "useArea": true
    },
    "polish_sft": {
      "slope": 0.0098,
      "intercept": 0.8,
      "r2": 0.467,
      "n": 28,
      "mean_y": 12.1
    },
    "edge_mtr": {
      "slope": 0.8,
      "intercept": 0.5,
      "r2": 0.75,
      "n": 20,
      "mean_y": 10.4,
      "useArea": true
    },
    "fevicol_sft": {
      "slope": 0.03,
      "intercept": 20,
      "r2": 0.1,
      "n": 15,
      "mean_y": 56.3
    }
  },
  "CHAIR_WOOD": {
    "ply_sft": {
      "slope": 1.5,
      "intercept": 0.5,
      "r2": 0.65,
      "n": 20,
      "mean_y": 6,
      "useArea": true
    },
    "wood_cft": {
      "slope": 0.05,
      "intercept": 0.9,
      "r2": 0.15,
      "n": 20,
      "mean_y": 1.1,
      "useArea": true
    }
  }
} as Record<string, Record<string, LegacyFallbackVar>>;

export const LEGACY_RATIO_NORMS: RatioNorm[] = [
  {
    "productType": "CHAIR",
    "materialKey": "foam_sft",
    "qtyPerSqm": 1.4372,
    "samples": 58,
    "predictor": "uph_area",
    "p10": 0.6167,
    "p90": 4.5545
  },
  {
    "productType": "CHAIR",
    "materialKey": "uph_mtr",
    "qtyPerSqm": 0.2053,
    "samples": 25,
    "predictor": "uph_area",
    "p10": 0.0514,
    "p90": 0.381
  },
  {
    "productType": "CHAIR",
    "materialKey": "ply_sft",
    "qtyPerSqm": 1.683,
    "samples": 47,
    "predictor": "area",
    "p10": 1.0071,
    "p90": 8.9425
  },
  {
    "productType": "CHAIR",
    "materialKey": "lam_sft",
    "qtyPerSqm": 2.8351,
    "samples": 11,
    "predictor": "area",
    "p10": 1.683,
    "p90": 6.1935
  },
  {
    "productType": "CHAIR",
    "materialKey": "bal_sft",
    "qtyPerSqm": 1.3763,
    "samples": 7,
    "predictor": "area",
    "p10": 0.4129,
    "p90": 1.683
  },
  {
    "productType": "CHAIR",
    "materialKey": "wood_cft",
    "qtyPerSqm": 0.25,
    "samples": 56,
    "predictor": "area",
    "p10": 0.1,
    "p90": 0.45
  },
  {
    "productType": "CHAIR",
    "materialKey": "polish_sft",
    "qtyPerSqm": 2,
    "samples": 73,
    "predictor": "area",
    "p10": 1.4,
    "p90": 3.5
  },
  {
    "productType": "CHAIR",
    "materialKey": "edge_mtr",
    "qtyPerSqm": 1.9355,
    "samples": 3,
    "predictor": "area",
    "p10": 1.1613,
    "p90": 6.5684
  },
  {
    "productType": "TABLE",
    "materialKey": "foam_sft",
    "qtyPerSqm": 1.1406,
    "samples": 6,
    "predictor": "uph_area",
    "p10": 0.8294,
    "p90": 1.6516
  },
  {
    "productType": "TABLE",
    "materialKey": "uph_mtr",
    "qtyPerSqm": 0.1596,
    "samples": 6,
    "predictor": "uph_area",
    "p10": 0.0826,
    "p90": 0.3287
  },
  {
    "productType": "TABLE",
    "materialKey": "ply_sft",
    "qtyPerSqm": 1.4415,
    "samples": 138,
    "predictor": "area",
    "p10": 1.0323,
    "p90": 2.7527
  },
  {
    "productType": "TABLE",
    "materialKey": "lam_sft",
    "qtyPerSqm": 1.1911,
    "samples": 90,
    "predictor": "area",
    "p10": 1.0323,
    "p90": 2.7527
  },
  {
    "productType": "TABLE",
    "materialKey": "bal_sft",
    "qtyPerSqm": 1.1892,
    "samples": 107,
    "predictor": "area",
    "p10": 1.0323,
    "p90": 1.8925
  },
  {
    "productType": "TABLE",
    "materialKey": "wood_cft",
    "qtyPerSqm": 0.1321,
    "samples": 25,
    "predictor": "area",
    "p10": 0.0218,
    "p90": 0.3011
  },
  {
    "productType": "TABLE",
    "materialKey": "polish_sft",
    "qtyPerSqm": 2.2194,
    "samples": 52,
    "predictor": "area",
    "p10": 0.6423,
    "p90": 4.9548
  },
  {
    "productType": "TABLE",
    "materialKey": "edge_mtr",
    "qtyPerSqm": 0.5301,
    "samples": 102,
    "predictor": "area",
    "p10": 0.3823,
    "p90": 0.8602
  },
  {
    "productType": "SOFA",
    "materialKey": "foam_sft",
    "qtyPerSqm": 3.2693,
    "samples": 49,
    "predictor": "uph_area",
    "p10": 0.9036,
    "p90": 6.6535
  },
  {
    "productType": "SOFA",
    "materialKey": "uph_mtr",
    "qtyPerSqm": 0.2412,
    "samples": 27,
    "predictor": "uph_area",
    "p10": 0.1224,
    "p90": 0.5545
  },
  {
    "productType": "SOFA",
    "materialKey": "ply_sft",
    "qtyPerSqm": 7.5958,
    "samples": 49,
    "predictor": "area",
    "p10": 2.9634,
    "p90": 13.2571
  },
  {
    "productType": "SOFA",
    "materialKey": "lam_sft",
    "qtyPerSqm": 3.8114,
    "samples": 24,
    "predictor": "area",
    "p10": 1.3582,
    "p90": 7.0116
  },
  {
    "productType": "SOFA",
    "materialKey": "bal_sft",
    "qtyPerSqm": 1.5173,
    "samples": 20,
    "predictor": "area",
    "p10": 1.0002,
    "p90": 4.3085
  },
  {
    "productType": "SOFA",
    "materialKey": "wood_cft",
    "qtyPerSqm": 0.1112,
    "samples": 20,
    "predictor": "area",
    "p10": 0.0442,
    "p90": 0.2992
  },
  {
    "productType": "SOFA",
    "materialKey": "polish_sft",
    "qtyPerSqm": 1.6087,
    "samples": 19,
    "predictor": "area",
    "p10": 0.3097,
    "p90": 3.1967
  },
  {
    "productType": "SOFA",
    "materialKey": "edge_mtr",
    "qtyPerSqm": 1.0962,
    "samples": 19,
    "predictor": "area",
    "p10": 0.7992,
    "p90": 1.7952
  },
  {
    "productType": "TABLE",
    "materialKey": "wood_slab_sft",
    "qtyPerSqm": 1.05,
    "samples": 5,
    "predictor": "area",
    "p10": 1,
    "p90": 1.15
  },
  {
    "productType": "SOFA",
    "materialKey": "ply_sft_sm",
    "qtyPerSqm": 4.5,
    "samples": 15,
    "predictor": "area",
    "p10": 3,
    "p90": 6
  },
  {
    "productType": "SOFA",
    "materialKey": "ply_sft_lg",
    "qtyPerSqm": 8.5,
    "samples": 34,
    "predictor": "area",
    "p10": 5,
    "p90": 12
  },
  {
    "productType": "TABLE",
    "materialKey": "metal_kg",
    "qtyPerSqm": 1.1561,
    "samples": 97,
    "predictor": "area",
    "p10": 0.33032192,
    "p90": 3.4683801599999997
  },
  {
    "productType": "STOOL",
    "materialKey": "foam_sft",
    "qtyPerSqm": 2.1605,
    "samples": 12,
    "predictor": "uph_area",
    "p10": 0.5898605714285715,
    "p90": 7.7419199999999995
  }
] as RatioNorm[];
